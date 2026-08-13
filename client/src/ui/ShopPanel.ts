import type { Inventory, ItemId } from "../systems/Inventory";

export const SHOP_SELL_PRICES: Partial<Record<ItemId, number>> = {
  wood: 1,
  stone: 1,
  herb: 2,
  crop: 3,
};

export const SHOP_BUY_PRICES: Partial<Record<ItemId, number>> = {
  seed: 2,
};

const ICON_BY_ITEM: Record<ItemId, string> = {
  wood: "🪵",
  stone: "🪨",
  herb: "🌿",
  coin: "💰",
  seed: "🌱",
  crop: "🥕",
};

const NAME_BY_ITEM: Partial<Record<ItemId, string>> = {
  seed: "たね",
};

export type ShopPanelEvents = {
  onSell: (itemId: ItemId) => void;
  onBuy: (itemId: ItemId) => void;
};

/** 画面右下の「🏪 ショップ」ボタンで開閉するパネル。素材・作物の売却と種の購入ができる */
export class ShopPanel {
  private toggleButton: HTMLButtonElement;
  private panel: HTMLDivElement;
  private isOpen = false;
  private inventory: Inventory;
  private events: ShopPanelEvents;

  constructor(inventory: Inventory, events: ShopPanelEvents) {
    this.inventory = inventory;
    this.events = events;

    this.toggleButton = document.createElement("button");
    this.toggleButton.id = "shop-toggle";
    this.toggleButton.textContent = "🏪 ショップ";
    this.toggleButton.addEventListener("click", () => this.setOpen(!this.isOpen));
    document.body.appendChild(this.toggleButton);

    this.panel = document.createElement("div");
    this.panel.id = "shop-panel";
    this.panel.style.display = "none";
    document.body.appendChild(this.panel);

    inventory.onChange(() => this.render());
  }

  private setOpen(open: boolean): void {
    this.isOpen = open;
    this.panel.style.display = open ? "flex" : "none";
    this.render();
  }

  private render(): void {
    if (!this.isOpen) return;

    const counts = this.inventory.getCounts();
    this.panel.innerHTML = "";

    const title = document.createElement("h2");
    title.textContent = "ショップ";
    this.panel.appendChild(title);

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
