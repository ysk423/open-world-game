import Phaser from "phaser";

export class Npc {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly nameLabel: Phaser.GameObjects.Text;
  readonly worldX: number;
  readonly worldY: number;
  readonly npcName: string;
  readonly dialogue: string;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    frame: number,
    npcName: string,
    dialogue: string,
  ) {
    this.worldX = x;
    this.worldY = y;
    this.npcName = npcName;
    this.dialogue = dialogue;

    this.sprite = scene.add.sprite(x, y, "npc", frame);
    this.sprite.setDepth(6);
    this.nameLabel = scene.add
      .text(x, y - 20, npcName, { fontSize: "8px", color: "#ffffff" })
      .setOrigin(0.5, 1)
      .setDepth(6);
  }

  destroy(): void {
    this.sprite.destroy();
    this.nameLabel.destroy();
  }
}
