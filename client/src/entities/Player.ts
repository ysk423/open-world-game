import Phaser from "phaser";
import type { Direction, MoveState } from "../input/InputManager";

// 32pxタイル(16pxの倍)に合わせて、当たり判定・移動速度も倍にしてある。
const SPEED = 180;

// スプライトシートのフレーム番号(2列x3行、行: down/side/up)
const FRAMES = {
  down: [0, 1],
  side: [2, 3],
  up: [4, 5],
};

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  currentDirection: Direction = "down";
  isMoving = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, "player", 0);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setSize(24, 20);
    this.sprite.setOffset(4, 40);
    this.sprite.setDepth(10);

    this.createAnimations(scene);
    this.sprite.play("idle-down");
  }

  private createAnimations(scene: Phaser.Scene): void {
    const anims = scene.anims;

    const define = (key: string, frames: number[], frameRate: number, repeat: number) => {
      if (anims.exists(key)) return;
      anims.create({
        key,
        frames: anims.generateFrameNumbers("player", { frames }),
        frameRate,
        repeat,
      });
    };

    define("idle-down", [FRAMES.down[0]], 1, 0);
    define("walk-down", FRAMES.down, 6, -1);
    define("idle-side", [FRAMES.side[0]], 1, 0);
    define("walk-side", FRAMES.side, 6, -1);
    define("idle-up", [FRAMES.up[0]], 1, 0);
    define("walk-up", FRAMES.up, 6, -1);
  }

  update(moveState: MoveState): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    const velocity = new Phaser.Math.Vector2(moveState.x, moveState.y);
    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(SPEED);
    }
    body.setVelocity(velocity.x, velocity.y);

    this.updateAnimation(moveState);
  }

  private updateAnimation(moveState: MoveState): void {
    this.currentDirection = moveState.direction;
    this.isMoving = moveState.moving;

    if (moveState.direction === "left") {
      this.sprite.setFlipX(true);
    } else if (moveState.direction === "right") {
      this.sprite.setFlipX(false);
    }

    const animGroup =
      moveState.direction === "up"
        ? "up"
        : moveState.direction === "down"
          ? "down"
          : "side";

    const key = `${moveState.moving ? "walk" : "idle"}-${animGroup}`;
    if (this.sprite.anims.currentAnim?.key !== key) {
      this.sprite.play(key);
    }
  }
}
