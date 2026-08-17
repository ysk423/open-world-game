import type { Inventory, ItemId } from "../systems/Inventory";
import type { WeaponId, ArmorId } from "../systems/Equipment";
import { MAX_WEAPON_UPGRADE_LEVEL } from "../systems/Equipment";
import type { ToolId } from "../systems/Tools";
import { RECIPES, type Recipe } from "../systems/recipes";

const ICON_BY_ITEM: Record<ItemId, string> = {
  wood: "🪵",
  stone: "🪨",
  herb: "🌿",
  coin: "💰",
  seed: "🌱",
  crop: "🥕",
  meat: "🍖",
  seed_wheat: "🌾",
  wheat: "🍞",
  cooked_meat: "🍗",
  fish: "🐟",
  milk: "🥛",
  seed_tomato: "🌱",
  tomato: "🍅",
  cooked_fish: "🍢",
  honey: "🍯",
  iron_ingot: "🔩",
  wool: "🧶",
  totem: "🗿",
};

export class CraftMenu {
  private panel: HTMLDivElement;
  private isOpen = false;
  private expandedIds = new Set<string>();
  private inventory: Inventory;
  private getOwnedWeapons: () => ReadonlySet<WeaponId>;
  private getOwnedTools: () => ReadonlySet<ToolId>;
  private getUpgradeLevel: (weaponId: WeaponId) => number;
  private getOwnedArmor: () => ReadonlySet<ArmorId>;
  private getHasEnchant: (weaponId: WeaponId) => boolean;
  private onCraft: (recipe: Recipe) => void;

  constructor(
    inventory: Inventory,
    getOwnedWeapons: () => ReadonlySet<WeaponId>,
    getOwnedTools: () => ReadonlySet<ToolId>,
    getUpgradeLevel: (weaponId: WeaponId) => number,
    getOwnedArmor: () => ReadonlySet<ArmorId>,
    getHasEnchant: (weaponId: WeaponId) => boolean,
    onCraft: (recipe: Recipe) => void,
  ) {
    this.inventory = inventory;
    this.getOwnedWeapons = getOwnedWeapons;
    this.getOwnedTools = getOwnedTools;
    this.getUpgradeLevel = getUpgradeLevel;
    this.getOwnedArmor = getOwnedArmor;
    this.getHasEnchant = getHasEnchant;
    this.onCraft = onCraft;

    this.panel = document.createElement("div");
    this.panel.id = "craft-menu";
    this.panel.style.display = "none";
    document.body.appendChild(this.panel);

    inventory.onChange(() => this.render());
  }

  /** 武器の入手など、Inventory以外の変化で表示を更新したい時に呼ぶ */
  refresh(): void {
    this.render();
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

    const counts = this.inventory.getCounts();
    const ownedWeapons = this.getOwnedWeapons();
    const ownedTools = this.getOwnedTools();
    const ownedArmor = this.getOwnedArmor();
    this.panel.innerHTML = "";

    const title = document.createElement("h2");
    title.textContent = "クラフト";
    this.panel.appendChild(title);

    for (const recipe of RECIPES) {
      const alreadyOwned =
        (recipe.effect.type === "weapon" && ownedWeapons.has(recipe.effect.weaponId)) ||
        (recipe.effect.type === "tool" && ownedTools.has(recipe.effect.toolId)) ||
        (recipe.effect.type === "armor" && ownedArmor.has(recipe.effect.armorId));
      const weaponNotOwnedForUpgrade =
        (recipe.effect.type === "upgrade" || recipe.effect.type === "enchant") &&
        !ownedWeapons.has(recipe.effect.weaponId);
      const atMaxUpgrade =
        recipe.effect.type === "upgrade" &&
        !weaponNotOwnedForUpgrade &&
        this.getUpgradeLevel(recipe.effect.weaponId) >= MAX_WEAPON_UPGRADE_LEVEL;
      const alreadyEnchanted =
        recipe.effect.type === "enchant" &&
        !weaponNotOwnedForUpgrade &&
        this.getHasEnchant(recipe.effect.weaponId);
      const blocked = alreadyOwned || weaponNotOwnedForUpgrade || atMaxUpgrade || alreadyEnchanted;
      const canAfford = !blocked && this.inventory.canAfford(recipe.inputs);

      const card = document.createElement("div");
      card.className = "recipe-card";

      const label = document.createElement("div");
      label.className = "recipe-name";
      label.textContent =
        recipe.effect.type === "upgrade"
          ? `${recipe.name}(現在Lv.${this.getUpgradeLevel(recipe.effect.weaponId)})`
          : recipe.name;
      if (recipe.description) label.title = recipe.description;
      card.appendChild(label);

      if (recipe.description) {
        const infoButton = document.createElement("button");
        infoButton.type = "button";
        infoButton.className = "recipe-info-button";
        infoButton.textContent = "ⓘ";
        infoButton.setAttribute("aria-label", "説明を表示");
        infoButton.addEventListener("click", () => {
          if (this.expandedIds.has(recipe.id)) {
            this.expandedIds.delete(recipe.id);
          } else {
            this.expandedIds.add(recipe.id);
          }
          this.render();
        });
        card.appendChild(infoButton);
      }

      const cost = document.createElement("div");
      cost.className = "recipe-cost";
      cost.textContent = (Object.entries(recipe.inputs) as [ItemId, number][])
        .map(([id, amount]) => `${ICON_BY_ITEM[id]}${amount}(${counts[id]})`)
        .join(" ");
      card.appendChild(cost);

      const button = document.createElement("button");
      button.textContent = alreadyOwned
        ? "習得済み"
        : weaponNotOwnedForUpgrade
          ? "武器が必要"
          : atMaxUpgrade
            ? "最大まで強化済み"
            : alreadyEnchanted
              ? "付与済み"
              : "作る";
      button.disabled = blocked || !canAfford;
      button.addEventListener("click", () => this.onCraft(recipe));
      card.appendChild(button);

      this.panel.appendChild(card);

      if (recipe.description && this.expandedIds.has(recipe.id)) {
        const description = document.createElement("div");
        description.className = "recipe-description";
        description.textContent = recipe.description;
        this.panel.appendChild(description);
      }
    }
  }
}
