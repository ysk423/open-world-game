import type { Stats, StatsSnapshot } from "../systems/Stats";
import type { Experience } from "../systems/Experience";
import type { ItemId } from "../systems/Inventory";
import { ACHIEVEMENTS } from "../systems/Achievements";

const ICON_BY_ITEM: Record<ItemId, string> = {
  wood: "🪵",
  stone: "🪨",
  herb: "🌿",
  coin: "💰",
  seed: "🌱",
  crop: "🥕",
  meat: "🍖",
  seed_wheat: "🌾",
  wheat: "🍞",
  cooked_meat: "🍗",
  fish: "🐟",
  milk: "🥛",
  seed_tomato: "🌱",
  tomato: "🍅",
  cooked_fish: "🍢",
  honey: "🍯",
  iron_ingot: "🔩",
  wool: "🧶",
};

const GATHERABLE_ITEMS: ItemId[] = ["wood", "stone", "herb", "seed_wheat", "wheat", "fish", "milk", "tomato"];

/** 画面右上の「📖 図鑑」ボタンで開閉するパネル。ポケモン図鑑を参考にした生涯累計の記録と実績を表示する */
export class StatsPanel {
  private toggleButton: HTMLButtonElement;
  private panel: HTMLDivElement;
  private isOpen = false;
  private experience: Experience;
  private latestSnapshot: Readonly<StatsSnapshot> | null = null;

  constructor(stats: Stats, experience: Experience) {
    this.experience = experience;

    this.toggleButton = document.createElement("button");
    this.toggleButton.id = "stats-toggle";
    this.toggleButton.textContent = "📖 図鑑";
    this.toggleButton.addEventListener("click", () => this.setOpen(!this.isOpen));
    document.body.appendChild(this.toggleButton);

    this.panel = document.createElement("div");
    this.panel.id = "stats-panel";
    this.panel.style.display = "none";
    document.body.appendChild(this.panel);

    stats.onChange((snapshot) => {
      this.latestSnapshot = snapshot;
      this.render(snapshot);
    });
    experience.onChange(() => {
      if (this.latestSnapshot) this.render(this.latestSnapshot);
    });
  }

  private setOpen(open: boolean): void {
    this.isOpen = open;
    this.panel.style.display = open ? "flex" : "none";
  }

  private render(snapshot: Readonly<StatsSnapshot>): void {
    this.panel.innerHTML = "";

    const title = document.createElement("h2");
    title.textContent = "図鑑(生涯累計)";
    this.panel.appendChild(title);

    for (const itemId of GATHERABLE_ITEMS) {
      const row = document.createElement("div");
      row.className = "stats-row";
      row.textContent = `${ICON_BY_ITEM[itemId]} 累計採集: ${snapshot.itemsGathered[itemId]}`;
      this.panel.appendChild(row);
    }

    const monsterRow = document.createElement("div");
    monsterRow.className = "stats-row";
    monsterRow.textContent = `👹 モンスター討伐: ${snapshot.monstersDefeated}(★レア${snapshot.rareMonstersDefeated})`;
    this.panel.appendChild(monsterRow);

    const animalRow = document.createElement("div");
    animalRow.className = "stats-row";
    animalRow.textContent = `🐾 動物討伐: ${snapshot.animalsDefeated}`;
    this.panel.appendChild(animalRow);

    const friendRow = document.createElement("div");
    friendRow.className = "stats-row";
    friendRow.textContent = `💛 動物となかよく: ${snapshot.animalsBefriended}`;
    this.panel.appendChild(friendRow);

    const chestRow = document.createElement("div");
    chestRow.className = "stats-row";
    chestRow.textContent = `🎁 宝箱を開けた数: ${snapshot.chestsOpened}`;
    this.panel.appendChild(chestRow);

    const bossRow = document.createElement("div");
    bossRow.className = "stats-row";
    bossRow.textContent = `👑 ボス討伐: ${snapshot.bossesDefeated}`;
    this.panel.appendChild(bossRow);

    const giftRow = document.createElement("div");
    giftRow.className = "stats-row";
    giftRow.textContent = `🎀 NPCへの贈り物: ${snapshot.giftsGiven}`;
    this.panel.appendChild(giftRow);

    const level = this.experience.getLevel();
    const unlockedCount = ACHIEVEMENTS.filter((a) => a.isUnlocked(snapshot, level)).length;

    const achievementsTitle = document.createElement("h2");
    achievementsTitle.textContent = `実績(${unlockedCount}/${ACHIEVEMENTS.length})`;
    this.panel.appendChild(achievementsTitle);

    for (const achievement of ACHIEVEMENTS) {
      const unlocked = achievement.isUnlocked(snapshot, level);
      const row = document.createElement("div");
      row.className = unlocked ? "stats-row achievement-unlocked" : "stats-row achievement-locked";
      row.textContent = unlocked ? `${achievement.icon} ${achievement.name}` : `🔒 ???`;
      this.panel.appendChild(row);
    }
  }
}
