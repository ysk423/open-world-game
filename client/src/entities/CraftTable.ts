import Phaser from "phaser";

/** 拠点に最初から設置されているクラフト台。近づいてクラフトメニューを開く */
export class CraftTable {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly nameLabel: Phaser.GameObjects.Text;
  readonly worldX: number;
  readonly worldY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.worldX = x;
    this.worldY = y;

    this.sprite = scene.add.sprite(x, y, "craft-table");
    this.sprite.setDepth(6);
    this.nameLabel = scene.add
      .text(x, y - 24, "🔨 クラフト台", { fontSize: "9px", color: "#ffffff" })
      .setOrigin(0.5, 1)
      .setDepth(6);
  }

  destroy(): void {
    this.sprite.destroy();
    this.nameLabel.destroy();
  }
}
