import Phaser from "phaser";
import type { BuildingType } from "../systems/recipes";

// farm_plot/bridge/torchはGameScene側でそれぞれFarmPlot/水面タイルの書き換え/Torchとして扱われ、
// Buildingとして描画されることはない
const FRAME_BY_TYPE: Record<BuildingType, number> = {
  fence: 0,
  well: 1,
  flower_bed: 2,
  signpost: 3,
  storage_shed: 4,
  rock: 5,
  farm_plot: -1,
  bridge: -1,
  torch: -1,
};

// 通り抜けられずに衝突する建物の種類(柵は「囲い」、石は障害物として機能してほしいため)
const SOLID_TYPES: ReadonlySet<BuildingType> = new Set(["fence", "rock"]);

export class Building {
  readonly sprite: Phaser.GameObjects.Sprite | Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  readonly solid: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, buildingType: BuildingType) {
    this.solid = SOLID_TYPES.has(buildingType);
    this.sprite = this.solid
      ? scene.physics.add.staticSprite(x, y, "buildings", FRAME_BY_TYPE[buildingType])
      : scene.add.sprite(x, y, "buildings", FRAME_BY_TYPE[buildingType]);
    this.sprite.setDepth(4);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
