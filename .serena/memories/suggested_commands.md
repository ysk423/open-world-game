# Suggested Commands

## ローカル開発(2ターミナル)
```
cd server && npm run dev   # wrangler dev, http://127.0.0.1:8787
cd client && npm run dev   # vite,        http://localhost:5173
```
別タブ/別ウィンドウでマルチプレイ確認可能(最大4人)。

## ビルド・型チェック(= mem:task_completion と同じ)
```
cd client && npm run build      # tsc && vite build
cd server && npm run typecheck  # tsc --noEmit
```

## デプロイ
- client: `main`ブランチへのpushでCloudflare Pagesが自動ビルド・デプロイ(Git連携)。
- server: Git連携なし。手動で `cd server && npm run deploy`(`wrangler deploy`)を実行する必要がある。

## Windows固有の注意
- PowerShell(`.ps1`)にコメントを書く場合はASCII文字のみにする。BOMなしUTF-8の`.ps1`はPowerShell 5.1がシステムのANSIコードページ(日本語環境ではShift-JIS)で読み込み、日本語コメント直後の改行を飲み込んで次の行が丸ごと無視されることがある(`client/scripts/generate-placeholder-art.ps1`で実際に踏んだ問題)。
