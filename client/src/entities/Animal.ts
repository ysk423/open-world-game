import Phaser from "phaser";

const MAX_HP = 2;
const HIT_FLASH_MS = 150;

const WANDER_RADIUS = 80;
const WANDER_SPEED = 24;
const WANDER_MOVE_MS = 1200;
const WANDER_DELAY_MIN_MS = 2000;
const WANDER_DELAY_MAX_MS = 5000;

// ポケモン風に、なついた動物はプレイヤーの相棒として追いかけてくる
const FOLLOW_SPEED = 90;
const FOLLOW_MIN_DIST = 32;
const FOLLOW_TINT = 0xffe9a8;

// 牧場物語風に、相棒になった動物は一定間隔でミルクを用意してくれる
const PRODUCE_INTERVAL_MS = 15000;
const PRODUCE_READY_TINT = 0xfff59d;

// ポケモン風に、相棒はミルクを集めるたびに経験を積み、レベルが上がるほど生産が早くなる
const PET_LEVEL_UP_EVERY_COLLECTIONS = 3;
const PET_MAX_LEVEL = 5;
const PET_LEVEL_SPEED_MULTIPLIER = 0.85;

/** 動物。モンスターと違い接触してもプレイヤーにダメージを与えない。倒すと肉をドロップする。
 * 餌付けでなつくと相棒になり、以後はプレイヤーを追いかけるようになる */
export class Animal {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly worldX: number;
  readonly worldY: number;
  private hp = MAX_HP;
  private wanderTimer?: Phaser.Time.TimerEvent;
  private following = false;
  private produceTimer?: Phaser.Time.TimerEvent;
  private hasProduce = false;
  private level = 1;
  private collectedCount = 0;

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

  get isFollowing(): boolean {
    return this.following;
  }

  get hasProduceReady(): boolean {
    return this.hasProduce;
  }

  get petLevel(): number {
    return this.level;
  }

  /** 餌付けでなついた時に呼ぶ。以後はさまよう代わりにプレイヤーを追いかけ、定期的にミルクを用意する */
  startFollowing(scene: Phaser.Scene): void {
    this.following = true;
    this.wanderTimer?.remove();
    this.wanderTimer = undefined;
    this.sprite.setVelocity(0, 0);
    this.sprite.setTint(FOLLOW_TINT);
    this.scheduleProduce(scene);
  }

  private scheduleProduce(scene: Phaser.Scene): void {
    const delay = Math.round(PRODUCE_INTERVAL_MS * Math.pow(PET_LEVEL_SPEED_MULTIPLIER, this.level - 1));
    this.produceTimer = scene.time.delayedCall(delay, () => {
      if (!this.sprite.active) return;
      this.hasProduce = true;
      this.sprite.setTint(PRODUCE_READY_TINT);
    });
  }

  /** 用意できたミルクを集める。用意ができていなければ何もせず{collected:false}を返す。
   * 集めるたびに経験を積み、一定回数ごとにレベルアップして生産速度が上がる */
  collectProduce(scene: Phaser.Scene): { collected: boolean; leveledUp: boolean } {
    if (!this.hasProduce) return { collected: false, leveledUp: false };
    this.hasProduce = false;
    this.sprite.setTint(FOLLOW_TINT);

    this.collectedCount += 1;
    let leveledUp = false;
    if (this.level < PET_MAX_LEVEL && this.collectedCount % PET_LEVEL_UP_EVERY_COLLECTIONS === 0) {
      this.level += 1;
      leveledUp = true;
    }

    this.scheduleProduce(scene);
    return { collected: true, leveledUp };
  }

  /** 相棒になった後、毎フレーム呼んでプレイヤーを追いかけさせる */
  followUpdate(targetX: number, targetY: number): void {
    if (!this.sprite.active) return;
    const dist = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, targetX, targetY);
    if (dist > FOLLOW_MIN_DIST) {
      const angle = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, targetX, targetY);
      this.sprite.setVelocity(Math.cos(angle) * FOLLOW_SPEED, Math.sin(angle) * FOLLOW_SPEED);
      this.sprite.setFlipX(Math.cos(angle) < 0);
    } else {
      this.sprite.setVelocity(0, 0);
    }
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
    this.produceTimer?.remove();
    this.sprite.destroy();
  }
}
