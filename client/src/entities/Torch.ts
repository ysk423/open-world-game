import Phaser from "phaser";

const ICON_TEXTURE_KEY = "torch-icon";
const GLOW_TEXTURE_KEY = "torch-glow";
const GLOW_RADIUS = 140;

/** 一度だけテクスチャを生成する(全てのたいまつで使い回す) */
function ensureTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists(ICON_TEXTURE_KEY)) {
    const g = scene.add.graphics();
    g.fillStyle(0x4a2f14, 1);
    g.fillRect(12, 15, 8, 18);
    g.fillStyle(0x8a5a2b, 1);
    g.fillRect(13, 16, 6, 16);
    g.fillStyle(0xd9541f, 1);
    g.fillCircle(16, 13, 8);
    g.fillStyle(0xffb020, 1);
    g.fillCircle(16, 12, 6);
    g.fillStyle(0xffe27a, 1);
    g.fillCircle(16, 10, 3.5);
    g.generateTexture(ICON_TEXTURE_KEY, 32, 32);
    g.destroy();
  }

  if (!scene.textures.exists(GLOW_TEXTURE_KEY)) {
    const size = GLOW_RADIUS * 2;
    const g = scene.add.graphics();
    // 同心円を重ねて、中心が明るく外側にいくほど透明になる柔らかい光を近似する
    const rings = 8;
    for (let i = rings; i >= 1; i--) {
      const radius = (GLOW_RADIUS / rings) * i;
      const alpha = 0.5 * (1 - i / rings) ** 1.5;
      g.fillStyle(0xffcc66, alpha);
      g.fillCircle(GLOW_RADIUS, GLOW_RADIUS, radius);
    }
    g.generateTexture(GLOW_TEXTURE_KEY, size, size);
    g.destroy();
  }
}

/**
 * マインクラフトのたいまつを参考にした設置物。障害物にはならず、昼夜サイクルの夜の
 * 暗さオーバーレイの上から加算合成の光を重ねることで、周囲だけ明るく見せる。
 */
export class Torch {
  readonly worldX: number;
  readonly worldY: number;
  private readonly iconSprite: Phaser.GameObjects.Image;
  private readonly glowSprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.worldX = x;
    this.worldY = y;
    ensureTextures(scene);

    this.glowSprite = scene.add.image(x, y, GLOW_TEXTURE_KEY);
    this.glowSprite.setBlendMode(Phaser.BlendModes.ADD);
    this.glowSprite.setDepth(16);

    this.iconSprite = scene.add.image(x, y, ICON_TEXTURE_KEY);
    this.iconSprite.setDepth(4);
  }

  destroy(): void {
    this.iconSprite.destroy();
    this.glowSprite.destroy();
  }
}
