import Phaser from "phaser";

const WANDER_RADIUS = 40;
const WANDER_MOVE_MS = 1500;
const WANDER_DELAY_MIN_MS = 2000;
const WANDER_DELAY_MAX_MS = 4500;

export class Npc {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly nameLabel: Phaser.GameObjects.Text;
  readonly npcName: string;
  readonly dialogue: string;
  private readonly homeX: number;
  private readonly homeY: number;
  private wanderTimer?: Phaser.Time.TimerEvent;
  private wanderTween?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    frame: number,
    npcName: string,
    dialogue: string,
  ) {
    this.homeX = x;
    this.homeY = y;
    this.npcName = npcName;
    this.dialogue = dialogue;

    this.sprite = scene.add.sprite(x, y, "npc", frame);
    this.sprite.setDepth(6);
    this.nameLabel = scene.add
      .text(x, y - 20, npcName, { fontSize: "8px", color: "#ffffff" })
      .setOrigin(0.5, 1)
      .setDepth(6);

    this.scheduleWander(scene);
  }

  /** 現在位置(会話の距離判定・吹き出し表示に使う。徘徊で動くので毎回スプライトから読む) */
  get worldX(): number {
    return this.sprite.x;
  }

  get worldY(): number {
    return this.sprite.y;
  }

  private scheduleWander(scene: Phaser.Scene): void {
    this.wanderTimer = scene.time.addEvent({
      delay: Phaser.Math.Between(WANDER_DELAY_MIN_MS, WANDER_DELAY_MAX_MS),
      callback: () => this.wander(scene),
    });
  }

  private wander(scene: Phaser.Scene): void {
    if (!this.sprite.active) return;

    const targetX = this.homeX + Phaser.Math.Between(-WANDER_RADIUS, WANDER_RADIUS);
    const targetY = this.homeY + Phaser.Math.Between(-WANDER_RADIUS, WANDER_RADIUS);
    this.sprite.setFlipX(targetX < this.sprite.x);

    this.wanderTween = scene.tweens.add({
      targets: this.sprite,
      x: targetX,
      y: targetY,
      duration: WANDER_MOVE_MS,
      ease: "Sine.easeInOut",
      onUpdate: () => this.nameLabel.setPosition(this.sprite.x, this.sprite.y - 20),
      onComplete: () => this.scheduleWander(scene),
    });
  }

  destroy(): void {
    this.wanderTimer?.remove();
    this.wanderTween?.stop();
    this.sprite.destroy();
    this.nameLabel.destroy();
  }
}
