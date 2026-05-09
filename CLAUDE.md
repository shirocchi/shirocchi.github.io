# shirocchi.github.io — site repo

Astro 製の個人ブログのビルド側。コンテンツの原本は別の **Obsidian vault** にあり、`scripts/sync.mjs` が一方向で取り込む。

## 構造

```
[ここ: site repo, git管理]                          [別: vault, iCloud, git無し]
C:\Users\sjion\dev\blog-site\                       C:\Users\sjion\iCloudDrive\iCloud~md~obsidian\Blog\
├── src/content/posts/  ← syncで自動生成、手で編集しない  ├── posts/         ← 原本
├── public/attachments/ ← syncで自動                    ├── attachments/   ← 画像原本
├── scripts/sync.mjs    ← 同期スクリプト                ├── templates/     ← Obsidianテンプレ
├── src/{layouts,pages,styles}                          └── CLAUDE.md
├── astro.config.mjs
├── .github/workflows/deploy.yml  ← Pages デプロイ
└── package.json
```

## 公開URL

https://shirocchi.github.io/

## 編集ルール

- **`src/content/posts/` は触らない** — vault 側で書いて sync で生成。直接編集しても次回の sync で上書きされる
- vault 側の posts は `slug` がファイル名になる。slug 無しはスキップ
- 画像は vault のどのフォルダに置いてもOK(`attachments/`, `pictures/`, etc.)。`sync.mjs` がファイル名で vault 全体から解決する(Obsidian と同じ振る舞い)。`![[file.png]]` / `![[file.png|キャプション|400]]` 構文で参照。`<img loading="lazy">` または `<figure>` + `<figcaption>` に展開され、参照されたファイルだけ `public/attachments/` にコピーされる(mirror)

## コマンド

```
npm run dev       # 開発サーバ http://localhost:4321
npm run build     # 静的ビルド (dist/)
npm run sync      # vault → src/content/posts (commit/push なし)
npm run publish   # sync + commit + push (= 公開)
```

通常 `publish` は Obsidian の Shell commands plugin が `Ctrl+Alt+P` で叩く。本人が押す。**Claude が勝手に publish しない**。

## デザイン仕様

2テーマ。ヘッダー右上で切替、`localStorage.theme` に保存:
- **通常**(デフォルト): 和紙×墨×Noto Serif JP、年でグルーピング
- **RPG**: 深紺×DotGothic16、5色のロール別パレット(green=操作 / cyan=構造 / yellow=強調 / pink=特殊 / orange=警告)
- 装飾グリフ(◆ ▶ ★ など)はCSS変数 `--dec-*` でテーマごとに出し分け

CSSは `src/styles/global.css` 1ファイル完結。

## 思想(機能追加判断の基準)

主題: **「自己商品化からの離脱」**。視覚で煽らない、数字で煽らない、SEOで煽らない。

**意図的に持たないもの**(提案しないこと):
- PV / いいね / シェア数 / シェアボタン
- ニュースレター登録
- コメント欄
- 関連記事レコメンド
- アナリティクス(Plausibleも含めて現状なし)
- Cookieバナー
- タグクラウド表示(frontmatterの `tags: []` は受け入れるが表示しない)

これらの**不在が主張**。

## 将来用に確保してある(まだ使わない)

- i18n対応のディレクトリ構造(将来 `/ja/...` `/en/...` に分けやすく)
- frontmatter `tags` フィールド(表示は後)

## デプロイ

- ブランチ `main` への push で `.github/workflows/deploy.yml` が走る
- Astro build → Pages にアップロード → 1〜2分で反映
- Pages 設定の `build_type` は `workflow`(Actions経由)

## 関連

- vault 側の詳細: `C:\Users\sjion\iCloudDrive\iCloud~md~obsidian\Blog\CLAUDE.md`
- README: `./README.md`
