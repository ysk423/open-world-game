import Phaser from "phaser";
import type { Direction } from "../input/InputManager";
import type { AnimState, PlayerState } from "../net/types";

const LERP_FACTOR = 0.25;

export class RemotePlayer {
  readonly id: string;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly nameLabel: Phaser.GameObjects.Text;
  chunkId: string;
  private targetX: number;
  private targetY: number;

  constructor(scene: Phaser.Scene, player: PlayerState) {
    this.id = player.id;
    this.chunkId = player.chunkId;
    this.targetX = player.x;
    this.targetY = player.y;

    this.sprite = scene.add.sprite(player.x, player.y, "player", 0);
    this.sprite.setDepth(10);
    this.nameLabel = scene.add
      .text(player.x, player.y - 20, player.name, {
        fontSize: "8px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 1);
    this.nameLabel.setDepth(11);

    this.applyState(player.direction, player.animState);
  }

  updateTarget(x: number, y: number, direction: Direction, animState: AnimState, chunkId: string): void {
    const changedChunk = chunkId !== this.chunkId;
    this.chunkId = chunkId;
    this.targetX = x;
    this.targetY = y;
    this.applyState(direction, animState);

    // 別チャンクから来た場合はいきなり離れた位置から滑ってくると不自然なので瞬間移動させる
    if (changedChunk) {
      this.sprite.setPosition(x, y);
    }
  }

  /** 現在いるチャンクがローカルプレイヤーと同じ時だけ表示する */
  setVisibleForChunk(currentChunkId: string): void {
    const visible = this.chunkId === currentChunkId;
    this.sprite.setVisible(visible);
    this.nameLabel.setVisible(visible);
  }

  /** 毎フレーム呼び出し、目標位置へ滑らかに補間する */
  tick(): void {
    this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.targetX, LERP_FACTOR);
    this.sprite.y = Phaser.Math.Linear(this.sprite.y, this.targetY, LERP_FACTOR);
    this.nameLabel.setPosition(this.sprite.x, this.sprite.y - 20);
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
