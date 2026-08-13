export type WeaponId = "wooden_sword" | "stone_sword";

const EQUIPMENT_STORAGE_KEY = "open-world-game:equipment";

export const WEAPON_DAMAGE: Record<"fists" | WeaponId, number> = {
  fists: 1,
  wooden_sword: 2,
  stone_sword: 3,
};

export const WEAPON_NAME: Record<WeaponId, string> = {
  wooden_sword: "木の剣",
  stone_sword: "石の剣",
};

const WEAPON_IDS: WeaponId[] = ["wooden_sword", "stone_sword"];

export type EquipmentState = {
  owned: WeaponId[];
  equipped: WeaponId | null;
};

type Listener = (state: Readonly<EquipmentState>) => void;

function isWeaponId(value: unknown): value is WeaponId {
  return typeof value === "string" && (WEAPON_IDS as string[]).includes(value);
}

/** 個人の武器の所持・装備状態。localStorageに永続化される(持ち物・体力と同様に個人のみ) */
export class Equipment {
  private owned = new Set<WeaponId>();
  private equipped: WeaponId | null = null;
  private listeners: Listener[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(EQUIPMENT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<EquipmentState>;
      if (Array.isArray(parsed.owned)) {
        for (const weaponId of parsed.owned) {
          if (isWeaponId(weaponId)) this.owned.add(weaponId);
        }
      }
      if (isWeaponId(parsed.equipped)) {
        this.equipped = parsed.equipped;
      }
    } catch {
      // 壊れたデータは無視して初期値のまま使う
    }
  }

  private save(): void {
    const state: EquipmentState = { owned: this.getOwned(), equipped: this.equipped };
    localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(state));
  }

  /** 武器を入手する。初めて持つ武器は自動的に装備する */
  acquire(weaponId: WeaponId): void {
    const isFirst = this.owned.size === 0;
    this.owned.add(weaponId);
    if (isFirst) this.equipped = weaponId;
    this.save();
    this.notify();
  }

  equip(weaponId: WeaponId): void {
    if (!this.owned.has(weaponId)) return;
    this.equipped = weaponId;
    this.save();
    this.notify();
  }

  getOwned(): WeaponId[] {
    return Array.from(this.owned);
  }

  getEquipped(): WeaponId | null {
    return this.equipped;
  }

  /** 現在装備中の武器の攻撃力(未装備なら素手の攻撃力) */
  getDamage(): number {
    return WEAPON_DAMAGE[this.equipped ?? "fists"];
  }

  reset(): void {
    this.owned.clear();
    this.equipped = null;
    this.save();
    this.notify();
  }

  onChange(listener: Listener): void {
    this.listeners.push(listener);
    listener({ owned: this.getOwned(), equipped: this.equipped });
  }

  private notify(): void {
    const state: EquipmentState = { owned: this.getOwned(), equipped: this.equipped };
    for (const listener of this.listeners) listener(state);
  }
}
