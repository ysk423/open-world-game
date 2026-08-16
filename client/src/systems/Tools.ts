export type ToolId =
  | "axe"
  | "pickaxe"
  | "wateringCan"
  | "bicycle"
  | "handTorch"
  | "enderChest"
  | "shield"
  | "enderPearl";

const TOOLS_STORAGE_KEY = "open-world-game:tools";
const TOOL_IDS: ToolId[] = [
  "axe",
  "pickaxe",
  "wateringCan",
  "bicycle",
  "handTorch",
  "enderChest",
  "shield",
  "enderPearl",
];

type Listener = (owned: ReadonlySet<ToolId>) => void;

function isToolId(value: unknown): value is ToolId {
  return typeof value === "string" && (TOOL_IDS as string[]).includes(value);
}

/**
 * マインクラフトの斧・つるはし・たいまつや牧場物語のじょうろ、ポケモンの自転車を参考にした道具。
 * 武器と違って「装備」の概念はなく、一度作れば恒久的に効果を発揮する(斧→木材採集量アップ、
 * つるはし→石採集量アップ、じょうろ→畑に水をあげて成長を早める、自転車→スタミナを消費せずダッシュし
 * 続けられる、手持ちのたいまつ→夜、常にプレイヤーの周囲を照らす、エンダーチェスト→どこからでも倉庫を開ける、
 * 盾→Bキーを押している間、スタミナと引き換えにモンスターの接触ダメージを完全に防ぐ、
 * エンダーパール→右クリックした地点へコインを消費して瞬間移動できる)。
 */
export class Tools {
  private owned = new Set<ToolId>();
  private listeners: Listener[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(TOOLS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const toolId of parsed) {
          if (isToolId(toolId)) this.owned.add(toolId);
        }
      }
    } catch {
      // 壊れたデータは無視して初期値のまま使う
    }
  }

  private save(): void {
    localStorage.setItem(TOOLS_STORAGE_KEY, JSON.stringify(this.getOwned()));
  }

  acquire(toolId: ToolId): void {
    this.owned.add(toolId);
    this.save();
    this.notify();
  }

  has(toolId: ToolId): boolean {
    return this.owned.has(toolId);
  }

  getOwned(): ToolId[] {
    return Array.from(this.owned);
  }

  reset(): void {
    this.owned.clear();
    this.save();
    this.notify();
  }

  onChange(listener: Listener): void {
    this.listeners.push(listener);
    listener(this.owned);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.owned);
  }
}
