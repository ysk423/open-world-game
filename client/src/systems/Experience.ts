type Listener = (level: number, exp: number, expToNextLevel: number) => void;

const EXPERIENCE_STORAGE_KEY = "open-world-game:experience";

const MAX_LEVEL = 20;

/** レベルNに上がるために必要な累計経験値(ドラクエのような右肩上がりの成長曲線) */
function expForLevel(level: number): number {
  return Math.round(10 * level * level);
}

/**
 * ドラクエを参考にした経験値・レベルシステム。モンスターや動物を倒すと貯まり、
 * レベルアップで最大HPと攻撃力が少しずつ上がる。個人のものなのでlocalStorageに永続化する。
 */
export class Experience {
  private level = 1;
  private exp = 0;
  private listeners: Listener[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(EXPERIENCE_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { level?: number; exp?: number };
      if (typeof parsed.level === "number" && Number.isInteger(parsed.level) && parsed.level >= 1) {
        this.level = Math.min(parsed.level, MAX_LEVEL);
      }
      if (typeof parsed.exp === "number" && Number.isFinite(parsed.exp) && parsed.exp >= 0) {
        this.exp = parsed.exp;
      }
    } catch {
      // 壊れたデータは無視して初期値のまま使う
    }
  }

  private save(): void {
    localStorage.setItem(EXPERIENCE_STORAGE_KEY, JSON.stringify({ level: this.level, exp: this.exp }));
  }

  /** 経験値を加算する。レベルが上がった場合は上がった後のレベルを返す(上がらなければnull) */
  add(amount: number): number | null {
    if (this.level >= MAX_LEVEL) return null;

    this.exp += amount;
    let leveledUp = false;
    while (this.level < MAX_LEVEL && this.exp >= expForLevel(this.level + 1)) {
      this.level += 1;
      leveledUp = true;
    }

    this.save();
    this.notify();
    return leveledUp ? this.level : null;
  }

  reset(): void {
    this.level = 1;
    this.exp = 0;
    this.save();
    this.notify();
  }

  getLevel(): number {
    return this.level;
  }

  getExp(): number {
    return this.exp;
  }

  /** 次のレベルまでに必要な累計経験値。最大レベルならnull */
  getExpToNextLevel(): number | null {
    return this.level >= MAX_LEVEL ? null : expForLevel(this.level + 1);
  }

  /** レベルに応じた最大HPの上乗せ分(4レベルごとに+1) */
  getBonusMaxHp(): number {
    return Math.floor(this.level / 4);
  }

  /** レベルに応じた追加攻撃力(装備している武器の攻撃力に加算する) */
  getBonusDamage(): number {
    return Math.floor(this.level / 5);
  }

  onChange(listener: Listener): void {
    this.listeners.push(listener);
    listener(this.level, this.exp, this.getExpToNextLevel() ?? 0);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.level, this.exp, this.getExpToNextLevel() ?? 0);
  }
}
