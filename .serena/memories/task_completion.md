# Task Completion

コーディングタスク完了時に実行するコマンド(テスト・lintは未整備のため以下のみ):

```
cd client && npm run build      # tsc (型チェック) && vite build
cd server && npm run typecheck  # tsc --noEmit
```

変更したレイヤーに応じて該当する方(または両方、共有型`types.ts`を触った場合は両方)を実行する。
