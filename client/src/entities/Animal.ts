import Phaser from "phaser";

const MAX_HP = 2;
const HIT_FLASH_MS = 150;

const WANDER_RADIUS = 80;
const WANDER_SPEED = 24;
const WANDER_MOVE_MS = 1200;
const WANDER_DELAY_MIN_MS = 2000;
const WANDER_DELAY_MAX_MS = 5000;

/** 動物。モンスターと違い接触してもプレイヤーにダメージを与えない。倒すと肉をドロップする */
export class Animal {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly worldX: number;
  readonly worldY: number;
  private hp = MAX_HP;
  private wanderTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.worldX = x;
    this.worldY = y;
    this.sprite = scene.physics.add.sprite(x, y, "animal", 0);
    this.sprite.setDepth(6);
    this.sprite.setImmovable(true);

    this.scheduleWander(scene);
  }

  get isDead(): boolean {
    return this.hp <= 0;
  }

  private scheduleWander(scene: Phaser.Scene): void {
    this.wanderTimer = scene.time.addEvent({
      delay: Phaser.Math.Between(WANDER_DELAY_MIN_MS, WANDER_DELAY_MAX_MS),
      callback: () => this.wander(scene),
    });
  }

  private wander(scene: Phaser.Scene): void {
    if (!this.sprite.active) return;

    const distFromHome = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, this.worldX, this.worldY);
    const angle =
      distFromHome > WANDER_RADIUS
        ? Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, this.worldX, this.worldY)
        : Phaser.Math.Angle.Random();

    this.sprite.setVelocity(Math.cos(angle) * WANDER_SPEED, Math.sin(angle) * WANDER_SPEED);
    this.sprite.setFlipX(Math.cos(angle) < 0);

    scene.time.delayedCall(WANDER_MOVE_MS, () => {
      if (this.sprite.active) this.sprite.setVelocity(0, 0);
    });

    this.scheduleWander(scene);
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
    this.wanderTimer?.remove();
    this.sprite.destroy();
  }
}
