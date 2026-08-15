export type ToolId = "axe" | "pickaxe" | "wateringCan";

const TOOLS_STORAGE_KEY = "open-world-game:tools";
const TOOL_IDS: ToolId[] = ["axe", "pickaxe", "wateringCan"];

type Listener = (owned: ReadonlySet<ToolId>) => void;

function isToolId(value: unknown): value is ToolId {
  return typeof value === "string" && (TOOL_IDS as string[]).includes(value);
}

/**
 * マインクラフトの斧・つるはしや牧場物語のじょうろを参考にした道具。武器と違って「装備」の
 * 概念はなく、一度作れば恒久的に効果を発揮する(斧→木材採集量アップ、つるはし→石採集量アップ、
 * じょうろ→畑に水をあげて成長を早める)。
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
