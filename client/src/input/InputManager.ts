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
  private sprintKey: Phaser.Input.Keyboard.Key;
  private teleportKey: Phaser.Input.Keyboard.Key;
  private skillKey: Phaser.Input.Keyboard.Key;
  private healKey: Phaser.Input.Keyboard.Key;
  private blockKey: Phaser.Input.Keyboard.Key;
  private lastDirection: Direction = "down";
  private actionHandlers: ActionHandler[] = [];
  private enderPearlActionHandlers: ActionHandler[] = [];
  private shiftActionHandlers: ShiftActionHandler[] = [];
  private teleportActionHandlers: ShiftActionHandler[] = [];
  private skillActionHandlers: ShiftActionHandler[] = [];
  private healActionHandlers: ShiftActionHandler[] = [];
  // 仮想十字キー(タッチ操作)からの入力。-1〜1の範囲でキーボードと同じ形式にしてある
  private touchX = 0;
  private touchY = 0;
  // タッチのダッシュボタンが押されているか(キーボードのスペースキーと合わせて判定する)
  private touchSprint = false;

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
    this.sprintKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.teleportKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.skillKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.healKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.blockKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);

    // マインクラフトのエンダーパールを参考に、右クリックでの瞬間移動を使えるようにする
    // (ブラウザ標準の右クリックメニューが出ないようにする)
    scene.input.mouse?.disableContextMenu();

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.shiftKey.on("down", this.handleShiftDown, this);
    this.teleportKey.on("down", this.handleTeleportDown, this);
    this.skillKey.on("down", this.handleSkillDown, this);
    this.healKey.on("down", this.handleHealDown, this);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    const world = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const point: ActionPoint = {
      screenX: pointer.x,
      screenY: pointer.y,
      worldX: world.x,
      worldY: world.y,
    };
    if (pointer.rightButtonDown()) {
      for (const handler of this.enderPearlActionHandlers) {
        handler(point);
      }
      return;
    }
    for (const handler of this.actionHandlers) {
      handler(point);
    }
  }

  private handleShiftDown(): void {
    for (const handler of this.shiftActionHandlers) {
      handler();
    }
  }

  private handleTeleportDown(): void {
    for (const handler of this.teleportActionHandlers) {
      handler();
    }
  }

  private handleSkillDown(): void {
    for (const handler of this.skillActionHandlers) {
      handler();
    }
  }

  private handleHealDown(): void {
    for (const handler of this.healActionHandlers) {
      handler();
    }
  }

  /** マウス/トラックパッドのクリック(将来的にはタップ)でアクションが実行されたときに呼ばれる */
  onAction(handler: ActionHandler): void {
    this.actionHandlers.push(handler);
  }

  /** マインクラフトのエンダーパールを参考にした右クリックが行われた時に呼ばれる(瞬間移動を想定) */
  onEnderPearlAction(handler: ActionHandler): void {
    this.enderPearlActionHandlers.push(handler);
  }

  /** シフトキーが押された時に呼ばれる(向いている方向へアクションを行う想定) */
  onShiftAction(handler: ShiftActionHandler): void {
    this.shiftActionHandlers.push(handler);
  }

  /** ドラクエの「ルーラ」を参考にしたTキーが押された時に呼ばれる(拠点への瞬間移動を想定) */
  onTeleportAction(handler: ShiftActionHandler): void {
    this.teleportActionHandlers.push(handler);
  }

  /** ドラクエの「とくぎ」を参考にしたFキーが押された時に呼ばれる(強力な一撃を想定) */
  onSkillAction(handler: ShiftActionHandler): void {
    this.skillActionHandlers.push(handler);
  }

  /** ドラクエの「ホイミ」を参考にしたHキーが押された時に呼ばれる(HP回復呪文を想定) */
  onHealAction(handler: ShiftActionHandler): void {
    this.healActionHandlers.push(handler);
  }

  /** 仮想十字キー(TouchDPad)からの入力を反映する。x/yはそれぞれ-1〜1 */
  setTouchMove(x: number, y: number): void {
    this.touchX = x;
    this.touchY = y;
  }

  /** タッチのダッシュボタンの押下状態を反映する */
  setTouchSprint(active: boolean): void {
    this.touchSprint = active;
  }

  /** ダッシュが要求されているか(スペースキー、またはタッチのダッシュボタン) */
  isSprintRequested(): boolean {
    return this.sprintKey.isDown || this.touchSprint;
  }

  /** マインクラフトの盾を参考に、Bキーが押されている間だけ防御が要求される */
  isBlockRequested(): boolean {
    return this.blockKey.isDown;
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

    // キーボード入力がなければ、仮想十字キーの入力を使う
    if (x === 0) x = this.touchX;
    if (y === 0) y = this.touchY;

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
    this.teleportKey.off("down", this.handleTeleportDown, this);
    this.skillKey.off("down", this.handleSkillDown, this);
    this.healKey.off("down", this.handleHealDown, this);
    this.actionHandlers = [];
    this.enderPearlActionHandlers = [];
    this.shiftActionHandlers = [];
    this.teleportActionHandlers = [];
    this.skillActionHandlers = [];
    this.healActionHandlers = [];
  }
}
