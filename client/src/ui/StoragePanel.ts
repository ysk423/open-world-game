import type { Inventory, ItemId } from "../systems/Inventory";
import type { Storage } from "../systems/Storage";

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

const STORABLE_ITEMS: ItemId[] = [
  "wood",
  "stone",
  "herb",
  "coin",
  "seed",
  "crop",
  "meat",
  "seed_wheat",
  "wheat",
  "cooked_meat",
  "fish",
];

export type StoragePanelEvents = {
  onDeposit: (itemId: ItemId) => void;
  onWithdraw: (itemId: ItemId) => void;
};

/**
 * マップ上の倉庫(storage_shed)に近づいて話しかけると開くパネル。
 * 持ち物を倉庫に預ける/倉庫から引き出すことができる。倉庫の中身は「ゲームをリセット」
 * しても消えない個人の保管庫として扱う(Storageクラス側の仕様)。
 */
export class StoragePanel {
  private panel: HTMLDivElement;
  private isOpen = false;
  private inventory: Inventory;
  private storage: Storage;
  private events: StoragePanelEvents;

  constructor(inventory: Inventory, storage: Storage, events: StoragePanelEvents) {
    this.inventory = inventory;
    this.storage = storage;
    this.events = events;

    this.panel = document.createElement("div");
    this.panel.id = "storage-panel";
    this.panel.style.display = "none";
    document.body.appendChild(this.panel);

    inventory.onChange(() => this.render());
    storage.onChange(() => this.render());
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

    const invCounts = this.inventory.getCounts();
    const storeCounts = this.storage.getCounts();
    this.panel.innerHTML = "";

    const header = document.createElement("div");
    header.className = "shop-header";

    const title = document.createElement("h2");
    title.textContent = "倉庫";
    header.appendChild(title);

    const closeButton = document.createElement("button");
    closeButton.id = "storage-close";
    closeButton.textContent = "✕";
    closeButton.addEventListener("click", () => this.close());
    header.appendChild(closeButton);

    this.panel.appendChild(header);

    const depositHeading = document.createElement("div");
    depositHeading.className = "shop-section-heading";
    depositHeading.textContent = "しまう(持ち物 → 倉庫)";
    this.panel.appendChild(depositHeading);

    for (const id of STORABLE_ITEMS) {
      const row = document.createElement("div");
      row.className = "shop-row";

      const label = document.createElement("span");
      label.className = "shop-item-label";
      label.textContent = `${ICON_BY_ITEM[id]} 持ち物${invCounts[id]} → 倉庫${storeCounts[id]}`;
      row.appendChild(label);

      const button = document.createElement("button");
      button.textContent = "しまう";
      button.disabled = invCounts[id] <= 0;
      button.addEventListener("click", () => this.events.onDeposit(id));
      row.appendChild(button);

      this.panel.appendChild(row);
    }

    const withdrawHeading = document.createElement("div");
    withdrawHeading.className = "shop-section-heading";
    withdrawHeading.textContent = "取り出す(倉庫 → 持ち物)";
    this.panel.appendChild(withdrawHeading);

    for (const id of STORABLE_ITEMS) {
      const row = document.createElement("div");
      row.className = "shop-row";

      const label = document.createElement("span");
      label.className = "shop-item-label";
      label.textContent = `${ICON_BY_ITEM[id]} 倉庫${storeCounts[id]}`;
      row.appendChild(label);

      const button = document.createElement("button");
      button.textContent = "取り出す";
      button.disabled = storeCounts[id] <= 0;
      button.addEventListener("click", () => this.events.onWithdraw(id));
      row.appendChild(button);

      this.panel.appendChild(row);
    }
  }
}
