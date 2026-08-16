const HELP_ITEMS = [
  ["移動", "W / A / S / D または矢印キー"],
  ["アクション", "クリック、またはシフトキーで向いている方向に採集・攻撃・NPCと会話・畑の作業"],
  ["クラフト", "画面右下の🔨ボタンでメニューを開閉。武器を作ると⚔️装備パネルで切り替えられる"],
  ["回復", "HPが減っている時、体力表示の🌿回復ボタンで🌿を1つ消費して回復"],
  ["畑", "🌱の種をまいて時間が経つと🥕が収穫できる。種はショップで購入可能"],
  ["ショップ", "拠点周辺にある🏪に近づいて話しかけると開く。素材・作物・肉を💰に換金したり、種を購入できる"],
  ["動物・モンスター", "動物を倒すと🍖がドロップ。モンスターは💰を落とす。どちらもしばらくすると別の場所に再出現する"],
  ["採集", "木・岩・草は何度か採集すると枯れて姿を消すが、しばらくすると復活する"],
  ["探索", "とても広いマップです。自由に歩き回って探索しよう"],
  ["ルーラ", "Tキーで💰5を払い拠点(ベッド地点)へ瞬間移動(クールダウンあり)"],
  ["とくぎ", "Fキーでスタミナ30を消費し、近くのモンスターに通常の2倍のダメージ(クールダウンあり)"],
  ["ホイミ", "Hキーでスタミナ25を消費し、自分のHPを回復する呪文(クールダウンあり)"],
  ["エンダーチェスト", "クラフトすると、倉庫のそばにいなくても画面右の📦ボタンでどこからでも倉庫を開けるようになる"],
  ["弓", "装備すると、モンスターに離れた場所からでも攻撃できるようになる(通常の武器より間合いが広い)"],
  ["盾", "作ると、Bキーを押している間はスタミナと引き換えにモンスターの接触ダメージを完全に防げる"],
  ["エンダーパール", "作ると、右クリックした地点へコインを払って瞬間移動できる(届く距離には限りがある)"],
  ["コンパス", "作ると、画面左上に拠点(ベッド地点)への方角と距離がずっと表示されるようになる"],
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
