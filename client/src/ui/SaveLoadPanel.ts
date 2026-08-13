import { SAVE_SLOT_COUNT, loadSlot } from "../systems/SaveSlots";

export type SaveLoadPanelEvents = {
  onSave: (slot: number) => void;
  onLoad: (slot: number) => void;
  onDelete: (slot: number) => void;
};

function formatSavedAt(savedAt: number): string {
  const d = new Date(savedAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 画面右上の「💾 セーブ/ロード」ボタンで開閉するパネル。拠点の建物(共有)と持ち物・HP(個人)をまとめてスロットに保存する */
export class SaveLoadPanel {
  private toggleButton: HTMLButtonElement;
  private panel: HTMLDivElement;
  private isOpen = false;
  private rows: { label: HTMLSpanElement; loadButton: HTMLButtonElement; deleteButton: HTMLButtonElement }[] = [];

  constructor(events: SaveLoadPanelEvents) {
    this.toggleButton = document.createElement("button");
    this.toggleButton.id = "save-toggle";
    this.toggleButton.textContent = "💾 セーブ/ロード";
    this.toggleButton.addEventListener("click", () => this.setOpen(!this.isOpen));
    document.body.appendChild(this.toggleButton);

    this.panel = document.createElement("div");
    this.panel.id = "save-panel";
    this.panel.style.display = "none";

    const heading = document.createElement("h2");
    heading.textContent = "セーブ/ロード";
    this.panel.appendChild(heading);

    for (let slot = 1; slot <= SAVE_SLOT_COUNT; slot++) {
      const row = document.createElement("div");
      row.className = "save-slot-row";

      const label = document.createElement("span");
      label.className = "save-slot-label";
      row.appendChild(label);

      const saveButton = document.createElement("button");
      saveButton.textContent = "💾 セーブ";
      saveButton.addEventListener("click", () => {
        events.onSave(slot);
        this.refreshSlot(slot);
      });
      row.appendChild(saveButton);

      const loadButton = document.createElement("button");
      loadButton.textContent = "⏪ ロード";
      loadButton.addEventListener("click", () => {
        if (loadButton.disabled) return;
        const confirmed = window.confirm(
          `スロット${slot}をロードします。拠点の建物(全員分)と自分の持ち物・HPが上書きされます。よろしいですか?`,
        );
        if (confirmed) events.onLoad(slot);
      });
      row.appendChild(loadButton);

      const deleteButton = document.createElement("button");
      deleteButton.className = "save-delete-button";
      deleteButton.textContent = "🗑 削除";
      deleteButton.addEventListener("click", () => {
        if (deleteButton.disabled) return;
        const confirmed = window.confirm(`スロット${slot}のセーブデータを削除します。よろしいですか?`);
        if (!confirmed) return;
        events.onDelete(slot);
        this.refreshSlot(slot);
      });
      row.appendChild(deleteButton);

      this.panel.appendChild(row);
      this.rows.push({ label, loadButton, deleteButton });
      this.refreshSlot(slot);
    }

    document.body.appendChild(this.panel);
  }

  private refreshSlot(slot: number): void {
    const data = loadSlot(slot);
    const { label, loadButton, deleteButton } = this.rows[slot - 1];
    label.textContent = data ? `スロット${slot}: ${formatSavedAt(data.savedAt)}保存` : `スロット${slot}: 空き`;
    loadButton.disabled = !data;
    deleteButton.disabled = !data;
  }

  private setOpen(open: boolean): void {
    this.isOpen = open;
    this.panel.style.display = open ? "flex" : "none";
  }
}
