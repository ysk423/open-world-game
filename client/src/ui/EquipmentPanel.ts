import type { ArmorId, Equipment, EquipmentState, WeaponId } from "../systems/Equipment";
import { ARMOR_BLOCK_CHANCE, ARMOR_NAME, WEAPON_DAMAGE, WEAPON_NAME } from "../systems/Equipment";

/** メニューの「装備」から開くパネル。所持している武器・防具の切り替えができる */
export class EquipmentPanel {
  private panel: HTMLDivElement;

  constructor(
    equipment: Equipment,
    onEquip: (weaponId: WeaponId) => void,
    onEquipArmor: (armorId: ArmorId) => void,
  ) {
    this.panel = document.createElement("div");
    this.panel.id = "equipment-panel";
    this.panel.style.display = "none";
    document.body.appendChild(this.panel);

    equipment.onChange((state) => this.render(state, onEquip, onEquipArmor));
  }

  open(): void {
    this.panel.style.display = "flex";
  }

  close(): void {
    this.panel.style.display = "none";
  }

  private render(
    state: EquipmentState,
    onEquip: (weaponId: WeaponId) => void,
    onEquipArmor: (armorId: ArmorId) => void,
  ): void {
    this.panel.innerHTML = "";

    const title = document.createElement("h2");
    title.textContent = "装備";
    this.panel.appendChild(title);

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

      const level = state.upgradeLevels[weaponId] ?? 0;
      const totalDamage = WEAPON_DAMAGE[weaponId] + level;
      const label = document.createElement("span");
      label.textContent =
        level > 0
          ? `⚔️ ${WEAPON_NAME[weaponId]}(攻撃力${totalDamage}, 強化Lv.${level})`
          : `⚔️ ${WEAPON_NAME[weaponId]}(攻撃力${totalDamage})`;
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
        button.addEventListener("click", () => onEquip(weaponId));
        row.appendChild(button);
      }

      this.panel.appendChild(row);
    }

    const armorTitle = document.createElement("h2");
    armorTitle.textContent = "防具";
    this.panel.appendChild(armorTitle);

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
        button.addEventListener("click", () => onEquipArmor(armorId));
        row.appendChild(button);
      }

      this.panel.appendChild(row);
    }
  }
}
