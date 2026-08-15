import Phaser from "phaser";

const MAX_HP = 3;
const HIT_FLASH_MS = 150;

const WANDER_RADIUS = 60;
const WANDER_SPEED = 30;
const WANDER_MOVE_MS = 1000;
const WANDER_DELAY_MIN_MS = 1500;
const WANDER_DELAY_MAX_MS = 3500;

// ドラクエの「はぐれメタル」やポケモンの色違いを参考にした、稀に出現する強敵の色味とHP倍率
const RARE_TINT = 0xffd700;
export const RARE_HP_MULTIPLIER = 3;

// DQ風の「フィールドボス」。常にワールドに1体だけ存在し、通常より大きく・強く・高報酬にする
const BOSS_TINT = 0xdc2626;
export const BOSS_HP_MULTIPLIER = 8;
const BOSS_SCALE = 1.7;

export class Monster {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly worldX: number;
  readonly worldY: number;
  readonly isRare: boolean;
  readonly isBoss: boolean;
  private hp: number;
  private wanderTimer?: Phaser.Time.TimerEvent;
  private nameLabel?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, isRare = false, isBoss = false) {
    this.worldX = x;
    this.worldY = y;
    this.isRare = isRare;
    this.isBoss = isBoss;
    this.hp = isBoss ? MAX_HP * BOSS_HP_MULTIPLIER : isRare ? MAX_HP * RARE_HP_MULTIPLIER : MAX_HP;
    this.sprite = scene.physics.add.sprite(x, y, "monster", 0);
    this.sprite.setDepth(6);
    this.sprite.setImmovable(true);

    const baseScale = isBoss ? BOSS_SCALE : 1;
    if (isBoss) {
      this.sprite.setScale(baseScale);
      this.sprite.setTint(BOSS_TINT);
      this.nameLabel = scene.add
        .text(x, y - 24, "👑 ボス", { fontSize: "9px", color: "#ffffff" })
        .setOrigin(0.5, 1)
        .setDepth(6);
    } else if (isRare) {
      this.sprite.setTint(RARE_TINT);
    }

    scene.tweens.add({
      targets: this.sprite,
      scaleY: baseScale * 0.85,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

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
    // 巣から離れすぎたら戻る方向へ、それ以外はランダムな方向へ歩く
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
      if (!this.sprite.active) return;
      // レア個体・ボスは被弾フラッシュの後、無色に戻さず元の色味に戻す
      if (this.isBoss) this.sprite.setTint(BOSS_TINT);
      else if (this.isRare) this.sprite.setTint(RARE_TINT);
      else this.sprite.clearTint();
    });
    return this.isDead;
  }

  /** ボスの名前ラベルを現在位置に追従させる(毎フレームGameScene側から呼ぶ想定) */
  updateNameLabel(): void {
    this.nameLabel?.setPosition(this.sprite.x, this.sprite.y - 24);
  }

  destroy(): void {
    this.wanderTimer?.remove();
    this.nameLabel?.destroy();
    this.sprite.destroy();
  }
}
