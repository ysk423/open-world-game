const HELP_ITEMS = [
  ["移動", "W / A / S / D または矢印キー"],
  ["アクション", "クリックで採集・攻撃・NPCと会話"],
  ["クラフト", "画面右下の🔨ボタンでメニューを開閉"],
  ["探索", "とても広いマップです。自由に歩き回って探索しよう"],
];

/** 画面右上の「?」ボタンで操作方法を一時的に表示するパネル */
export class HelpPanel {
  private toggleButton: HTMLButtonElement;
  private panel: HTMLDivElement;
  private isOpen = false;

  constructor() {
    this.toggleButton = document.createElement("button");
    this.toggleButton.id = "help-toggle";
    this.toggleButton.textContent = "❓ 操作方法";
    this.toggleButton.addEventListener("click", () => this.setOpen(!this.isOpen));
    document.body.appendChild(this.toggleButton);

    this.panel = document.createElement("div");
    this.panel.id = "help-panel";
    this.panel.style.display = "none";
    this.panel.innerHTML = `
      <h2>操作方法</h2>
      ${HELP_ITEMS.map(
        ([label, desc]) => `<div class="help-row"><span class="help-label">${label}</span><span class="help-desc">${desc}</span></div>`,
      ).join("")}
    `;
    document.body.appendChild(this.panel);
  }

  private setOpen(open: boolean): void {
    this.isOpen = open;
    this.panel.style.display = open ? "flex" : "none";
  }
}
