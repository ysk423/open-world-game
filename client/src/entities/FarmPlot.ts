import Phaser from "phaser";

type FarmStage = "empty" | "growing" | "ready";

const FRAME_BY_STAGE: Record<FarmStage, number> = {
  empty: 0,
  growing: 1,
  ready: 2,
};

const GROW_DURATION_MS = 20000;

/**
 * 畑。種をまくと一定時間後に実り、収穫できる。個人の見え方はサーバーと同期しない
 * (畑自体の設置場所はほかの建物と同様に共有されるが、育成状態はクライアントローカル)。
 */
export class FarmPlot {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly worldX: number;
  readonly worldY: number;
  private stage: FarmStage = "empty";
  private growTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.worldX = x;
    this.worldY = y;
    this.sprite = scene.add.sprite(x, y, "farm", FRAME_BY_STAGE.empty);
    this.sprite.setDepth(4);
  }

  get isEmpty(): boolean {
    return this.stage === "empty";
  }

  get isReady(): boolean {
    return this.stage === "ready";
  }

  /** 種をまく。空の畑でなければ何もしない */
  plant(scene: Phaser.Scene): void {
    if (this.stage !== "empty") return;
    this.stage = "growing";
    this.sprite.setFrame(FRAME_BY_STAGE.growing);
    this.growTimer = scene.time.delayedCall(GROW_DURATION_MS, () => {
      if (!this.sprite.active) return;
      this.stage = "ready";
      this.sprite.setFrame(FRAME_BY_STAGE.ready);
    });
  }

  /** 収穫して空の状態に戻す。実っていなければ何もしない */
  harvest(): void {
    if (this.stage !== "ready") return;
    this.stage = "empty";
    this.sprite.setFrame(FRAME_BY_STAGE.empty);
  }

  destroy(): void {
    this.growTimer?.remove();
    this.sprite.destroy();
  }
}
