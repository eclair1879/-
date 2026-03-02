
# Mogura Crash! — Global Leaderboard (Cloudflare Pages)

このフォルダは **Cloudflare Pages + Pages Functions** を使って、
`index.html`（クライアント）のランキングを **全体共有** に拡張する最小構成です。

## フォルダ構成
```
./public/                 # フロントエンド（あなたの index.html をここに置く）
  ├─ index.html          # アドオン<script>が差し込まれています
  └─ leaderboard-addon.js# ランキング送受信用の上書きスクリプト
./functions/api/
  └─ leaderboard.js      # GET(上位100)/POST(スコア登録) のAPI
```

> Cloudflare Pages の Functions は **同一オリジン** `/api/*` で動くため、
> `connect-src 'self'`（既定のCSP）でそのまま通信できます。

## デプロイ手順（Cloudflare Pages）
1. このフォルダを GitHub リポジトリにコミット
2. Cloudflare ダッシュボード → **Pages** → **Create a project** → リポジトリを接続
3. **Build command**: なし / **Build output directory**: `public`
4. デプロイ後、`https://<your-project>.pages.dev/` が発行されます

### D1（SQLite）を使う（推奨）
1. Cloudflare ダッシュボード → **D1** でDB作成
2. Pages プロジェクトの **Settings → Functions → D1 Bindings** で `DB` という名前でバインド
3. スキーマを作成：
```sql
CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_score ON leaderboard(score DESC);
```
4. これで `/api/leaderboard` に **GET/POST** で保存・取得できます

### 使い方
- 既存の `index.html` の末尾に `<script src="/leaderboard-addon.js"></script>` を差し込んでいます
- `saveResult()` / `updateRankingDisplay()` を**上書き**して、APIに送受信します
- APIは同一オリジン`/api/leaderboard`なので、CSP変更不要です

### （任意）不正対策
- `functions/api/leaderboard.js` に簡易バリデーションを実装済み
- さらに絞る場合：レート制限、リクエスト署名、上限チェック、BOT対策などを追加してください

## ローカルプレビュー（任意）
- `npm i -g wrangler` を入れていれば `wrangler pages dev public --compatibility-date=2024-10-01` でプレビュー可

