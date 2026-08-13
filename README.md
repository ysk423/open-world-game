# はじまりの湾(仮) — ほのぼの2Dドット絵オープンワールド

ブラウザで動く2Dドット絵の見下ろし型オープンワールドゲーム。詳細な仕様は [claude_code_spec.md](./claude_code_spec.md) を参照。

現在の実装状況: **フェーズ1(マルチプレイ基盤)完了・本番デプロイ済み**。

**🎮 今すぐ遊べます: https://open-world-game-dxu.pages.dev**
(同じルームIDで別のタブ/ウィンドウ・別の端末から入ると、最大4人でマルチプレイできる)

## ディレクトリ構成

```
/client                  # Phaserゲーム本体(Cloudflare Pagesにデプロイ予定)
  /src
    /scenes               # Phaserのシーン(GameSceneなど)
    /input                # InputManager: キーボード/マウス入力の抽象化層
    /net                  # RoomClient(partysocket): WebSocket通信・状態同期
    /entities             # プレイヤー(操作キャラ)・RemotePlayer(他プレイヤー)
    main.ts                # エントリポイント。参加フォーム → Phaser.Game起動
    style.css
  /public
    /maps                  # Tiledで書き出したマップJSON(現在は仮データ)
    /assets                # タイルセット・スプライトシート(現在は仮素材)
  /scripts                # 仮素材・仮マップを生成するワンショットスクリプト
  vite.config.ts

/server                  # Cloudflare Workers + Durable Objects(partyserver)
  /src
    room.ts                # ルーム(Durable Object)のロジック。位置・向き等を同期
    index.ts                # Workerエントリポイント(routePartykitRequest)
    types.ts                # クライアント/サーバー間のメッセージ型
  wrangler.toml

claude_code_spec.md      # 実装仕様書
```

## ローカルでの起動方法

前提: Node.js (LTS) がインストールされていること。

サーバーとクライアントを別々のターミナルで起動する。

```bash
# ターミナル1: マルチプレイサーバー(Cloudflare Workers をローカル実行)
cd server
npm install
npm run dev      # http://127.0.0.1:8787 で起動
```

```bash
# ターミナル2: クライアント
cd client
npm install
npm run dev       # http://localhost:5173 で起動
```

`http://localhost:5173` をブラウザで開き、名前とルームIDを入力して「参加する」を押すとゲームが始まる。
**同じルームIDで別のタブ/ウィンドウを開くと、複数人でのマルチプレイ(最大4人)を確認できる。**
認証機能はなく、ルームIDを知っている人なら誰でも入室できる(友達内輪プレイ前提)。

### ビルド

```bash
cd client
npm run build   # tscによる型チェック + viteビルド。dist/ に出力される
npm run preview # ビルド結果をローカルで確認
```

```bash
cd server
npm run typecheck   # tsc --noEmit による型チェックのみ
```

## Cloudflareへのデプロイ

現在の本番環境:
- サーバー(Workers): https://open-world-game-server.ysk-ino-123.workers.dev
- クライアント(Pages): https://open-world-game-dxu.pages.dev

初回は `npx wrangler login` でCloudflareアカウントにログインしておく。

```bash
# サーバーをデプロイ(Cloudflare Workers)
cd server
npm run deploy   # = wrangler deploy
```

デプロイ後に表示されるWorkerのURL(例: `https://open-world-game-server.<subdomain>.workers.dev`)を、
クライアントのビルド時に環境変数 `VITE_ROOM_SERVER_HOST` として渡す(スキームなし、ホスト名のみ)。

```bash
cd client
VITE_ROOM_SERVER_HOST=open-world-game-server.ysk-ino-123.workers.dev npm run build
npx wrangler pages deploy dist --project-name=open-world-game
```

指定しない場合、`VITE_ROOM_SERVER_HOST` は `localhost:8787` にフォールバックする(ローカル開発用)。
サーバー側を再デプロイしてもWorkerのURLは変わらないため、通常クライアントの環境変数を毎回変える必要はない。

## 操作方法

- 移動: `W`/`A`/`S`/`D` または矢印キー
- アクション(採集・攻撃・メニュー選択など。現時点では見た目のフィードバックのみ): マウス/トラックパッドのクリック

## マルチプレイの仕組み(現状)

- 1ルーム(Durable Object)につき最大4人まで参加可能。5人目は「満員」メッセージで弾かれる。
- 同期対象: 各プレイヤーの位置・向き・アニメーション状態(walk/idle)のみ。約80msごとに、値が変化した時だけ送信する。
- 他プレイヤーの表示はクライアント側で線形補間(lerp)し、カクつかず滑らかに動くようにしている。
- 拠点(建物・畑・共有倉庫)の同期はフェーズ3で実装予定。現時点ではプレイヤーの位置同期のみ。
- サーバー側の不正対策は行っていない(友達内輪プレイ前提。仕様書9章)。

## 現在の仮素材について

`client/public/assets/tileset.png`・`player.png` と `client/public/maps/sample-map.json` は、
`client/scripts/` 内のスクリプトで自動生成した仮のプレースホルダー素材・マップです。
本物のTiledマップ/ドット絵素材に差し替える際は、このJSON・PNGファイルを置き換えるだけでよい構成になっています。

再生成する場合:

```bash
cd client
node scripts/generate-sample-map.mjs
# PowerShellで実行(System.Drawingを使用)
powershell -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName System.Drawing; & './scripts/generate-placeholder-art.ps1'"
```

`.ps1` ファイルにコメントを書く場合はASCII文字のみにすること。BOMなしUTF-8で保存された
`.ps1` はWindows PowerShell 5.1がシステムのANSIコードページ(日本語環境ではShift-JIS)で読み込むため、
一部の漢字がコメント直後の改行を飲み込んでしまい、次の行が丸ごと無視されることがある。

## 技術スタック

- クライアント: Phaser 3 + TypeScript + Vite + partysocket
- マルチプレイサーバー: Cloudflare Workers + Durable Objects + partyserver
