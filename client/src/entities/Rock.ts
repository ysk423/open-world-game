import Phaser from "phaser";

/**
 * マップに自生している岩。通行の障害物になっており、クリック/タップで拾うと🪨(stone)を1個入手できる。
 * クラフトメニューから改めて設置することもできる(recipes.tsの"rock"を参照)。
 */
export class Rock {
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  readonly worldX: number;
  readonly worldY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.worldX = x;
    this.worldY = y;
    this.sprite = scene.physics.add.staticSprite(x, y, "rock-object", 0);
    this.sprite.setDepth(4);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
