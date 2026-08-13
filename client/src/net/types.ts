import type { Direction } from "../input/InputManager";

export type AnimState = "idle" | "walk" | "attack";

export type PlayerState = {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: Direction;
  animState: AnimState;
};

export type PlacedBuilding = {
  id: string;
  buildingType: string;
  x: number;
  y: number;
};

export type ClientMessage =
  | { type: "join"; name: string }
  | {
      type: "move";
      x: number;
      y: number;
      direction: Direction;
      animState: AnimState;
    }
  | { type: "craft-building"; buildingType: string; x: number; y: number }
  | { type: "save-game"; slot: number }
  | { type: "load-game"; slot: number }
  | { type: "delete-game"; slot: number }
  | { type: "export-game"; slot: number }
  | { type: "import-game"; slot: number; buildings: PlacedBuilding[] };

export type ServerMessage =
  | {
      type: "init";
      selfId: string;
      players: PlayerState[];
      buildings: PlacedBuilding[];
      worldSeed: number;
    }
  | { type: "player-joined"; player: PlayerState }
  | {
      type: "player-moved";
      id: string;
      x: number;
      y: number;
      direction: Direction;
      animState: AnimState;
    }
  | { type: "player-left"; id: string }
  | { type: "room-full" }
  | { type: "building-placed"; building: PlacedBuilding }
  | { type: "game-reset" }
  | { type: "game-loaded"; slot: number; buildings: PlacedBuilding[] }
  | { type: "load-failed"; slot: number }
  | { type: "export-data"; slot: number; buildings: PlacedBuilding[] }
  | { type: "export-failed"; slot: number };

export const SAVE_SLOT_COUNT = 3;
