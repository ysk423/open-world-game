import Phaser from "phaser";

const TEXTURE_KEY = "bed-icon";

function ensureTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURE_KEY)) return;
  const g = scene.add.graphics();
  g.fillStyle(0x8a5a2b, 1);
  g.fillRect(2, 6, 28, 22);
  g.fillStyle(0xd94f4f, 1);
  g.fillRect(4, 12, 24, 15);
  g.fillStyle(0xffffff, 1);
  g.fillRect(5, 8, 9, 7);
  g.generateTexture(TEXTURE_KEY, 32, 32);
  g.destroy();
}

/**
 * マインクラフトのベッドを参考にした設置物。障害物にはならず、使うとその場所が
 * 気絶からの復帰地点になる(GameScene側でrespawnPointとして管理する)。
 */
export class Bed {
  readonly worldX: number;
  readonly worldY: number;
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.worldX = x;
    this.worldY = y;
    ensureTexture(scene);
    this.sprite = scene.add.image(x, y, TEXTURE_KEY);
    this.sprite.setDepth(4);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
