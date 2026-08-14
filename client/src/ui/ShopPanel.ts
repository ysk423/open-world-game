import type { Inventory, ItemId } from "../systems/Inventory";

export const SHOP_SELL_PRICES: Partial<Record<ItemId, number>> = {
  wood: 1,
  stone: 1,
  herb: 2,
  crop: 3,
  meat: 4,
  wheat: 5,
  cooked_meat: 7,
};

export const SHOP_BUY_PRICES: Partial<Record<ItemId, number>> = {
  seed: 2,
  seed_wheat: 3,
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
};

const NAME_BY_ITEM: Partial<Record<ItemId, string>> = {
  seed: "たね(にんじん)",
  seed_wheat: "たね(小麦)",
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

    for (const [id, price] of Object.entries(SHOP_SELL_PRICES) as [ItemId, number][]) {
      const row = document.createElement("div");
      row.className = "shop-row";

      const label = document.createElement("span");
      label.className = "shop-item-label";
      label.textContent = `${ICON_BY_ITEM[id]} ${counts[id]}個(💰${price}/個)`;
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
