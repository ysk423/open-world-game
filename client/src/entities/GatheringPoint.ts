import Phaser from "phaser";
import type { ItemId } from "../systems/Inventory";

const COOLDOWN_MS = 1000;
const MIN_USES = 2;
const MAX_USES = 5;
const RESPAWN_DELAY_MS = 45000;

// wood/stone/herb以外は採集ポイントとしては出現しない(マップ上には配置されない)ため未使用
const FRAME_BY_ITEM: Record<ItemId, number> = {
  wood: 0,
  stone: 1,
  herb: 2,
  coin: 0,
  seed: 0,
  crop: 0,
  meat: 0,
  seed_wheat: 0,
  wheat: 0,
  cooked_meat: 0,
  fish: 0,
  milk: 0,
  seed_tomato: 0,
  tomato: 0,
  cooked_fish: 0,
  honey: 0,
  iron_ingot: 0,
  wool: 0,
};

export class GatheringPoint {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly itemId: ItemId;
  readonly worldX: number;
  readonly worldY: number;
  private onCooldown = false;
  private remainingUses = Phaser.Math.Between(MIN_USES, MAX_USES);
  private depleted = false;
  private respawnTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number, itemId: ItemId) {
    this.itemId = itemId;
    this.worldX = x;
    this.worldY = y;
    this.sprite = scene.add.sprite(x, y, "gathering", FRAME_BY_ITEM[itemId]);
    this.sprite.setDepth(5);
  }

  get isDepleted(): boolean {
    return this.depleted;
  }

  /** クールダウン中・枯渇中でなければ採集を成立させる。何回か採集すると枯渇し、しばらくして復活する */
  tryHarvest(scene: Phaser.Scene): boolean {
    if (this.depleted || this.onCooldown) return false;

    this.remainingUses -= 1;
    if (this.remainingUses <= 0) {
      this.deplete(scene);
      return true;
    }

    this.onCooldown = true;
    this.sprite.setTint(0x999999);
    scene.time.delayedCall(COOLDOWN_MS, () => {
      if (!this.depleted) {
        this.onCooldown = false;
        this.sprite.clearTint();
      }
    });
    return true;
  }

  private deplete(scene: Phaser.Scene): void {
    this.depleted = true;
    this.onCooldown = false;
    this.sprite.setVisible(false);
    this.respawnTimer = scene.time.delayedCall(RESPAWN_DELAY_MS, () => this.respawn());
  }

  private respawn(): void {
    this.depleted = false;
    this.remainingUses = Phaser.Math.Between(MIN_USES, MAX_USES);
    this.sprite.clearTint();
    this.sprite.setVisible(true);
  }

  destroy(): void {
    this.respawnTimer?.remove();
    this.sprite.destroy();
  }
}
