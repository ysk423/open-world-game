import { SAVE_SLOT_COUNT, loadSlot } from "../systems/SaveSlots";
import { parseImportFile, type ExportedSaveFile } from "../systems/ExportImport";

export type DataManagementPanelEvents = {
  onExport: (slot: number) => void;
  onImport: (slot: number, data: ExportedSaveFile) => void;
};

function formatSavedAt(savedAt: number): string {
  const d = new Date(savedAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 画面右上の「🗂 データ管理」ボタンで開閉するパネル。スロットのセーブデータをファイルへ書き出し/読み込みする */
export class DataManagementPanel {
  private toggleButton: HTMLButtonElement;
  private panel: HTMLDivElement;
  private isOpen = false;
  private rows: { label: HTMLSpanElement; exportButton: HTMLButtonElement }[] = [];
  private pendingImport: ExportedSaveFile | null = null;
  private slotSelect: HTMLSelectElement;
  private importButton: HTMLButtonElement;

  constructor(events: DataManagementPanelEvents) {
    this.toggleButton = document.createElement("button");
    this.toggleButton.id = "data-toggle";
    this.toggleButton.textContent = "🗂 データ管理";
    this.toggleButton.addEventListener("click", () => this.setOpen(!this.isOpen));
    document.body.appendChild(this.toggleButton);

    this.panel = document.createElement("div");
    this.panel.id = "data-panel";
    this.panel.style.display = "none";

    const heading = document.createElement("h2");
    heading.textContent = "データ管理";
    this.panel.appendChild(heading);

    const exportHeading = document.createElement("h3");
    exportHeading.textContent = "エクスポート";
    this.panel.appendChild(exportHeading);

    for (let slot = 1; slot <= SAVE_SLOT_COUNT; slot++) {
      const row = document.createElement("div");
      row.className = "save-slot-row";

      const label = document.createElement("span");
      label.className = "save-slot-label";
      row.appendChild(label);

      const exportButton = document.createElement("button");
      exportButton.textContent = "⬇ エクスポート";
      exportButton.addEventListener("click", () => {
        if (exportButton.disabled) return;
        events.onExport(slot);
      });
      row.appendChild(exportButton);

      this.panel.appendChild(row);
      this.rows.push({ label, exportButton });
      this.refreshSlot(slot);
    }

    const importHeading = document.createElement("h3");
    importHeading.textContent = "インポート";
    this.panel.appendChild(importHeading);

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "application/json";
    fileInput.id = "data-import-file";
    this.panel.appendChild(fileInput);

    const importRow = document.createElement("div");
    importRow.className = "save-slot-row";

    this.slotSelect = document.createElement("select");
    for (let slot = 1; slot <= SAVE_SLOT_COUNT; slot++) {
      const option = document.createElement("option");
      option.value = String(slot);
      option.textContent = `スロット${slot}`;
      this.slotSelect.appendChild(option);
    }
    importRow.appendChild(this.slotSelect);

    this.importButton = document.createElement("button");
    this.importButton.textContent = "⬆ インポート実行";
    this.importButton.disabled = true;
    this.importButton.addEventListener("click", () => {
      if (!this.pendingImport) return;
      const slot = Number(this.slotSelect.value);
      const confirmed = window.confirm(
        `スロット${slot}にインポートします。拠点の建物(全員分)と自分の持ち物・HPが上書きされます。よろしいですか?`,
      );
      if (!confirmed) return;
      events.onImport(slot, this.pendingImport);
      this.pendingImport = null;
      this.importButton.disabled = true;
      fileInput.value = "";
    });
    importRow.appendChild(this.importButton);

    this.panel.appendChild(importRow);

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      this.pendingImport = null;
      this.importButton.disabled = true;
      if (!file) return;
      void file.text().then((raw) => {
        const data = parseImportFile(raw);
        if (!data) {
          window.alert("セーブファイルの読み込みに失敗しました。ファイルが壊れているか、対応していない形式です。");
          fileInput.value = "";
          return;
        }
        this.pendingImport = data;
        this.importButton.disabled = false;
        if (data.slot >= 1 && data.slot <= SAVE_SLOT_COUNT) {
          this.slotSelect.value = String(data.slot);
        }
      });
    });

    document.body.appendChild(this.panel);
  }

  private refreshSlot(slot: number): void {
    const data = loadSlot(slot);
    const { label, exportButton } = this.rows[slot - 1];
    label.textContent = data ? `スロット${slot}: ${formatSavedAt(data.savedAt)}保存` : `スロット${slot}: 空き`;
    exportButton.disabled = !data;
  }

  private setOpen(open: boolean): void {
    this.isOpen = open;
    if (open) {
      for (let slot = 1; slot <= SAVE_SLOT_COUNT; slot++) this.refreshSlot(slot);
    }
    this.panel.style.display = open ? "flex" : "none";
  }
}
