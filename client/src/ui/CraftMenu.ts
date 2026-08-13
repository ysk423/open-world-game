import type { Inventory, ItemId } from "../systems/Inventory";
import { RECIPES, type Recipe } from "../systems/recipes";

const ICON_BY_ITEM: Record<ItemId, string> = {
  wood: "🪵",
  stone: "🪨",
  herb: "🌿",
};

export class CraftMenu {
  private toggleButton: HTMLButtonElement;
  private panel: HTMLDivElement;
  private isOpen = false;
  private inventory: Inventory;
  private unlockedChunks: Set<string>;
  private onCraft: (recipe: Recipe) => void;

  constructor(inventory: Inventory, unlockedChunks: Set<string>, onCraft: (recipe: Recipe) => void) {
    this.inventory = inventory;
    this.unlockedChunks = unlockedChunks;
    this.onCraft = onCraft;

    this.toggleButton = document.createElement("button");
    this.toggleButton.id = "craft-toggle";
    this.toggleButton.textContent = "🔨 クラフト";
    this.toggleButton.addEventListener("click", () => this.setOpen(!this.isOpen));
    document.body.appendChild(this.toggleButton);

    this.panel = document.createElement("div");
    this.panel.id = "craft-menu";
    this.panel.style.display = "none";
    document.body.appendChild(this.panel);

    inventory.onChange(() => this.render());
  }

  /** チャンクが新しく解放された時などに再描画したい場合に呼ぶ */
  refresh(): void {
    this.render();
  }

  private setOpen(open: boolean): void {
    this.isOpen = open;
    this.panel.style.display = open ? "flex" : "none";
    this.render();
  }

  private render(): void {
    if (!this.isOpen) return;

    const counts = this.inventory.getCounts();
    this.panel.innerHTML = "";

    const title = document.createElement("h2");
    title.textContent = "クラフト";
    this.panel.appendChild(title);

    for (const recipe of RECIPES) {
      const alreadyUnlocked =
        recipe.effect.type === "unlock_chunk" && this.unlockedChunks.has(recipe.effect.chunkId);
      const canAfford = !alreadyUnlocked && this.inventory.canAfford(recipe.inputs);

      const card = document.createElement("div");
      card.className = "recipe-card";

      const label = document.createElement("div");
      label.className = "recipe-name";
      label.textContent = recipe.name;
      card.appendChild(label);

      const cost = document.createElement("div");
      cost.className = "recipe-cost";
      cost.textContent = (Object.entries(recipe.inputs) as [ItemId, number][])
        .map(([id, amount]) => `${ICON_BY_ITEM[id]}${amount}(${counts[id]})`)
        .join(" ");
      card.appendChild(cost);

      const button = document.createElement("button");
      button.textContent = alreadyUnlocked ? "開放済み" : "作る";
      button.disabled = alreadyUnlocked || !canAfford;
      button.addEventListener("click", () => this.onCraft(recipe));
      card.appendChild(button);

      this.panel.appendChild(card);
    }
  }
}
