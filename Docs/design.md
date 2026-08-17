# 設計ドキュメント — SURVIVE(みんなで生き延びる2Dドット絵オープンワールド)

このドキュメントは現在の実装をベースにした技術設計のまとめです。企画背景や機能仕様は [spec.md](./spec.md) を参照してください。

最終更新時点のステータス: 当初のMVP計画(フェーズ0〜5)は完了・本番デプロイ済み。以後はMVP対象外だった機能を中心に多数の追加実装が進んでいる(詳細は spec.md 参照)。

---

## 1. アーキテクチャ概要

```
[ブラウザ クライアント]                    [Cloudflare]
 Phaser 3 + TypeScript (Vite)             Workers + Durable Objects
        |                                        |
   Cloudflare Pages          <--WebSocket-->     1ルーム("main"固定)
   (静的ホスティング)         partysocket/partyserver  = 1 Durable Object
```

- クライアント: Phaser 3(TypeScript)。単一の連続ワールドマップ(Tiled JSON)を読み込む。
- サーバー: Cloudflare Workers上のDurable Objects。`partyserver`ライブラリを利用し、1つのDurable Object("Room")がプレイヤー位置と拠点の建物配置を保持する。
- ルームIDは実質固定(`"main"`)で、全プレイヤーが同じ1つの世界を共有する(部屋を選ぶUIはない)。
- クライアント: Cloudflare Pages、サーバー: Cloudflare Workersにデプロイ。ともに無料枠内。

### 本番環境

- サーバー(Workers): `https://open-world-game-server.ysk-ino-123.workers.dev`
- クライアント(Pages): `https://open-world-game-dxu.pages.dev`
- クライアントは`main`ブランチへのpushでCloudflare Pagesが自動ビルド・デプロイ(ビルドコマンド`npm install && npm run build`、出力`dist`、環境変数`VITE_ROOM_SERVER_HOST=open-world-game-server.ysk-ino-123.workers.dev`)。サーバーはGit連携なしで`cd server && npm run deploy`(`wrangler deploy`)による手動デプロイ。

### ローカル開発

```bash
# サーバー(別ターミナル)
cd server
npm install
npm run dev      # http://127.0.0.1:8787

# クライアント(別ターミナル)
cd client
npm install
npm run dev       # http://localhost:5173
```

`http://localhost:5173`を開き、名前を入力して参加するとゲームが始まる。別タブ/別ウィンドウを開くと最大4人でのマルチプレイを確認できる。ビルド・型チェックは`cd client && npm run build`(tsc+vite build)、`cd server && npm run typecheck`(tsc --noEmit)。

---

## 2. 技術スタック

| レイヤー | 技術 | 備考 |
|---|---|---|
| ゲームエンジン | Phaser 3 | TypeScript |
| ビルドツール | Vite | クライアント側 |
| マルチプレイサーバー | Cloudflare Workers + Durable Objects(`partyserver`) | 1ルーム("main")= 1 Durable Object |
| 通信方式 | WebSocket(`partysocket`) | 位置同期はリアルタイム、拠点状態変更はイベント単位 |
| マップ制作 | Tiled(外部ツール、JSON書き出し) | 現状は生成スクリプトによる仮データ |
| クライアントホスティング | Cloudflare Pages | 静的ファイル配信 |
| サーバーホスティング | Cloudflare Workers | `wrangler`でデプロイ |
| 言語 | TypeScript(クライアント・サーバー共通) | メッセージ型を共有 |

Node.js常駐サーバー前提のフレームワーク(Colyseus等)はCloudflare Workers(V8アイソレート、Node.js API非対応)では動かないため不採用。`partyserver`ベースの構成を採用している。

---

## 3. ディレクトリ構成(実装済み)

```
/client
  /src
    /entities   Animal.ts Building.ts Chest.ts CraftTable.ts FarmPlot.ts
                GatheringPoint.ts Monster.ts Npc.ts Player.ts RemotePlayer.ts Rock.ts
                Shop.ts Torch.ts
    /input      InputManager.ts        # キーボード/マウス/タッチ入力の抽象化層
    /net        RoomClient.ts joinInfo.ts types.ts   # WebSocket通信・状態同期
    /scenes     GameScene.ts           # 唯一のPhaserシーン(約2400行)
    /systems    AchievementReward.ts Achievements.ts Affinity.ts BuildingItems.ts
                DayNightCycle.ts Equipment.ts Experience.ts Health.ts Hunger.ts
                Inventory.ts Quests.ts Season.ts Stamina.ts Stats.ts
                Storage.ts SurvivalRecord.ts Tools.ts Weather.ts
                WorldContentGenerator.ts WorldMapGenerator.ts recipes.ts
    /ui         ActionButton.ts BuildingItemsPanel.ts CraftMenu.ts EquipmentPanel.ts
                ExperienceHud.ts HealthHud.ts HelpPanel.ts HungerHud.ts InventoryHud.ts
                MenuHub.ts Minimap.ts ShopPanel.ts SprintButton.ts
                StaminaHud.ts StatsPanel.ts StoragePanel.ts TouchDPad.ts
    /utils      device.ts
    main.ts     style.css
  /public
    /assets     タイルセット・スプライトシート(仮素材) /audio 合成音源(仮)
                # マップ地形(池の位置など)は静的ファイルを持たず、WorldMapGenerator.tsが
                # ワールドシードから実行時に生成する(2026-08-17、旧/maps/world.jsonと
                # その生成スクリプトgenerate-world.mjsは削除)
  /scripts      仮素材・仮音声を生成するワンショットスクリプト
  vite.config.ts

/server
  /src
    index.ts    # Workerエントリポイント(routePartykitRequest)
    room.ts     # ルーム(Durable Object "Room")のロジック
    types.ts    # クライアント/サーバー間の共有メッセージ型・定数
  wrangler.toml

/Docs
  design.md            # 本ドキュメント
  spec.md              # 機能・ゲームデザイン仕様
  todo.md / todo-next.md  # 次にやりたいことのメモ
```

---

## 4. シーン構成・起動フロー

- Phaserのシーンは**`GameScene`の1つのみ**。タイトル/ロビー画面はPhaserシーンではなく、`client/index.html`上のプレーンなHTMLオーバーレイとして実装されている。
- 起動フロー: `main.ts`がHTMLの参加フォーム(名前入力)を表示 →送信で`startGame()`が呼ばれ、フォームを取り除いてPhaser本体(`scene: [GameScene]`)を起動する。
- 同じ画面には「🔄 ゲームをリセット」ボタンもあり、入室せずにサーバーへリセットリクエストのみを送れる。

---

## 5. 入力層(InputManager)

`client/src/input/InputManager.ts`が、キーボード・マウス・タッチ入力を「移動方向」「アクション実行」等の抽象イベントに変換し、ゲームロジック側は入力デバイスの種類を意識しない設計になっている(将来のタッチ操作対応を見据えた当初仕様どおり)。

- 移動: 矢印キー or WASD、斜め移動は正規化。タッチ端末では仮想D-padが同じ移動状態に合流する。
- アクション: **左クリック/タップ に加えて X キー**でも実行可能(クリックを置き換えたわけではなく追加)。X キーはクリック位置ではなく「プレイヤーが向いている方向の固定距離」に対して作用する(`SHIFT_ACTION_REACH`等)。
  - 実装上は内部的に旧名称`onShiftAction`のまま(元々Shiftキーだったが、OSの固定キー機能やIME入力にShift単体が横取りされブラウザに届かないケースがあるためXキーに変更した経緯がある)。
- その他のキー割り当て: Space=ダッシュ、T=拠点へのルーラ(ワープ)、F=とくぎ、H=ホイミ(回復呪文)、B=盾(押している間ブロック)、V=ペットの追従/待機切替、G=イオナズン(範囲攻撃)。
  - `InputManager.handlePointerDown`は右クリックを早期returnで無視する(エンダーパールのテレポート機能を2026-08-17に削除した名残)。
- タッチUI: `TouchDPad`(移動)、`ActionButton`(Xキー相当のアクション)、`SprintButton`(ダッシュ)。
- 画面レイアウト(2026-08-18〜): `index.html`に`#hud-row`(上段)/`#app`(中段=ゲーム画面)/`#controls-row`(下段)を用意し、HUD系(`HealthHud`/`ExperienceHud`/`StaminaHud`/`HungerHud`/`InventoryHud`/`Minimap`/`MenuHub`のトグルボタン/`world-map-toggle`/生存時間HUD)は`getHudRoot()`(`client/src/ui/layoutRoots.ts`)経由で`#hud-row`へ、タッチ操作系(`TouchDPad`/`ActionButton`/`SprintButton`)は`getControlsRoot()`経由で`#controls-row`へ追加する。横持ち/デスクトップではこれらの要素は従来どおり`position:fixed`で画面端に固定されるため、どのコンテナの子であるかは見た目に影響しない。縦持ち時のみ`style.css`の`@media (orientation: portrait)`が`body`を縦方向のflexカラムにし、該当要素を`position:static`へ戻して通常フローに乗せることで、上段=HUD・中段=ゲーム画面・下段=操作ボタンの3段構成にする(以前は全要素が画面全体基準の`position:fixed`だったため、横長固定の内部解像度がFITで縮小されるとHUDがゲーム画面に重なり、操作ボタンとの間に大きな空白ができていた)。

---

## 6. エンティティ設計

- `Player`: Arcadeスプライト。あたり判定は24x20(オフセット4,40)、通常速度180(ダッシュ時1.6倍)、方向ごと(下/横/上)6フレームの歩行アニメーション。帽子スプライトは目にかぶらないよう調整済み(生成スクリプト側で座標修正、後述)。
- `RemotePlayer`: サーバーから受信した位置へ線形補間(lerp係数0.25)で滑らかに追従。移動量が300pxを超える場合(テレポート・リスポーン等)は補間せず瞬時に位置を合わせる。
- その他のエンティティ: `Animal`(懐かせ可能なペット、レア個体・毛刈り)、`Chest`(復活する宝箱)、`CraftTable`(拠点に最初から設置されているクラフト台。後述)、`FarmPlot`(作物成長)、`GatheringPoint`(採集ポイント、2〜5回で枯渇→45秒後に復活)、`Monster`(レア/ボス/ミニスライム/自爆型などのバリエーション、HP倍率、徘徊AI)、`Npc`(徘徊・夜は就寝)、`Rock`、`Shop`、`Torch`。
- `Building`: 建物種別ごとの汎用スプライト(farm_plot/torchは個別クラスで特別扱い)。衝突判定を持つのは`rock`のみ(`fence`は2026-08-17に削除)。

### 帽子位置の修正について

TypeScriptコード側の変更ではなく、`client/scripts/generate-placeholder-art.ps1`が生成する`client/public/assets/player.png`(仮スプライト)側で帽子のつばの描画位置を上に2px移動し、目にかぶらないよう調整した(コミット `e34f936`)。

---

## 7. システム設計

- `Inventory`: アイテムID19種、個数のみを保持するシンプルな構造。`localStorage`キー`open-world-game:inventory`に永続化(プレイヤー単位・ブラウザ単位)。`add`/`spend`/`canAfford`/`reset`を提供。
- `recipes.ts`: 24種類のレシピを`building`/`weapon`/`tool`/`item`/`armor`のいずれかの効果タイプで定義(詳細は spec.md)。`upgrade`/`enchant`タイプは2026-08-17に削除。
- クラフトは`CraftTable`(拠点に最初から1台設置。座標はワールドシードごとにスポーン地点周辺でランダムに決まる。§8参照)に近づいた状態でのみ実行できる。マップ上のクラフト台をクリック/Xキーで`CraftMenu.toggle()`が呼ばれてメニューが開閉する(`GameScene.tryCraftTable`)。クラフトメニューを開く導線はこのクラフト台への近接操作のみで、「☰ メニュー」には含まれない(2026-08-17、メニュー内の🔨クラフト項目は「クラフト台に近づかないと結局開けない」ため冗長として削除)。
- 建物(`effect.type === "building"`)のクラフトは、他のレシピ(道具・武器・防具・アイテム)と異なり**即座にワールドへは配置されない**。`handleCraft`はクラフトした建物を`BuildingItems`(建物種別ごとの所持数だけを`localStorage`に保持するクラスで、`Inventory`と同じCountsパターンだが別の名前空間)に加算するのみで止まる(`GameScene.handleCraft`)。実際にマップへ配置するには、「☰ メニュー」→「📥 設置」から開く`BuildingItemsPanel`で持っている建物アイテムを選び「設置」ボタンを押す(`GameScene.handlePlaceBuilding`)必要があり、その時点のプレイヤーの現在地に配置され、サーバーへ`craft-building`メッセージが送られる(「作る→アイテム化→設置」の2段階、コミット`ad127a0`)。
- `Health`: HP管理のみを担当し、ゲームオーバー処理自体は持たない。`damage()`はHPが0になった瞬間のみ`true`を返し、以降の分岐(復活/ゲームオーバー)は呼び出し側(`GameScene`)に委ねる設計。
- ゲームオーバー〜再開フロー(`GameScene.handlePlayerDefeated`等):
  1. HPが0になると、まず「トーテム」所持で1HP復活を試みる。
  2. 復活できない場合は`triggerGameOver()`でフルスクリーンのゲームオーバー演出(生存時間・自己ベストを表示)を出し、「▶ 次のゲームへ」ボタン以外の操作を受け付けない状態にする。
  3. ボタン押下でサーバーへHTTPのリセットリクエストを送信し、サーバーが`game-reset`をブロードキャストするまでオーバーレイは消えない(=拠点/ワールド全体は自動リセットされない。プレイヤーの明示操作を待つ)。
  4. `game-reset`受信で建物・インベントリ・所持している未設置の建物アイテム(`BuildingItems`)・HP・ワールドコンテンツ・リスポーン地点をすべて初期化し、再接続する。
- リスポーン地点(`respawnPoint`): 常にスポーン地点固定(ベッドで更新する仕組みは2026-08-17に削除)。ワープ(Tキー)はこの地点へ移動する。
- そのほかのシステム: `Achievements`/`AchievementReward`(実績と報酬)、`Affinity`(NPC親密度・簡易版)、`DayNightCycle`(昼夜)、`Equipment`(武器/防具切替)、`Experience`/`Stats`(レベル・経験値)、`Hunger`/`Stamina`(満腹度・スタミナ)、`Quests`、`Season`/`Weather`(季節・天候)、`Storage`(倉庫(storage_shed)に話しかけて開く預け入れ用ストレージ。旧エンダーチェスト機能の削除後、`storage_shed`に統合)、`SurvivalRecord`(生存時間の記録)、`WorldContentGenerator`(後述)。セーブスロット機能(`SaveSlots`/`ExportImport`)は2026-08-17に削除。

---

## 8. マップ・ワールド生成

マップは**単一の連続マップ**(160x120タイル、1タイル32px、総サイズ5120x3840px、4レイヤー: ground/obstacles/npcs/shops)。当初仕様にあった「チャンク単位で徐々に開放」という設計は採用しておらず、フェーズ0〜5完了時点で既に開放要素なしの自由探索マップになっている。

### 地形(池)・ショップ・クラフト台の配置(2026-08-17〜、実行時生成)

- 当初は`client/public/maps/world.json`という静的なTiled JSONファイルを`preload()`で読み込んでいたが、ゲームリセットのたびに池の位置やショップ・クラフト台の場所も変えたいという要望を受け、**地形そのものを`worldSeed`から実行時に生成する方式に変更した**。静的ファイルとその生成スクリプト(`client/scripts/generate-world.mjs`)は削除済み。
- `client/src/systems/WorldMapGenerator.ts`の`generateWorldMap(seed)`が、`client/scripts/generate-world.mjs`で行っていたマップ組み立てロジック(4つの領域(home/north/east/northeast)をタイル単位で組み立てて1枚のワールドに合成する処理)をクライアント側に移植し、`WorldContentGenerator.ts`と同じ決定的な擬似乱数(mulberry32、`seed`を共有元にした別インスタンス)で以下を毎回揺らす。
  - 各領域の池(水たまり)の中心位置・半径・波打ち具合(`fillOrganicWater`)
  - ホーム領域(スポーン地点を含む拠点エリア)内でのショップの設置タイル
  - ホーム領域内でのクラフト台(`CraftTable`)の設置タイル
- 一方で、**道(縦横のPATHタイル)・領域間の境界壁(`addBorderWalls`)・NPCの位置・スポーン地点(`SPAWN_TILE = (38,80)`、サーバー側`SPAWN_X/SPAWN_Y`と一致させる必要があるため固定)は骨格として変更しない**。池・ショップ・クラフト台の候補地はスポーン地点や道からの距離条件・水判定つきの探索(`pickRandomGrassTile`)で選ぶため、生成結果が到達不能になることはない。
- 生成した結果はTiled JSON形式のオブジェクトとして`this.cache.tilemap.add("world", { format: Phaser.Tilemaps.Formats.TILED_JSON, data })`でPhaserのタイルマップキャッシュに直接注入し、`this.make.tilemap({ key: "world" })`で読み込む(ファイル読み込みを介さない点以外はTiled JSON形式のまま)。
- 生成・構築のタイミングはサーバーから`worldSeed`を受け取る`onInit`(`GameScene.rebuildWorld(worldSeed)`)。**初回参加時だけでなく、ゲームリセット後の再接続でも`onInit`は再度発火するため、リセットのたびに地形・ショップ・クラフト台の位置も変わる**。カメラ追従・ミニマップ・昼夜/天候オーバーレイなど「地形が変わっても作り直す必要がないもの」は`worldChromeInitialized`フラグで初回のみ構築し、2回目以降は地形(タイルレイヤー・コライダー・NPC・ショップ・クラフト台)だけを破棄して再構築する。
  - `worldSeed`が届くまで地形は存在しないため、`create()`で`#world-loading-overlay`(「ワールドを生成中...」)を表示し、`rebuildWorld`完了時に取り除く。またこのタイミング以前は`GameScene.update()`が地形依存のフィールド(`nightOverlay`等)へアクセスして例外を起こさないよう、`worldChromeInitialized`が立つまで`update()`全体を早期returnする。
  - プレイヤー・モンスター・動物と地面/障害物レイヤーとの間の全コライダーは`worldColliders`配列にまとめて記録し、地形再構築の直前にすべて`destroy()`してから新しいレイヤーを作る(破棄済みレイヤーを参照する古いコライダーが残らないようにするため)。
- 採集ポイント・モンスター・動物・岩・宝箱などの「ワールドコンテンツ」は引き続きマップJSONに焼き込まれておらず、`worldSeed`を種にした決定的な擬似乱数(`WorldContentGenerator.ts`)によってクライアント側で実行時に配置される(この部分の仕組み自体は変更なし)。

---

## 9. データモデル(現行)

```typescript
// server/src/types.ts (クライアントにも同型を配置: client/src/net/types.ts)

// プレイヤーの状態(サーバー・クライアント間で同期。※インベントリ/HPは含まない)
type PlayerState = {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
  animState: "idle" | "walk" | "attack";
};

// 拠点に配置された建物(サーバーが永続化)
type PlacedBuilding = {
  id: string;
  buildingType: string;   // recipes.ts の BuildingType
  x: number;
  y: number;
};

// クライアント → サーバー
type ClientMessage =
  | { type: "join"; name: string }
  | { type: "move"; x: number; y: number; direction: Direction; animState: AnimState }
  | { type: "craft-building"; buildingType: string; x: number; y: number };

// サーバー → クライアント
type ServerMessage =
  | { type: "init"; selfId: string; players: PlayerState[]; buildings: PlacedBuilding[]; worldSeed: number }
  | { type: "player-joined"; player: PlayerState }
  | { type: "player-moved"; id: string; x: number; y: number; direction: Direction; animState: AnimState }
  | { type: "player-left"; id: string }
  | { type: "room-full" }
  | { type: "building-placed"; building: PlacedBuilding }
  | { type: "game-reset" }; // worldSeedは含まない。再接続後のinitで新シードを受け取る

const MAX_PLAYERS = 4;
```

セーブ/ロード・エクスポート/インポート関連のメッセージ型(`save-game`/`load-game`/`export-game`等)は2026-08-17の機能削除で撤去済み。

**インベントリ・HP・満腹度・スタミナ・実績・装備・クエスト等はサーバーに存在しない**。すべてクライアントの`localStorage`に個人単位で保持され、ネットワーク同期されない(プレイヤーごとの見た目・所持品は他プレイヤーの画面には反映されない)。サーバーが同期・永続化するのは「プレイヤーのリアルタイム位置」と「拠点に設置された建物」のみ。

---

## 10. サーバー(Durable Object "Room")の役割

- `server/src/room.ts`がDurable Objectとして1ルーム分の状態を保持する。
- 同期対象: 各プレイヤーの位置・向き・アニメーション状態(インメモリの`Map`。永続化なし=再接続で消える)。
- 永続化対象(`ctx.storage`): 設置済み建物のリスト(キー`"buildings"`)、ワールドシード(`"world-seed"`)。
- 最大同時接続人数: 4人(`MAX_PLAYERS`)。5人目は`room-full`で拒否。
- リセット: 認証なしのHTTP POST(`/parties/room/main`)を`Room.onRequest`が受け付け、建物を全消去・新しいワールドシードを発行・全接続を強制切断する。
- クラフトの整合性検証(レシピ・材料コストのチェック)はサーバー側では行わない。クライアントが計算した結果をブロードキャストするのみ(友達内輪プレイを前提とした割り切り)。

---

## 11. 非機能要件・技術的な注意点

- コスト: Cloudflare Pages/Workersの無料枠内での運用を前提。
- チート対策: 友達内輪の信頼できるプレイ前提のため、サーバー側の厳密な検証は行わない。
- 同時接続: 最大4人程度を想定。高頻度・大規模な同期最適化は不要。
- プレイヤー位置の送信は約80msごと・変化があった場合のみ。
- PowerShell(`.ps1`)にコメントを書く場合はASCII文字のみにすること。BOMなしUTF-8で保存された`.ps1`はWindows PowerShell 5.1がシステムのANSIコードページ(日本語環境ではShift-JIS)で読み込むため、一部の漢字がコメント直後の改行を飲み込み、次の行が丸ごと無視されることがある。
</content>
