import Phaser from "phaser";

const TEXTURE_KEY = "chest-icon";

function ensureTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURE_KEY)) return;
  const g = scene.add.graphics();
  g.fillStyle(0x7a4a23, 1);
  g.fillRect(3, 12, 26, 16);
  g.fillStyle(0x5c3417, 1);
  g.fillRect(3, 12, 26, 5);
  g.fillStyle(0xe8b93a, 1);
  g.fillRect(3, 15, 26, 2);
  g.fillRect(14, 12, 4, 16);
  g.fillStyle(0xffe27a, 1);
  g.fillCircle(16, 21, 2.5);
  g.generateTexture(TEXTURE_KEY, 32, 32);
  g.destroy();
}

/**
 * DQ/ゼルダの宝箱を参考にした、ワールドに稀に配置される一度きりのお宝。
 * 開けるとコインと経験値がもらえ、しばらくして別の場所に再出現する。
 */
export class Chest {
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
