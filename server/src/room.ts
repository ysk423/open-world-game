import { Server, type Connection, type ConnectionContext } from "partyserver";
import type { ClientMessage, PlacedBuilding, PlayerState, ServerMessage } from "./types";
import { DEFAULT_CHUNK_ID, MAX_PLAYERS } from "./types";

const SPAWN_X = 312;
const SPAWN_Y = 168;

function send(connection: Connection, message: ServerMessage): void {
  connection.send(JSON.stringify(message));
}

const BUILDINGS_KEY = "buildings";
const UNLOCKED_CHUNKS_KEY = "unlockedChunks";

export class Room extends Server {
  players = new Map<string, PlayerState>();
  buildings: PlacedBuilding[] = [];
  unlockedChunks = new Set<string>([DEFAULT_CHUNK_ID]);

  async onStart(): Promise<void> {
    const [storedBuildings, storedChunks] = await Promise.all([
      this.ctx.storage.get<PlacedBuilding[]>(BUILDINGS_KEY),
      this.ctx.storage.get<string[]>(UNLOCKED_CHUNKS_KEY),
    ]);
    if (storedBuildings) this.buildings = storedBuildings;
    if (storedChunks) this.unlockedChunks = new Set([DEFAULT_CHUNK_ID, ...storedChunks]);
  }

  onConnect(connection: Connection, _context: ConnectionContext): void {
    // 参加はクライアントからの "join" メッセージを待って確定する(名前が必要なため)
    void connection;
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
    } else if (message.type === "craft-unlock") {
      this.handleCraftUnlock(connection, message.chunkId);
    } else if (message.type === "reset") {
      this.handleReset();
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
      chunkId: DEFAULT_CHUNK_ID,
    };
    this.players.set(connection.id, player);

    send(connection, {
      type: "init",
      selfId: connection.id,
      players: Array.from(this.players.values()),
      buildings: this.buildings,
      unlockedChunks: Array.from(this.unlockedChunks),
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
    player.chunkId = message.chunkId;

    const payload: ServerMessage = {
      type: "player-moved",
      id: connection.id,
      x: player.x,
      y: player.y,
      direction: player.direction,
      animState: player.animState,
      chunkId: player.chunkId,
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
      chunkId: message.chunkId,
    };
    this.buildings.push(building);
    void this.ctx.storage.put(BUILDINGS_KEY, this.buildings);
    // 送信者はクラフト時に自分のクライアントで既に建物を配置済みなので、他プレイヤーにのみ知らせる
    this.broadcast(
      JSON.stringify({ type: "building-placed", building } satisfies ServerMessage),
      [connection.id],
    );
  }

  private handleCraftUnlock(connection: Connection, chunkId: string): void {
    if (this.unlockedChunks.has(chunkId)) return;
    this.unlockedChunks.add(chunkId);
    void this.ctx.storage.put(UNLOCKED_CHUNKS_KEY, Array.from(this.unlockedChunks));
    this.broadcast(
      JSON.stringify({ type: "chunk-unlocked", chunkId } satisfies ServerMessage),
      [connection.id],
    );
  }

  private handleReset(): void {
    this.buildings = [];
    this.unlockedChunks = new Set([DEFAULT_CHUNK_ID]);
    void this.ctx.storage.delete([BUILDINGS_KEY, UNLOCKED_CHUNKS_KEY]);
    // 送信者も含め全員へ通知(建物配置と違い、送信者側でも楽観更新していないため)
    this.broadcast(JSON.stringify({ type: "base-reset" } satisfies ServerMessage));
  }
}
