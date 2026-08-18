import PartySocket from "partysocket";
import type { Direction } from "../input/InputManager";
import type { AnimState, ClientMessage, PlacedBuilding, PlayerState, ServerMessage } from "./types";

const DEFAULT_HOST = "localhost:8787";

function resolveServerHost(): string {
  const fromEnv = (import.meta.env.VITE_ROOM_SERVER_HOST as string | undefined)?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_HOST;
}

function resolveHttpOrigin(host: string): string {
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return `${isLocal ? "http" : "https"}://${host}`;
}

/** タイトル画面から、参加(WebSocket接続)せずに拠点をリセットするためのプレーンなHTTP POST */
export async function requestGameReset(roomId: string): Promise<void> {
  const response = await fetch(`${resolveHttpOrigin(resolveServerHost())}/parties/room/${roomId}`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`リセットに失敗しました (status: ${response.status})`);
  }
}

export type RoomClientEvents = {
  onInit: (
    selfId: string,
    players: PlayerState[],
    buildings: PlacedBuilding[],
    worldSeed: number,
    roomStartedAt: number,
  ) => void;
  onPlayerJoined: (player: PlayerState) => void;
  onPlayerMoved: (id: string, x: number, y: number, direction: Direction, animState: AnimState) => void;
  onPlayerLeft: (id: string) => void;
  onRoomFull: () => void;
  onBuildingPlaced: (building: PlacedBuilding) => void;
  onGameReset: () => void;
};

/** 拠点ルームとのWebSocket通信をゲームロジックから隠蔽する層(partysocket/partyserverのラッパー) */
export class RoomClient {
  private socket: PartySocket;

  constructor(roomId: string, name: string, events: RoomClientEvents) {
    this.socket = new PartySocket({
      host: resolveServerHost(),
      party: "room",
      room: roomId,
    });

    this.socket.addEventListener("open", () => {
      this.sendRaw({ type: "join", name });
    });

    this.socket.addEventListener("message", (event: MessageEvent) => {
      const message = JSON.parse(event.data as string) as ServerMessage;
      switch (message.type) {
        case "init":
          events.onInit(message.selfId, message.players, message.buildings, message.worldSeed, message.roomStartedAt);
          break;
        case "player-joined":
          events.onPlayerJoined(message.player);
          break;
        case "player-moved":
          events.onPlayerMoved(message.id, message.x, message.y, message.direction, message.animState);
          break;
        case "player-left":
          events.onPlayerLeft(message.id);
          break;
        case "room-full":
          events.onRoomFull();
          break;
        case "building-placed":
          events.onBuildingPlaced(message.building);
          break;
        case "game-reset":
          events.onGameReset();
          break;
      }
    });
  }

  sendMove(x: number, y: number, direction: Direction, animState: AnimState): void {
    this.sendRaw({ type: "move", x, y, direction, animState });
  }

  sendCraftBuilding(buildingType: string, x: number, y: number): void {
    this.sendRaw({ type: "craft-building", buildingType, x, y });
  }

  private sendRaw(message: ClientMessage): void {
    this.socket.send(JSON.stringify(message));
  }

  disconnect(): void {
    this.socket.close();
  }
}
