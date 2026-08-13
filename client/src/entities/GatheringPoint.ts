import Phaser from "phaser";
import type { ItemId } from "../systems/Inventory";

const COOLDOWN_MS = 1000;

// coin/seed/cropは採集ポイントとしては出現しない(マップ上には配置されない)ため未使用
const FRAME_BY_ITEM: Record<ItemId, number> = {
  wood: 0,
  stone: 1,
  herb: 2,
  coin: 0,
  seed: 0,
  crop: 0,
};

export class GatheringPoint {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly itemId: ItemId;
  readonly worldX: number;
  readonly worldY: number;
  private onCooldown = false;

  constructor(scene: Phaser.Scene, x: number, y: number, itemId: ItemId) {
    this.itemId = itemId;
    this.worldX = x;
    this.worldY = y;
    this.sprite = scene.add.sprite(x, y, "gathering", FRAME_BY_ITEM[itemId]);
    this.sprite.setDepth(5);
  }

  /** クールダウン中でなければ採集を成立させ、一定時間クールダウンに入る */
  tryHarvest(scene: Phaser.Scene): boolean {
    if (this.onCooldown) return false;

    this.onCooldown = true;
    this.sprite.setTint(0x999999);
    scene.time.delayedCall(COOLDOWN_MS, () => {
      this.onCooldown = false;
      this.sprite.clearTint();
    });
    return true;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
