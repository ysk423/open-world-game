import { Server, type Connection, type ConnectionContext } from "partyserver";
import type { ClientMessage, PlayerState, ServerMessage } from "./types";
import { DEFAULT_CHUNK_ID, MAX_PLAYERS } from "./types";

const SPAWN_X = 312;
const SPAWN_Y = 168;

function send(connection: Connection, message: ServerMessage): void {
  connection.send(JSON.stringify(message));
}

export class Room extends Server {
  players = new Map<string, PlayerState>();

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

    if (message.type === "move") {
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
    });

    this.broadcast(
      JSON.stringify({ type: "player-joined", player } satisfies ServerMessage),
      [connection.id],
    );
  }
}
