import Phaser from "phaser";
import type { Direction } from "../input/InputManager";
import type { AnimState, PlayerState } from "../net/types";

const LERP_FACTOR = 0.25;
// これ以上離れた位置への更新は、歩行ではなく瞬間移動(リスポーン・ゲームリセット等)とみなし、
// 滑らかに補間せず即座に飛ばす
const TELEPORT_DISTANCE = 300;

export class RemotePlayer {
  readonly id: string;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly nameLabel: Phaser.GameObjects.Text;
  private targetX: number;
  private targetY: number;

  constructor(scene: Phaser.Scene, player: PlayerState) {
    this.id = player.id;
    this.targetX = player.x;
    this.targetY = player.y;

    this.sprite = scene.add.sprite(player.x, player.y, "player", 0);
    this.sprite.setDepth(10);
    this.nameLabel = scene.add
      .text(player.x, player.y - 36, player.name, {
        fontSize: "8px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 1);
    this.nameLabel.setDepth(11);

    this.applyState(player.direction, player.animState);
  }

  updateTarget(x: number, y: number, direction: Direction, animState: AnimState): void {
    const jumped = Phaser.Math.Distance.Between(this.targetX, this.targetY, x, y) > TELEPORT_DISTANCE;
    this.targetX = x;
    this.targetY = y;
    this.applyState(direction, animState);

    if (jumped) {
      this.sprite.setPosition(x, y);
    }
  }

  /** 毎フレーム呼び出し、目標位置へ滑らかに補間する */
  tick(): void {
    this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.targetX, LERP_FACTOR);
    this.sprite.y = Phaser.Math.Linear(this.sprite.y, this.targetY, LERP_FACTOR);
    this.nameLabel.setPosition(this.sprite.x, this.sprite.y - 36);
  }

  private applyState(direction: Direction, animState: AnimState): void {
    this.sprite.setFlipX(direction === "left");

    const animGroup = direction === "up" ? "up" : direction === "down" ? "down" : "side";
    const key = `${animState === "walk" ? "walk" : "idle"}-${animGroup}`;
    if (this.sprite.anims.currentAnim?.key !== key) {
      this.sprite.play(key);
    }
  }

  destroy(): void {
    this.sprite.destroy();
    this.nameLabel.destroy();
  }
}
