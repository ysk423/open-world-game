import Phaser from "phaser";
import type { ItemId } from "../systems/Inventory";
import { isRaining } from "../systems/Weather";
import { getSeason, SEASON_GROWTH_MULTIPLIER } from "../systems/Season";

// 牧場物語を参考に、雨の日は水やりの手間が省けて育成が早まる
const RAIN_GROWTH_MULTIPLIER = 0.5;
// じょうろで手動で水をあげた時、残り時間からこの分だけ差し引く
const WATER_BOOST_MS = 5000;

// 牧場物語風に、じょうろで丹精込めて育てると「高品質」の実になり収穫量が増える
export const QUALITY_WATER_THRESHOLD = 2;
const QUALITY_BONUS_YIELD = 1;

type FarmStage = "empty" | "growing" | "ready";

const FRAME_BY_STAGE: Record<FarmStage, number> = {
  empty: 0,
  growing: 1,
  ready: 2,
};

export type CropId = "crop" | "wheat" | "tomato";

export type CropConfig = {
  seedItem: ItemId;
  cropItem: ItemId;
  growDurationMs: number;
  yieldAmount: number;
  /** 収穫時の見た目を作物ごとに少し変えるための色味(ready状態のみに適用) */
  readyTint: number;
};

// 種をまく時に持っている中から優先的に選ぶ順番(高く売れるものから優先)
export const CROP_PRIORITY: CropId[] = ["wheat", "tomato", "crop"];

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
  tomato: {
    seedItem: "seed_tomato",
    cropItem: "tomato",
    growDurationMs: 25000,
    yieldAmount: 2,
    readyTint: 0xff6b57,
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
  private waterCount = 0;

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

  get isGrowing(): boolean {
    return this.stage === "growing";
  }

  /** 種をまく。空の畑でなければ何もしない */
  plant(scene: Phaser.Scene, cropId: CropId): void {
    if (this.stage !== "empty") return;
    this.plantedCrop = cropId;
    this.stage = "growing";
    this.waterCount = 0;
    this.sprite.setFrame(FRAME_BY_STAGE.growing);
    this.sprite.clearTint();
    const config = CROP_CONFIG[cropId];
    const now = Date.now();
    const rainMultiplier = isRaining(now) ? RAIN_GROWTH_MULTIPLIER : 1;
    const seasonMultiplier = SEASON_GROWTH_MULTIPLIER[getSeason(now)];
    const duration = config.growDurationMs * rainMultiplier * seasonMultiplier;
    this.scheduleReady(scene, duration);
  }

  /** じょうろで水をあげる。育成中でなければ何もせずfalseを返す */
  water(scene: Phaser.Scene): boolean {
    if (this.stage !== "growing" || !this.growTimer) return false;
    const remaining = Math.max(0, this.growTimer.delay - this.growTimer.elapsed);
    this.growTimer.remove();
    this.waterCount += 1;
    this.scheduleReady(scene, Math.max(0, remaining - WATER_BOOST_MS));
    return true;
  }

  private scheduleReady(scene: Phaser.Scene, delayMs: number): void {
    this.growTimer = scene.time.delayedCall(delayMs, () => {
      if (!this.sprite.active || !this.plantedCrop) return;
      this.stage = "ready";
      this.sprite.setFrame(FRAME_BY_STAGE.ready);
      this.sprite.setTint(CROP_CONFIG[this.plantedCrop].readyTint);
    });
  }

  /** 収穫して空の状態に戻す。実っていなければ何もしない。何をどれだけ収穫できたか(高品質だったか)を返す */
  harvest(): { itemId: ItemId; amount: number; highQuality: boolean } | null {
    if (this.stage !== "ready" || !this.plantedCrop) return null;
    const config = CROP_CONFIG[this.plantedCrop];
    const highQuality = this.waterCount >= QUALITY_WATER_THRESHOLD;
    const amount = config.yieldAmount + (highQuality ? QUALITY_BONUS_YIELD : 0);
    this.stage = "empty";
    this.plantedCrop = null;
    this.waterCount = 0;
    this.sprite.setFrame(FRAME_BY_STAGE.empty);
    this.sprite.clearTint();
    return { itemId: config.cropItem, amount, highQuality };
  }

  destroy(): void {
    this.growTimer?.remove();
    this.sprite.destroy();
  }
}
