export type MenuHubEntry = {
  icon: string;
  label: string;
  open: () => void;
  close: () => void;
  isVisible?: () => boolean;
};

type HubState = "closed" | "hub" | "entry";

/**
 * 画面右上に並んでいた複数のトグルボタン(クラフト・装備・図鑑・操作方法・セーブ/ロード・
 * データ管理・エンダーチェスト)を、スマホでの占有面積を減らすため単一の入り口にまとめた
 * 階層メニュー。ボタン1つで「閉じる → 一覧 → 個別パネル」を行き来する
 */
export class MenuHub {
  private toggleButton: HTMLButtonElement;
  private hubPanel: HTMLDivElement;
  private entries: MenuHubEntry[];
  private state: HubState = "closed";
  private activeEntry: MenuHubEntry | null = null;

  constructor(entries: MenuHubEntry[]) {
    this.entries = entries;

    this.toggleButton = document.createElement("button");
    this.toggleButton.id = "menu-toggle";
    this.toggleButton.addEventListener("click", () => this.handleToggleClick());
    document.body.appendChild(this.toggleButton);

    this.hubPanel = document.createElement("div");
    this.hubPanel.id = "menu-hub-panel";
    this.hubPanel.style.display = "none";
    document.body.appendChild(this.hubPanel);

    this.updateToggleLabel();
  }

  private handleToggleClick(): void {
    if (this.state === "entry") {
      this.activeEntry?.close();
      this.activeEntry = null;
      this.openHub();
      return;
    }
    if (this.state === "hub") {
      this.closeAll();
      return;
    }
    this.openHub();
  }

  private openHub(): void {
    this.state = "hub";
    this.render();
    this.hubPanel.style.display = "flex";
    this.updateToggleLabel();
  }

  private closeAll(): void {
    this.state = "closed";
    this.activeEntry?.close();
    this.activeEntry = null;
    this.hubPanel.style.display = "none";
    this.updateToggleLabel();
  }

  private updateToggleLabel(): void {
    this.toggleButton.textContent =
      this.state === "closed" ? "☰ メニュー" : this.state === "hub" ? "✕ 閉じる" : "← 戻る";
  }

  private render(): void {
    this.hubPanel.innerHTML = "";

    const title = document.createElement("h2");
    title.textContent = "メニュー";
    this.hubPanel.appendChild(title);

    for (const entry of this.entries) {
      if (entry.isVisible && !entry.isVisible()) continue;
      const button = document.createElement("button");
      button.className = "menu-hub-entry";
      button.textContent = `${entry.icon} ${entry.label}`;
      button.addEventListener("click", () => {
        this.state = "entry";
        this.activeEntry = entry;
        this.hubPanel.style.display = "none";
        entry.open();
        this.updateToggleLabel();
      });
      this.hubPanel.appendChild(button);
    }
  }
}
