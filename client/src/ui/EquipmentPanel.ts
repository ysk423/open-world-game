import type { Equipment, EquipmentState, WeaponId } from "../systems/Equipment";
import { WEAPON_DAMAGE, WEAPON_NAME } from "../systems/Equipment";

/** 画面右上の「⚔️ 装備」ボタンで開閉するパネル。所持している武器の切り替えができる */
export class EquipmentPanel {
  private toggleButton: HTMLButtonElement;
  private panel: HTMLDivElement;
  private isOpen = false;

  constructor(equipment: Equipment, onEquip: (weaponId: WeaponId) => void) {
    this.toggleButton = document.createElement("button");
    this.toggleButton.id = "equipment-toggle";
    this.toggleButton.textContent = "⚔️ 装備";
    this.toggleButton.addEventListener("click", () => this.setOpen(!this.isOpen));
    document.body.appendChild(this.toggleButton);

    this.panel = document.createElement("div");
    this.panel.id = "equipment-panel";
    this.panel.style.display = "none";
    document.body.appendChild(this.panel);

    equipment.onChange((state) => this.render(state, onEquip));
  }

  private setOpen(open: boolean): void {
    this.isOpen = open;
    this.panel.style.display = open ? "flex" : "none";
  }

  private render(state: EquipmentState, onEquip: (weaponId: WeaponId) => void): void {
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
      return;
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
        button.addEventListener("click", () => onEquip(weaponId));
        row.appendChild(button);
      }

      this.panel.appendChild(row);
    }
  }
}
