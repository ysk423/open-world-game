import { Server, type Connection, type ConnectionContext } from "partyserver";
import type { ClientMessage, PlacedBuilding, PlayerState, ServerMessage } from "./types";
import { MAX_PLAYERS } from "./types";

// クライアント側GameSceneのSPAWN_TILE(38,80)・TILE_SIZE(32)と対応するワールド座標
const SPAWN_X = 1232;
const SPAWN_Y = 2576;

function send(connection: Connection, message: ServerMessage): void {
  connection.send(JSON.stringify(message));
}

const BUILDINGS_KEY = "buildings";
const WORLD_SEED_KEY = "world-seed";
const ROOM_STARTED_AT_KEY = "room-started-at";

function createWorldSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

export class Room extends Server {
  players = new Map<string, PlayerState>();
  buildings: PlacedBuilding[] = [];
  worldSeed = 0;
  /** 生存タイマーの起点(このルームに最初のプレイヤーが入室した時刻)。誰もいない間は0 */
  roomStartedAt = 0;

  async onStart(): Promise<void> {
    const storedBuildings = await this.ctx.storage.get<PlacedBuilding[]>(BUILDINGS_KEY);
    if (storedBuildings) this.buildings = storedBuildings;

    const storedSeed = await this.ctx.storage.get<number>(WORLD_SEED_KEY);
    if (storedSeed !== undefined) {
      this.worldSeed = storedSeed;
    } else {
      this.worldSeed = createWorldSeed();
      void this.ctx.storage.put(WORLD_SEED_KEY, this.worldSeed);
    }

    const storedRoomStartedAt = await this.ctx.storage.get<number>(ROOM_STARTED_AT_KEY);
    if (storedRoomStartedAt !== undefined) this.roomStartedAt = storedRoomStartedAt;
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

    // 生存タイマーは「このルームに最初に入った人」の入室時刻を全員で共有する
    if (this.players.size === 0) {
      this.roomStartedAt = Date.now();
      void this.ctx.storage.put(ROOM_STARTED_AT_KEY, this.roomStartedAt);
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
      worldSeed: this.worldSeed,
      roomStartedAt: this.roomStartedAt,
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

  private handleReset(): void {
    this.buildings = [];
    void this.ctx.storage.delete(BUILDINGS_KEY);
    // ルームごとの采集/モンスター/動物/岩の配置をやり直すため、シードも新しく発行する
    this.worldSeed = createWorldSeed();
    void this.ctx.storage.put(WORLD_SEED_KEY, this.worldSeed);
    // 生存タイマーも仕切り直す。次に再接続してきた人が新しい「最初の人」になる
    this.roomStartedAt = 0;
    void this.ctx.storage.delete(ROOM_STARTED_AT_KEY);
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
