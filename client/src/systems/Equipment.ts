export type WeaponId = "wooden_sword" | "stone_sword" | "bow" | "iron_sword";

const EQUIPMENT_STORAGE_KEY = "open-world-game:equipment";

export const WEAPON_DAMAGE: Record<"fists" | WeaponId, number> = {
  fists: 1,
  wooden_sword: 2,
  stone_sword: 3,
  bow: 2,
  iron_sword: 4,
};

export const WEAPON_NAME: Record<WeaponId, string> = {
  wooden_sword: "木の剣",
  stone_sword: "石の剣",
  bow: "弓",
  iron_sword: "鉄の剣",
};

// マインクラフトの弓を参考に、弓を装備している間はモンスターへの間合いが伸びる
export const BOW_REACH_MULTIPLIER = 2;

const WEAPON_IDS: WeaponId[] = ["wooden_sword", "stone_sword", "bow", "iron_sword"];

// マインクラフト風の防具。攻撃を受けた時に一定確率でダメージを完全に防ぐ
export type ArmorId = "leather_armor" | "iron_armor";

export const ARMOR_NAME: Record<ArmorId, string> = {
  leather_armor: "革の鎧",
  iron_armor: "鉄の鎧",
};

export const ARMOR_BLOCK_CHANCE: Record<ArmorId, number> = {
  leather_armor: 0.15,
  iron_armor: 0.3,
};

// マインクラフト風の「棘の鎧」エンチャントを参考に、攻撃を受けた時に一定確率でモンスターに反撃ダメージを与える
export const ARMOR_THORNS_CHANCE: Record<ArmorId, number> = {
  leather_armor: 0.1,
  iron_armor: 0.2,
};
export const THORNS_DAMAGE = 1;

const ARMOR_IDS: ArmorId[] = ["leather_armor", "iron_armor"];

export type EquipmentState = {
  owned: WeaponId[];
  equipped: WeaponId | null;
  ownedArmor: ArmorId[];
  equippedArmor: ArmorId | null;
};

type Listener = (state: Readonly<EquipmentState>) => void;

function isWeaponId(value: unknown): value is WeaponId {
  return typeof value === "string" && (WEAPON_IDS as string[]).includes(value);
}

function isArmorId(value: unknown): value is ArmorId {
  return typeof value === "string" && (ARMOR_IDS as string[]).includes(value);
}

/** 個人の武器の所持・装備状態。localStorageに永続化される(持ち物・体力と同様に個人のみ) */
export class Equipment {
  private owned = new Set<WeaponId>();
  private equipped: WeaponId | null = null;
  private ownedArmor = new Set<ArmorId>();
  private equippedArmor: ArmorId | null = null;
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
      if (Array.isArray(parsed.ownedArmor)) {
        for (const armorId of parsed.ownedArmor) {
          if (isArmorId(armorId)) this.ownedArmor.add(armorId);
        }
      }
      if (isArmorId(parsed.equippedArmor)) {
        this.equippedArmor = parsed.equippedArmor;
      }
    } catch {
      // 壊れたデータは無視して初期値のまま使う
    }
  }

  private save(): void {
    const state = this.getState();
    localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(state));
  }

  private getState(): EquipmentState {
    return {
      owned: this.getOwned(),
      equipped: this.equipped,
      ownedArmor: this.getOwnedArmor(),
      equippedArmor: this.equippedArmor,
    };
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

  /** 防具を入手する。初めて持つ防具は自動的に装備する */
  acquireArmor(armorId: ArmorId): void {
    const isFirst = this.ownedArmor.size === 0;
    this.ownedArmor.add(armorId);
    if (isFirst) this.equippedArmor = armorId;
    this.save();
    this.notify();
  }

  equipArmor(armorId: ArmorId): void {
    if (!this.ownedArmor.has(armorId)) return;
    this.equippedArmor = armorId;
    this.save();
    this.notify();
  }

  getOwnedArmor(): ArmorId[] {
    return Array.from(this.ownedArmor);
  }

  getEquippedArmor(): ArmorId | null {
    return this.equippedArmor;
  }

  /** 現在装備中の防具が攻撃を防ぐ確率(未装備なら0) */
  getBlockChance(): number {
    return this.equippedArmor ? ARMOR_BLOCK_CHANCE[this.equippedArmor] : 0;
  }

  /** 現在装備中の防具が反撃ダメージを与える確率(未装備なら0) */
  getThornsChance(): number {
    return this.equippedArmor ? ARMOR_THORNS_CHANCE[this.equippedArmor] : 0;
  }

  reset(): void {
    this.owned.clear();
    this.equipped = null;
    this.ownedArmor.clear();
    this.equippedArmor = null;
    this.save();
    this.notify();
  }

  onChange(listener: Listener): void {
    this.listeners.push(listener);
    listener(this.getState());
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) listener(state);
  }
}
