import type { Inventory, ItemId } from "../systems/Inventory";
import { CYCLE_DURATION_MS } from "../systems/DayNightCycle";

export const SHOP_SELL_PRICES: Partial<Record<ItemId, number>> = {
  wood: 1,
  stone: 1,
  herb: 2,
  crop: 3,
  meat: 4,
  wheat: 5,
  cooked_meat: 7,
  fish: 6,
  milk: 6,
  tomato: 4,
  cooked_fish: 9,
  honey: 8,
  iron_ingot: 10,
  wool: 5,
};

const SELLABLE_ITEM_IDS = Object.keys(SHOP_SELL_PRICES) as ItemId[];

// 牧場物語風の「本日のおすすめ」。日替わりで1品だけ売値がアップする
export const DAILY_SPECIAL_MULTIPLIER = 1.5;

/** サーバー通信を増やさず全員で揃うよう、昼夜サイクルの1日単位でDate.now()から決定的に選ぶ */
export function getDailySpecialItem(nowMs: number): ItemId {
  const dayIndex = Math.floor(nowMs / CYCLE_DURATION_MS);
  const index = ((dayIndex % SELLABLE_ITEM_IDS.length) + SELLABLE_ITEM_IDS.length) % SELLABLE_ITEM_IDS.length;
  return SELLABLE_ITEM_IDS[index];
}

/** 本日のおすすめなら割増した売値、それ以外は通常の売値を返す。売却不可のアイテムは0 */
export function getEffectiveSellPrice(itemId: ItemId, nowMs: number): number {
  const base = SHOP_SELL_PRICES[itemId];
  if (base === undefined) return 0;
  if (itemId === getDailySpecialItem(nowMs)) {
    return Math.round(base * DAILY_SPECIAL_MULTIPLIER);
  }
  return base;
}

export const SHOP_BUY_PRICES: Partial<Record<ItemId, number>> = {
  seed: 2,
  seed_wheat: 3,
  seed_tomato: 4,
};

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
  totem: "🗿",
};

const NAME_BY_ITEM: Partial<Record<ItemId, string>> = {
  seed: "たね(にんじん)",
  seed_wheat: "たね(小麦)",
  seed_tomato: "たね(トマト)",
};

export type ShopPanelEvents = {
  onSell: (itemId: ItemId) => void;
  onBuy: (itemId: ItemId) => void;
};

/** マップ上のショップに近づいて話しかけると開くパネル。素材・作物・肉の売却と種の購入ができる */
export class ShopPanel {
  private panel: HTMLDivElement;
  private isOpen = false;
  private inventory: Inventory;
  private events: ShopPanelEvents;

  constructor(inventory: Inventory, events: ShopPanelEvents) {
    this.inventory = inventory;
    this.events = events;

    this.panel = document.createElement("div");
    this.panel.id = "shop-panel";
    this.panel.style.display = "none";
    document.body.appendChild(this.panel);

    inventory.onChange(() => this.render());
  }

  open(): void {
    this.isOpen = true;
    this.panel.style.display = "flex";
    this.render();
  }

  close(): void {
    this.isOpen = false;
    this.panel.style.display = "none";
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  private render(): void {
    if (!this.isOpen) return;

    const counts = this.inventory.getCounts();
    this.panel.innerHTML = "";

    const header = document.createElement("div");
    header.className = "shop-header";

    const title = document.createElement("h2");
    title.textContent = "ショップ";
    header.appendChild(title);

    const closeButton = document.createElement("button");
    closeButton.id = "shop-close";
    closeButton.textContent = "✕";
    closeButton.addEventListener("click", () => this.close());
    header.appendChild(closeButton);

    this.panel.appendChild(header);

    const sellHeading = document.createElement("div");
    sellHeading.className = "shop-section-heading";
    sellHeading.textContent = "売る";
    this.panel.appendChild(sellHeading);

    const now = Date.now();
    const specialItem = getDailySpecialItem(now);
    for (const [id] of Object.entries(SHOP_SELL_PRICES) as [ItemId, number][]) {
      const row = document.createElement("div");
      row.className = "shop-row";

      const isSpecial = id === specialItem;
      const price = getEffectiveSellPrice(id, now);

      const label = document.createElement("span");
      label.className = "shop-item-label";
      label.textContent = isSpecial
        ? `⭐ ${ICON_BY_ITEM[id]} ${counts[id]}個(💰${price}/個・本日のおすすめ!)`
        : `${ICON_BY_ITEM[id]} ${counts[id]}個(💰${price}/個)`;
      row.appendChild(label);

      const button = document.createElement("button");
      button.textContent = "売る";
      button.disabled = counts[id] <= 0;
      button.addEventListener("click", () => this.events.onSell(id));
      row.appendChild(button);

      this.panel.appendChild(row);
    }

    const buyHeading = document.createElement("div");
    buyHeading.className = "shop-section-heading";
    buyHeading.textContent = "買う";
    this.panel.appendChild(buyHeading);

    for (const [id, price] of Object.entries(SHOP_BUY_PRICES) as [ItemId, number][]) {
      const row = document.createElement("div");
      row.className = "shop-row";

      const label = document.createElement("span");
      label.className = "shop-item-label";
      label.textContent = `${ICON_BY_ITEM[id]} ${NAME_BY_ITEM[id] ?? id}(💰${price})`;
      row.appendChild(label);

      const button = document.createElement("button");
      button.textContent = "買う";
      button.disabled = counts.coin < price;
      button.addEventListener("click", () => this.events.onBuy(id));
      row.appendChild(button);

      this.panel.appendChild(row);
    }
  }
}
