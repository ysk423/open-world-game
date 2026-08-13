import Phaser from "phaser";

/** マップ上に置かれたショップ。近づいて話しかけるとShopPanelが開く */
export class Shop {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly nameLabel: Phaser.GameObjects.Text;
  readonly worldX: number;
  readonly worldY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.worldX = x;
    this.worldY = y;

    this.sprite = scene.add.sprite(x, y, "shop", 0);
    // 拠点の目印として遠くからでも分かりやすいよう、通常のオブジェクトより一回り大きく表示する
    this.sprite.setScale(1.6);
    this.sprite.setDepth(6);
    this.nameLabel = scene.add
      .text(x, y - 46, "🏪 ショップ", { fontSize: "9px", color: "#ffffff" })
      .setOrigin(0.5, 1)
      .setDepth(6);
  }

  destroy(): void {
    this.sprite.destroy();
    this.nameLabel.destroy();
  }
}
