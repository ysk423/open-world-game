import type { BuildingItems } from "../systems/BuildingItems";
import { BUILDING_TYPE_NAME, BUILDING_TYPES, type BuildingType } from "../systems/recipes";
import type { ArmorId, Equipment, EquipmentState, WeaponId } from "../systems/Equipment";
import { ARMOR_BLOCK_CHANCE, ARMOR_NAME, WEAPON_DAMAGE, WEAPON_NAME } from "../systems/Equipment";
import { createPanelHeader } from "./panelHeader";

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
    this.panel.appendChild(createPanelHeader("アイテム", "items-close", () => this.close()));

    this.renderPlacementSection();
    this.renderEquipmentSection(state);
    this.renderArmorSection(state);
  }

  private renderSectionHeading(text: string): void {
    const heading = document.createElement("div");
    heading.className = "shop-section-heading";
    heading.textContent = text;
    this.panel.appendChild(heading);
  }

  /** 武器・防具1件分の行(ラベル+「装備中」バッジ or 「装備する」ボタン)を描画する */
  private renderEquipRow(label: string, isEquipped: boolean, onEquip: (() => void) | null): void {
    const row = document.createElement("div");
    row.className = "equipment-row";

    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    row.appendChild(labelEl);

    if (isEquipped) {
      const badge = document.createElement("span");
      badge.className = "equipment-current-badge";
      badge.textContent = "装備中";
      row.appendChild(badge);
    } else if (onEquip) {
      const button = document.createElement("button");
      button.textContent = "装備する";
      button.addEventListener("click", onEquip);
      row.appendChild(button);
    }

    this.panel.appendChild(row);
  }

  private renderEquipEmptyMessage(text: string): void {
    const empty = document.createElement("p");
    empty.className = "equipment-empty";
    empty.textContent = text;
    this.panel.appendChild(empty);
  }

  private renderPlacementSection(): void {
    this.renderSectionHeading("📥 設置");

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
    this.renderSectionHeading("⚔️ 装備");

    this.renderEquipRow(`👊 素手(攻撃力${WEAPON_DAMAGE.fists})`, state.equipped === null, null);

    if (state.owned.length === 0) {
      this.renderEquipEmptyMessage("まだ武器を持っていません。クラフトで作ろう。");
    }

    for (const weaponId of state.owned) {
      this.renderEquipRow(
        `⚔️ ${WEAPON_NAME[weaponId]}(攻撃力${WEAPON_DAMAGE[weaponId]})`,
        state.equipped === weaponId,
        () => this.onEquip(weaponId),
      );
    }
  }

  private renderArmorSection(state: EquipmentState): void {
    this.renderSectionHeading("🛡️ 防具");

    if (state.ownedArmor.length === 0) {
      this.renderEquipEmptyMessage("まだ防具を持っていません。クラフトで作ろう。");
      return;
    }

    for (const armorId of state.ownedArmor) {
      const blockPercent = Math.round(ARMOR_BLOCK_CHANCE[armorId] * 100);
      this.renderEquipRow(
        `🛡️ ${ARMOR_NAME[armorId]}(被弾${blockPercent}%防止)`,
        state.equippedArmor === armorId,
        () => this.onEquipArmor(armorId),
      );
    }
  }
}
