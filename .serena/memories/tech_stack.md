# Tech Stack

## client/
- TypeScript + Vite 8 + Phaser 3.90。
- `partysocket`でサーバーとWebSocket通信。
- テストフレームワーク・lintツールは未導入(package.jsonにtest/lintスクリプトなし)。

## server/
- Cloudflare Workers上のDurable Objects。`partyserver`ライブラリでルーム(`Room`クラス)を実装。
- `wrangler`(4系)でローカル実行・デプロイ。`compatibility_date = "2026-08-01"`(`server/wrangler.toml`)。
- TypeScript 7系(clientのTypeScript 6系とはバージョンが異なる点に注意)。

## 共通
- メッセージ型(`ClientMessage`/`ServerMessage`等)は`server/src/types.ts`と`client/src/net/types.ts`に同型を重複定義(自動同期の仕組みはない。片方を変えたらもう片方も手動で合わせる)。
