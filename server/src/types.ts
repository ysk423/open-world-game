export type Direction = "up" | "down" | "left" | "right";
export type AnimState = "idle" | "walk" | "attack";

export type PlayerState = {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: Direction;
  animState: AnimState;
  chunkId: string;
};

export type PlacedBuilding = {
  id: string;
  buildingType: string;
  x: number;
  y: number;
  chunkId: string;
};

export type ClientMessage =
  | { type: "join"; name: string }
  | {
      type: "move";
      x: number;
      y: number;
      direction: Direction;
      animState: AnimState;
      chunkId: string;
    }
  | { type: "craft-building"; buildingType: string; x: number; y: number; chunkId: string }
  | { type: "craft-unlock"; chunkId: string };

export type ServerMessage =
  | {
      type: "init";
      selfId: string;
      players: PlayerState[];
      buildings: PlacedBuilding[];
      unlockedChunks: string[];
    }
  | { type: "player-joined"; player: PlayerState }
  | {
      type: "player-moved";
      id: string;
      x: number;
      y: number;
      direction: Direction;
      animState: AnimState;
      chunkId: string;
    }
  | { type: "player-left"; id: string }
  | { type: "room-full" }
  | { type: "building-placed"; building: PlacedBuilding }
  | { type: "chunk-unlocked"; chunkId: string };

export const MAX_PLAYERS = 4;
export const DEFAULT_CHUNK_ID = "chunk-home";
