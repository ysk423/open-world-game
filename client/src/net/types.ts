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

export type ClientMessage =
  | { type: "join"; name: string }
  | {
      type: "move";
      x: number;
      y: number;
      direction: Direction;
      animState: AnimState;
    };

export type ServerMessage =
  | { type: "init"; selfId: string; players: PlayerState[] }
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
  | { type: "room-full" };
