import type { ItemId } from "../systems/Inventory";
import type { Inventory } from "../systems/Inventory";

const ICON_BY_ITEM: Record<ItemId, string> = {
  wood: "🪵",
  stone: "🪨",
  herb: "🌿",
};
const ITEM_ORDER: ItemId[] = ["wood", "stone", "herb"];

export class InventoryHud {
  private el: HTMLDivElement;

  constructor(inventory: Inventory) {
    this.el = document.createElement("div");
    this.el.id = "inventory-hud";
    document.body.appendChild(this.el);

    inventory.onChange((counts) => this.render(counts));
  }

  private render(counts: Readonly<Record<ItemId, number>>): void {
    this.el.innerHTML = ITEM_ORDER.map(
      (id) =>
        `<span class="inventory-item"><span class="inventory-icon">${ICON_BY_ITEM[id]}</span>${counts[id]}</span>`,
    ).join("");
  }

  destroy(): void {
    this.el.remove();
  }
}
