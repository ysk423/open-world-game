import type { BuildingItems } from "../systems/BuildingItems";
import { BUILDING_TYPE_NAME, BUILDING_TYPES, type BuildingType } from "../systems/recipes";
import type { ArmorId, Equipment, EquipmentState, WeaponId } from "../systems/Equipment";
import { ARMOR_BLOCK_CHANCE, ARMOR_NAME, WEAPON_DAMAGE, WEAPON_NAME } from "../systems/Equipment";

/**
 * メニューの「アイテム」から開くパネル。クラフトした建物の設置(旧「設置」パネル)と、
 * 武器・防具の切り替え(旧「装備」パネル)を1つにまとめたもの。
 */
export class ItemsPanel {
  private panel: HTMLDivElement;
  private isOpen = false;
  private buildingItems: BuildingItems;
  private onPlace: (buildingType: BuildingType) => void;
  private onEquip: (weaponId: WeaponId) => void;
  private onEquipArmor: (armorId: ArmorId) => void;
  private latestEquipmentState: EquipmentState | null = null;

  constructor(
    buildingItems: BuildingItems,
    onPlace: (buildingType: BuildingType) => void,
    equipment: Equipment,
    onEquip: (weaponId: WeaponId) => void,
    onEquipArmor: (armorId: ArmorId) => void,
  ) {
    this.buildingItems = buildingItems;
    this.onPlace = onPlace;
    this.onEquip = onEquip;
    this.onEquipArmor = onEquipArmor;

    this.panel = document.createElement("div");
    this.panel.id = "items-panel";
    this.panel.style.display = "none";
    document.body.appendChild(this.panel);

    buildingItems.onChange(() => this.render());
    equipment.onChange((state) => {
      this.latestEquipmentState = state;
      this.render();
    });
  }

  open(): void {
    this.setOpen(true);
  }

  close(): void {
    this.setOpen(false);
  }

  private setOpen(open: boolean): void {
    this.isOpen = open;
    this.panel.style.display = open ? "flex" : "none";
    this.render();
  }

  private render(): void {
    if (!this.isOpen || !this.latestEquipmentState) return;
    const state = this.latestEquipmentState;
    this.panel.innerHTML = "";

    const header = document.createElement("div");
    header.className = "shop-header";
    const title = document.createElement("h2");
    title.textContent = "アイテム";
    header.appendChild(title);
    const closeButton = document.createElement("button");
    closeButton.id = "items-close";
    closeButton.textContent = "✕";
    closeButton.addEventListener("click", () => this.close());
    header.appendChild(closeButton);
    this.panel.appendChild(header);

    this.renderPlacementSection();
    this.renderEquipmentSection(state);
    this.renderArmorSection(state);
  }

  private renderPlacementSection(): void {
    const heading = document.createElement("div");
    heading.className = "shop-section-heading";
    heading.textContent = "📥 設置";
    this.panel.appendChild(heading);

    const counts = this.buildingItems.getCounts();
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

  private renderEquipmentSection(state: EquipmentState): void {
    const heading = document.createElement("div");
    heading.className = "shop-section-heading";
    heading.textContent = "⚔️ 装備";
    this.panel.appendChild(heading);

    const fistsRow = document.createElement("div");
    fistsRow.className = "equipment-row";
    const fistsLabel = document.createElement("span");
    fistsLabel.textContent = `👊 素手(攻撃力${WEAPON_DAMAGE.fists})`;
    fistsRow.appendChild(fistsLabel);
    if (state.equipped === null) {
      const badge = document.createElement("span");
      badge.className = "equipment-current-badge";
      badge.textContent = "装備中";
      fistsRow.appendChild(badge);
    }
    this.panel.appendChild(fistsRow);

    if (state.owned.length === 0) {
      const empty = document.createElement("p");
      empty.className = "equipment-empty";
      empty.textContent = "まだ武器を持っていません。クラフトで作ろう。";
      this.panel.appendChild(empty);
    }

    for (const weaponId of state.owned) {
      const row = document.createElement("div");
      row.className = "equipment-row";

      const label = document.createElement("span");
      label.textContent = `⚔️ ${WEAPON_NAME[weaponId]}(攻撃力${WEAPON_DAMAGE[weaponId]})`;
      row.appendChild(label);

      const isEquipped = state.equipped === weaponId;
      if (isEquipped) {
        const badge = document.createElement("span");
        badge.className = "equipment-current-badge";
        badge.textContent = "装備中";
        row.appendChild(badge);
      } else {
        const button = document.createElement("button");
        button.textContent = "装備する";
        button.addEventListener("click", () => this.onEquip(weaponId));
        row.appendChild(button);
      }

      this.panel.appendChild(row);
    }
  }

  private renderArmorSection(state: EquipmentState): void {
    const heading = document.createElement("div");
    heading.className = "shop-section-heading";
    heading.textContent = "🛡️ 防具";
    this.panel.appendChild(heading);

    if (state.ownedArmor.length === 0) {
      const empty = document.createElement("p");
      empty.className = "equipment-empty";
      empty.textContent = "まだ防具を持っていません。クラフトで作ろう。";
      this.panel.appendChild(empty);
      return;
    }

    for (const armorId of state.ownedArmor) {
      const row = document.createElement("div");
      row.className = "equipment-row";

      const blockPercent = Math.round(ARMOR_BLOCK_CHANCE[armorId] * 100);
      const label = document.createElement("span");
      label.textContent = `🛡️ ${ARMOR_NAME[armorId]}(被弾${blockPercent}%防止)`;
      row.appendChild(label);

      const isEquipped = state.equippedArmor === armorId;
      if (isEquipped) {
        const badge = document.createElement("span");
        badge.className = "equipment-current-badge";
        badge.textContent = "装備中";
        row.appendChild(badge);
      } else {
        const button = document.createElement("button");
        button.textContent = "装備する";
        button.addEventListener("click", () => this.onEquipArmor(armorId));
        row.appendChild(button);
      }

      this.panel.appendChild(row);
    }
  }
}
