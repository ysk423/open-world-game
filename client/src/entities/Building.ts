import Phaser from "phaser";
import type { BuildingType } from "../systems/recipes";

// farm_plot/torchはGameScene側でそれぞれFarmPlot/Torchとして扱われ、Buildingとして描画されることはない
const FRAME_BY_TYPE: Record<BuildingType, number> = {
  flower_bed: 2,
  beehive: 2,
  storage_shed: 4,
  rock: 5,
  farm_plot: -1,
  torch: -1,
  // 専用の見た目素材がないので倉庫と同じフレームを流用し、色味だけ変えて区別する
  inn: 4,
  shipping_bin: 4,
  pet_box: 4,
};

// 専用フレームを持たない建物向けの色味の上書き
const TINT_BY_TYPE: Partial<Record<BuildingType, number>> = {
  inn: 0xffb74d,
  shipping_bin: 0x8b5cf6,
  beehive: 0xfbbf24,
  pet_box: 0x22d3ee,
};

// 通り抜けられずに衝突する建物の種類(石は障害物として機能してほしいため)
const SOLID_TYPES: ReadonlySet<BuildingType> = new Set(["rock"]);

// 近づいてクリックすると回収でき、持ち物の建物アイテムに戻して置き直せる種類
// (倉庫・宿屋など機能を持つ建物は回収対象外。他の建物種にも回収要望が出た場合はここに追加する)
export const PICKUPABLE_TYPES: ReadonlySet<BuildingType> = new Set(["rock"]);

export class Building {
  readonly id: string;
  readonly sprite: Phaser.GameObjects.Sprite | Phaser.Types.Physics.Arcade.SpriteWithStaticBody;
  readonly solid: boolean;
  readonly buildingType: BuildingType;

  constructor(scene: Phaser.Scene, id: string, x: number, y: number, buildingType: BuildingType) {
    this.id = id;
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
