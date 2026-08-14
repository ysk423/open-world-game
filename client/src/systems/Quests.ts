import type { ItemId } from "./Inventory";

export type QuestDef = {
  npcName: string;
  requestItem: ItemId;
  requestAmount: number;
  rewardCoin: number;
  rewardExp: number;
  askDialogue: string;
  completeDialogue: string;
  thanksDialogue: string;
};

// ドラクエ/牧場物語のNPCからの「お使い」を参考にした簡易クエスト(NPC名で紐づける)
export const QUESTS: QuestDef[] = [
  {
    npcName: "ミナ",
    requestItem: "herb",
    requestAmount: 3,
    rewardCoin: 10,
    rewardExp: 6,
    askDialogue: "🌿ハーブを3個持ってきてくれない?お礼をするわ。",
    completeDialogue: "ありがとう!これはお礼よ。",
    thanksDialogue: "この前は助かったわ、ありがとう。",
  },
  {
    npcName: "ケン",
    requestItem: "wood",
    requestAmount: 5,
    rewardCoin: 10,
    rewardExp: 6,
    askDialogue: "🪵木材を5個集めてきてくれないか?お礼はするよ。",
    completeDialogue: "助かったよ、これを受け取ってくれ!",
    thanksDialogue: "この前の木材、役に立ってるよ。",
  },
];

export function getQuestForNpc(npcName: string): QuestDef | undefined {
  return QUESTS.find((q) => q.npcName === npcName);
}

const QUEST_STORAGE_KEY = "open-world-game:quests";

type Listener = (completed: ReadonlySet<string>) => void;

/** NPC依頼の達成状況(NPC名の集合)。個人のものなのでlocalStorageに永続化する */
export class Quests {
  private completed = new Set<string>();
  private listeners: Listener[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(QUEST_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const npcName of parsed) {
          if (typeof npcName === "string") this.completed.add(npcName);
        }
      }
    } catch {
      // 壊れたデータは無視して初期値のまま使う
    }
  }

  private save(): void {
    localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(Array.from(this.completed)));
  }

  isCompleted(npcName: string): boolean {
    return this.completed.has(npcName);
  }

  complete(npcName: string): void {
    this.completed.add(npcName);
    this.save();
    this.notify();
  }

  reset(): void {
    this.completed.clear();
    this.save();
    this.notify();
  }

  onChange(listener: Listener): void {
    this.listeners.push(listener);
    listener(this.completed);
  }

  private notify(): void {
    for (const listener of this.listeners) listener(this.completed);
  }
}
