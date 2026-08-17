import type { BuildingItems } from "../systems/BuildingItems";
import { BUILDING_TYPE_NAME, BUILDING_TYPES, type BuildingType } from "../systems/recipes";

/** クラフトした建物(持ち物)の一覧から、実際にワールドへ設置する操作を行うパネル */
export class BuildingItemsPanel {
  private panel: HTMLDivElement;
  private isOpen = false;
  private buildingItems: BuildingItems;
  private onPlace: (buildingType: BuildingType) => void;

  constructor(buildingItems: BuildingItems, onPlace: (buildingType: BuildingType) => void) {
    this.buildingItems = buildingItems;
    this.onPlace = onPlace;

    this.panel = document.createElement("div");
    this.panel.id = "building-items-panel";
    this.panel.style.display = "none";
    document.body.appendChild(this.panel);

    buildingItems.onChange(() => this.render());
  }

  open(): void {
    this.setOpen(true);
  }

  close(): void {
    this.setOpen(false);
  }

  toggle(): void {
    this.setOpen(!this.isOpen);
  }

  private setOpen(open: boolean): void {
    this.isOpen = open;
    this.panel.style.display = open ? "flex" : "none";
    this.render();
  }

  private render(): void {
    if (!this.isOpen) return;

    const counts = this.buildingItems.getCounts();
    this.panel.innerHTML = "";

    const title = document.createElement("h2");
    title.textContent = "設置";
    this.panel.appendChild(title);

    const heldTypes = BUILDING_TYPES.filter((type) => counts[type] > 0);

    if (heldTypes.length === 0) {
      const empty = document.createElement("div");
      empty.className = "recipe-description";
      empty.textContent = "持っている設置アイテムはありません(🔨クラフト台で作ってください)";
      this.panel.appendChild(empty);
      return;
    }

    for (const type of heldTypes) {
      const card = document.createElement("div");
      card.className = "recipe-card";

      const label = document.createElement("div");
      label.className = "recipe-name";
      label.textContent = BUILDING_TYPE_NAME[type];
      card.appendChild(label);

      const count = document.createElement("div");
      count.className = "recipe-cost";
      count.textContent = `×${counts[type]}`;
      card.appendChild(count);

      const button = document.createElement("button");
      button.textContent = "設置";
      button.addEventListener("click", () => this.onPlace(type));
      card.appendChild(button);

      this.panel.appendChild(card);
    }
  }
}
