import Phaser from "phaser";
import type { ItemId } from "../systems/Inventory";

type FarmStage = "empty" | "growing" | "ready";

const FRAME_BY_STAGE: Record<FarmStage, number> = {
  empty: 0,
  growing: 1,
  ready: 2,
};

export type CropId = "crop" | "wheat";

export type CropConfig = {
  seedItem: ItemId;
  cropItem: ItemId;
  growDurationMs: number;
  yieldAmount: number;
  /** 収穫時の見た目を作物ごとに少し変えるための色味(ready状態のみに適用) */
  readyTint: number;
};

// 種をまく時に持っている中から優先的に選ぶ順番(小麦の方が高く売れるので優先)
export const CROP_PRIORITY: CropId[] = ["wheat", "crop"];

export const CROP_CONFIG: Record<CropId, CropConfig> = {
  crop: {
    seedItem: "seed",
    cropItem: "crop",
    growDurationMs: 20000,
    yieldAmount: 2,
    readyTint: 0xffffff,
  },
  wheat: {
    seedItem: "seed_wheat",
    cropItem: "wheat",
    growDurationMs: 30000,
    yieldAmount: 3,
    readyTint: 0xf6e6a8,
  },
};

/**
 * 畑。種をまくと一定時間後に実り、収穫できる。個人の見え方はサーバーと同期しない
 * (畑自体の設置場所はほかの建物と同様に共有されるが、育成状態はクライアントローカル)。
 * 種の種類によって育成時間・収穫量が変わる。
 */
export class FarmPlot {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly worldX: number;
  readonly worldY: number;
  private stage: FarmStage = "empty";
  private plantedCrop: CropId | null = null;
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
  plant(scene: Phaser.Scene, cropId: CropId): void {
    if (this.stage !== "empty") return;
    this.plantedCrop = cropId;
    this.stage = "growing";
    this.sprite.setFrame(FRAME_BY_STAGE.growing);
    this.sprite.clearTint();
    const config = CROP_CONFIG[cropId];
    this.growTimer = scene.time.delayedCall(config.growDurationMs, () => {
      if (!this.sprite.active) return;
      this.stage = "ready";
      this.sprite.setFrame(FRAME_BY_STAGE.ready);
      this.sprite.setTint(config.readyTint);
    });
  }

  /** 収穫して空の状態に戻す。実っていなければ何もしない。何をどれだけ収穫できたかを返す */
  harvest(): { itemId: ItemId; amount: number } | null {
    if (this.stage !== "ready" || !this.plantedCrop) return null;
    const config = CROP_CONFIG[this.plantedCrop];
    this.stage = "empty";
    this.plantedCrop = null;
    this.sprite.setFrame(FRAME_BY_STAGE.empty);
    this.sprite.clearTint();
    return { itemId: config.cropItem, amount: config.yieldAmount };
  }

  destroy(): void {
    this.growTimer?.remove();
    this.sprite.destroy();
  }
}
