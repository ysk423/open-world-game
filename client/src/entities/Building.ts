import Phaser from "phaser";
import type { BuildingType } from "../systems/recipes";

const FRAME_BY_TYPE: Record<BuildingType, number> = {
  fence: 0,
  well: 1,
  flower_bed: 2,
  signpost: 3,
  storage_shed: 4,
};

export class Building {
  readonly sprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, x: number, y: number, buildingType: BuildingType) {
    this.sprite = scene.add.sprite(x, y, "buildings", FRAME_BY_TYPE[buildingType]);
    this.sprite.setDepth(4);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
