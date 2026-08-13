import Phaser from "phaser";

const MAX_HP = 3;
const HIT_FLASH_MS = 150;

export class Monster {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly worldX: number;
  readonly worldY: number;
  private hp = MAX_HP;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.worldX = x;
    this.worldY = y;
    this.sprite = scene.physics.add.sprite(x, y, "monster", 0);
    this.sprite.setDepth(6);
    this.sprite.setImmovable(true);

    scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.85,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  get isDead(): boolean {
    return this.hp <= 0;
  }

  /** ダメージを与える。倒れたらtrueを返す */
  takeDamage(scene: Phaser.Scene, amount = 1): boolean {
    this.hp -= amount;
    this.sprite.setTint(0xff8888);
    scene.time.delayedCall(HIT_FLASH_MS, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });
    return this.isDead;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
