# Smart Warehouse Transfer Planner — GitHub Pages デモ

これはバックエンド非公開のまま触れるよう作った **静的 HTML サンプル** です。
本物の FastAPI / SQLite は使わず、JavaScript の `window.fetch` を上書きしたモック層が、固定値データから API レスポンスを返します。

- **値はすべて架空** (5 倉庫 / 4 品目 / 10 在庫 / 5 移動計画 / 3 廃却計画)
- 単品判定・複数明細判定の **フォーム送信** は、仕様書の判定ロジック (実質在庫・必要スペース・スコアリング・同点時順位) を JS 内で薄く再現しています
- グラフ (Canvas)、テーブル、ホバー tooltip、画面遷移はすべて元の `web/` 版と同一です

---

## ファイル構成

```
githubpagesMVP/
├── index.html          # / : 単品判定
├── batch.html          # /batch : 複数明細判定
├── dashboard.html      # /dashboard : 倉庫サマリー
├── items.html          # /items : 品目別サマリー
├── history.html        # /history : 判定履歴
├── style.css           # 共通スタイル
├── app.js              # 単品判定 UI ロジック
├── batch.js            # 複数明細判定 UI ロジック
├── dashboard.js        # 倉庫サマリー UI ロジック
├── items.js            # 品目別サマリー UI ロジック
├── history.js          # 判定履歴 UI ロジック
├── mock-data.js        # 固定値データセット
├── mock-api.js         # fetch を差し替えるモック層 (簡易判定ロジック含む)
└── README.md           # このファイル
```

`app.js` / `batch.js` / `dashboard.js` / `items.js` / `history.js` は本番の `web/` 配下と完全に同じ内容です。サーバ無しでも動くように、`mock-api.js` が同じインタフェースで `Response` 互換オブジェクトを返します。

---

## ローカルで開く

ファイルプロトコルだとブラウザによっては挙動が変わるため、簡易サーバ経由を推奨します。

```bash
cd githubpagesMVP
python -m http.server 8000
```

ブラウザで `http://localhost:8000/index.html` を開きます。

---

## GitHub Pages で公開する手順

1. 当ディレクトリ (`githubpagesMVP/`) をリポジトリにコミット & プッシュする
2. リポジトリの **Settings → Pages** を開く
3. **Source** を `Deploy from a branch` にする
4. **Branch** で公開ブランチ (例: `main`) と、フォルダを **`/docs`** または **`/ (root)`** から選ぶ
   - `/githubpagesMVP` を直接選べないため、運用としては以下のいずれか:
     - **(a)** リポジトリ直下にコピーを置いて root 公開する
     - **(b)** `docs/` にコピー (またはシンボリックリンク) して `/docs` 公開する
     - **(c)** ブランチ `gh-pages` を作り、その内容として `githubpagesMVP/*` を配置する
5. 数十秒待つと `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開される

公開先がサブパスでも動くよう、すべてのアセット参照は **相対パス** で書いています (`/static/...` のような絶対パスは含みません)。

---

## モックの挙動

### 単品判定 (`index.html`)
- フォーム送信時、`POST /warehouse-judge` を `mock-api.js` が捌く
- 搬入の場合: `必要スペース = ceil(数量 / 段積み可能数) × 1山面積` を算出し、各倉庫の空き面積と比較
- 搬出の場合: 各倉庫 × 品目の **実質在庫** (現在在庫 ± 有効計画) を算出し、要求数量と比較
- スコア: 受入余力/在庫余力 +50、種別ボーナス (㎡借り or 個建) +30、行先エリア一致 +10、`priority_in/out` を加点
- 同点時: エリア一致 → 種別優先 → 余力大 → `warehouse_id` 昇順

### 複数明細判定 (`batch.html`)
- 各明細を単品判定にかけ、第 1 候補に全数を割当 (1 明細を複数倉庫に分割する高度な引当は再現しません)
- 第 1 候補が無い明細は `feasible=false` と `shortage_quantity` を返し、`warnings` に日本語メッセージを 1 行追加

### ダッシュボード / 品目別サマリー / 履歴
- すべて `mock-data.js` の固定値から派生計算 (実質在庫・使用面積) を行ってレンダリング
- 履歴は 3 件 (成立・警告あり・不足ありの 3 パターン) を含めています

---

## 制限事項

- 値・履歴・履歴詳細はすべて固定です。フォームから入力しても **`mock-data.js` には保存されません**
- 在庫推移グラフ (`*/plans`) は `mock-data.js` に決め打ちで埋め込んでいるため、フォーム送信の結果はグラフに反映されません
- 仕様書通りの「1 明細を複数倉庫に分割引当」「分割後の使用面積反映」など、バックエンド側の高度なロジックは再現していません
- ブラウザの開発者ツールで `window.MOCK_DATA` を覗くと、内部データを確認できます (デバッグ用)

---

## 元実装との差分

`web/` 版との差分は以下のみです。

1. アセットパス: `/static/style.css` → `style.css`、`/static/<name>.js` → `<name>.js`
2. ナビゲーションリンク: `/`, `/batch`, `/dashboard`, `/items`, `/history` → `index.html` 等の相対パス
3. 各画面の hero 部に「これはデモサンプルです」のバナーを追加
4. `<script>` の読込順を `mock-data.js` → `mock-api.js` → 画面 JS の 3 連にした (画面 JS 本体は無修正)
