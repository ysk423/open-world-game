export type Direction = "up" | "down" | "left" | "right";
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
  | { type: "remove-building"; id: string };

export type ServerMessage =
  | {
      type: "init";
      selfId: string;
      players: PlayerState[];
      buildings: PlacedBuilding[];
      worldSeed: number;
      roomStartedAt: number;
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
  | { type: "building-removed"; id: string }
  | { type: "game-reset" };

export const MAX_PLAYERS = 4;
