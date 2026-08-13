import { Server, type Connection, type ConnectionContext } from "partyserver";
import type { ClientMessage, PlacedBuilding, PlayerState, ServerMessage } from "./types";
import { MAX_PLAYERS, SAVE_SLOT_COUNT } from "./types";

// クライアント側GameSceneのSPAWN_TILE(38,80)・TILE_SIZE(32)と対応するワールド座標
const SPAWN_X = 1232;
const SPAWN_Y = 2576;

function send(connection: Connection, message: ServerMessage): void {
  connection.send(JSON.stringify(message));
}

const BUILDINGS_KEY = "buildings";

function saveSlotKey(slot: number): string {
  return `save-slot-${slot}-buildings`;
}

function isValidSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 1 && slot <= SAVE_SLOT_COUNT;
}

const MAX_IMPORTED_BUILDINGS = 5000;

/** インポートされた建物データ(クライアントから届く未検証のJSON)の形を検証する */
function isValidBuildingList(value: unknown): value is PlacedBuilding[] {
  if (!Array.isArray(value) || value.length > MAX_IMPORTED_BUILDINGS) return false;
  return value.every(
    (b) =>
      typeof b === "object" &&
      b !== null &&
      typeof (b as PlacedBuilding).id === "string" &&
      typeof (b as PlacedBuilding).buildingType === "string" &&
      Number.isFinite((b as PlacedBuilding).x) &&
      Number.isFinite((b as PlacedBuilding).y),
  );
}

export class Room extends Server {
  players = new Map<string, PlayerState>();
  buildings: PlacedBuilding[] = [];

  async onStart(): Promise<void> {
    const storedBuildings = await this.ctx.storage.get<PlacedBuilding[]>(BUILDINGS_KEY);
    if (storedBuildings) this.buildings = storedBuildings;
  }

  onConnect(connection: Connection, _context: ConnectionContext): void {
    // 参加はクライアントからの "join" メッセージを待って確定する(名前が必要なため)
    void connection;
  }

  /** タイトル画面の「ゲームをリセット」ボタンからのプレーンなHTTP POSTを受け取る(WebSocket接続を持たないため) */
  onRequest(request: Request): Response {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    this.handleReset();
    return new Response(null, { status: 204 });
  }

  onMessage(connection: Connection, raw: string): void {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw) as ClientMessage;
    } catch {
      return;
    }

    if (message.type === "join") {
      this.handleJoin(connection, message.name);
      return;
    }

    if (!this.players.has(connection.id)) return;

    if (message.type === "move") {
      this.handleMove(connection, message);
    } else if (message.type === "craft-building") {
      this.handleCraftBuilding(connection, message);
    } else if (message.type === "save-game") {
      this.handleSaveGame(message.slot);
    } else if (message.type === "load-game") {
      this.handleLoadGame(connection, message.slot);
    } else if (message.type === "delete-game") {
      this.handleDeleteGame(message.slot);
    } else if (message.type === "export-game") {
      void this.handleExportGame(connection, message.slot);
    } else if (message.type === "import-game") {
      this.handleImportGame(message.slot, message.buildings);
    }
  }

  onClose(connection: Connection): void {
    if (!this.players.has(connection.id)) return;
    this.players.delete(connection.id);
    const payload: ServerMessage = { type: "player-left", id: connection.id };
    this.broadcast(JSON.stringify(payload));
  }

  private handleJoin(connection: Connection, rawName: string): void {
    if (this.players.has(connection.id)) return;

    if (this.players.size >= MAX_PLAYERS) {
      send(connection, { type: "room-full" });
      connection.close();
      return;
    }

    const name = rawName.trim().slice(0, 16) || `プレイヤー${this.players.size + 1}`;
    const player: PlayerState = {
      id: connection.id,
      name,
      x: SPAWN_X,
      y: SPAWN_Y,
      direction: "down",
      animState: "idle",
    };
    this.players.set(connection.id, player);

    send(connection, {
      type: "init",
      selfId: connection.id,
      players: Array.from(this.players.values()),
      buildings: this.buildings,
    });

    this.broadcast(
      JSON.stringify({ type: "player-joined", player } satisfies ServerMessage),
      [connection.id],
    );
  }

  private handleMove(
    connection: Connection,
    message: Extract<ClientMessage, { type: "move" }>,
  ): void {
    const player = this.players.get(connection.id);
    if (!player) return;
    player.x = message.x;
    player.y = message.y;
    player.direction = message.direction;
    player.animState = message.animState;

    const payload: ServerMessage = {
      type: "player-moved",
      id: connection.id,
      x: player.x,
      y: player.y,
      direction: player.direction,
      animState: player.animState,
    };
    this.broadcast(JSON.stringify(payload), [connection.id]);
  }

  private handleCraftBuilding(
    connection: Connection,
    message: Extract<ClientMessage, { type: "craft-building" }>,
  ): void {
    const building: PlacedBuilding = {
      id: crypto.randomUUID(),
      buildingType: message.buildingType,
      x: message.x,
      y: message.y,
    };
    this.buildings.push(building);
    void this.ctx.storage.put(BUILDINGS_KEY, this.buildings);
    // 送信者はクラフト時に自分のクライアントで既に建物を配置済みなので、他プレイヤーにのみ知らせる
    this.broadcast(
      JSON.stringify({ type: "building-placed", building } satisfies ServerMessage),
      [connection.id],
    );
  }

  private handleSaveGame(slot: number): void {
    if (!isValidSlot(slot)) return;
    void this.ctx.storage.put(saveSlotKey(slot), this.buildings);
  }

  private async handleLoadGame(connection: Connection, slot: number): Promise<void> {
    if (!isValidSlot(slot)) return;
    const savedBuildings = await this.ctx.storage.get<PlacedBuilding[]>(saveSlotKey(slot));
    if (!savedBuildings) {
      send(connection, { type: "load-failed", slot });
      return;
    }
    this.applyBuildings(slot, savedBuildings);
  }

  private handleDeleteGame(slot: number): void {
    if (!isValidSlot(slot)) return;
    void this.ctx.storage.delete(saveSlotKey(slot));
  }

  private async handleExportGame(connection: Connection, slot: number): Promise<void> {
    if (!isValidSlot(slot)) return;
    const savedBuildings = await this.ctx.storage.get<PlacedBuilding[]>(saveSlotKey(slot));
    if (!savedBuildings) {
      send(connection, { type: "export-failed", slot });
      return;
    }
    send(connection, { type: "export-data", slot, buildings: savedBuildings });
  }

  private handleImportGame(slot: number, buildings: PlacedBuilding[]): void {
    if (!isValidSlot(slot) || !isValidBuildingList(buildings)) return;
    void this.ctx.storage.put(saveSlotKey(slot), buildings);
    this.applyBuildings(slot, buildings);
  }

  /** 拠点の建物をライブのワールドへ即座に反映し、全員へ通知する(ロード/インポート共通) */
  private applyBuildings(slot: number, buildings: PlacedBuilding[]): void {
    this.buildings = buildings;
    void this.ctx.storage.put(BUILDINGS_KEY, this.buildings);
    this.broadcast(
      JSON.stringify({ type: "game-loaded", slot, buildings: this.buildings } satisfies ServerMessage),
    );
  }

  private handleReset(): void {
    this.buildings = [];
    void this.ctx.storage.delete(BUILDINGS_KEY);
    // 持ち物やHPなどのローカル状態はクライアント側でリセットするため、接続中の全員に通知する
    this.broadcast(JSON.stringify({ type: "game-reset" } satisfies ServerMessage));

    // ゲームリセットは拠点をまっさらに戻す操作なので、その場にいた人の一覧も含めてリセットする。
    // partysocketは自動再接続するため、接続中だった人は少し待てば自動的に入り直す(join)。
    for (const connection of this.getConnections()) {
      connection.close();
    }
    this.players.clear();
  }
}
