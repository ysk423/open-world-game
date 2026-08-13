import Phaser from "phaser";

export type Direction = "up" | "down" | "left" | "right";

export type MoveState = {
  x: number;
  y: number;
  moving: boolean;
  direction: Direction;
};

export type ActionPoint = {
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
};

type ActionHandler = (point: ActionPoint) => void;
type ShiftActionHandler = () => void;

/**
 * キーボード/マウス/(将来の)タッチ入力をゲームロジックから隠蔽する層。
 * 呼び出し側は「移動方向」「アクション実行」という抽象的な情報だけを受け取る。
 */
export class InputManager {
  private scene: Phaser.Scene;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private shiftKey: Phaser.Input.Keyboard.Key;
  private lastDirection: Direction = "down";
  private actionHandlers: ActionHandler[] = [];
  private shiftActionHandlers: ShiftActionHandler[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error("キーボード入力が利用できません");
    }

    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys("W,A,S,D") as Record<
      "W" | "A" | "S" | "D",
      Phaser.Input.Keyboard.Key
    >;
    this.shiftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.shiftKey.on("down", this.handleShiftDown, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const point: ActionPoint = {
      screenX: pointer.x,
      screenY: pointer.y,
      worldX: world.x,
      worldY: world.y,
    };
    for (const handler of this.actionHandlers) {
      handler(point);
    }
  }

  private handleShiftDown(): void {
    for (const handler of this.shiftActionHandlers) {
      handler();
    }
  }

  /** マウス/トラックパッドのクリック(将来的にはタップ)でアクションが実行されたときに呼ばれる */
  onAction(handler: ActionHandler): void {
    this.actionHandlers.push(handler);
  }

  /** シフトキーが押された時に呼ばれる(向いている方向へアクションを行う想定) */
  onShiftAction(handler: ShiftActionHandler): void {
    this.shiftActionHandlers.push(handler);
  }

  /** 毎フレーム呼び出し、現在の移動状態を返す */
  getMoveState(): MoveState {
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    let x = 0;
    let y = 0;
    if (left) x -= 1;
    if (right) x += 1;
    if (up) y -= 1;
    if (down) y += 1;

    const moving = x !== 0 || y !== 0;

    // 直近の入力から向きを決める(斜め移動時は上下方向を優先)
    let direction = this.lastDirection;
    if (y < 0) direction = "up";
    else if (y > 0) direction = "down";
    else if (x < 0) direction = "left";
    else if (x > 0) direction = "right";

    if (moving) {
      this.lastDirection = direction;
    }

    return { x, y, moving, direction };
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.shiftKey.off("down", this.handleShiftDown, this);
    this.actionHandlers = [];
    this.shiftActionHandlers = [];
  }
}
