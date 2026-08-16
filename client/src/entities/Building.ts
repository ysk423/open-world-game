import Phaser from "phaser";
import type { BuildingType } from "../systems/recipes";

// farm_plot/bridge/torch/bedはGameScene側でそれぞれFarmPlot/水面タイルの書き換え/Torch/Bedとして
// 扱われ、Buildingとして描画されることはない
const FRAME_BY_TYPE: Record<BuildingType, number> = {
  fence: 0,
  well: 1,
  flower_bed: 2,
  beehive: 2,
  signpost: 3,
  custom_sign: 3,
  storage_shed: 4,
  rock: 5,
  farm_plot: -1,
  bridge: -1,
  torch: -1,
  bed: -1,
  // 専用の見た目素材がないので倉庫と同じフレームを流用し、色味だけ変えて区別する
  inn: 4,
  shipping_bin: 4,
  barn: 4,
  casino: 4,
  hot_spring: 1,
};

// 専用フレームを持たない建物向けの色味の上書き
const TINT_BY_TYPE: Partial<Record<BuildingType, number>> = {
  inn: 0xffb74d,
  shipping_bin: 0x8b5cf6,
  barn: 0x8b4513,
  casino: 0xef4444,
  custom_sign: 0x60a5fa,
  beehive: 0xfbbf24,
  hot_spring: 0xf472b6,
};

// 通り抜けられずに衝突する建物の種類(柵は「囲い」、石は障害物として機能してほしいため)
const SOLID_TYPES: ReadonlySet<BuildingType> = new Set(["fence", "rock"]);

export class Building {
  readonly sprite: Phaser.GameObjects.Sprite | Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  readonly solid: boolean;
  readonly buildingType: BuildingType;

  constructor(scene: Phaser.Scene, x: number, y: number, buildingType: BuildingType) {
    this.buildingType = buildingType;
    this.solid = SOLID_TYPES.has(buildingType);
    this.sprite = this.solid
      ? scene.physics.add.staticSprite(x, y, "buildings", FRAME_BY_TYPE[buildingType])
      : scene.add.sprite(x, y, "buildings", FRAME_BY_TYPE[buildingType]);
    this.sprite.setDepth(4);
    const tint = TINT_BY_TYPE[buildingType];
    if (tint !== undefined) this.sprite.setTint(tint);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
