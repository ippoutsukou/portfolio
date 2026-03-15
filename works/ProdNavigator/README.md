# 新人教育ポータル

新人教育向けの静的 Web アプリ雛形です。商品、工場、仕向け先の関係をたどりながら学習できる構成にしています。

## 構成

- `ProdNavigator.html`: エントリポイント
- `css/style.css`: 画面スタイル
- `js/`: 画面描画、状態管理、検索、ルーティング
- `data/`: サンプル JSON
- `out/`: 設計書、ToDo

## 起動方法

`fetch` で JSON を読むため、`file://` ではなくローカルサーバー経由で開いてください。

例:

```powershell
python -m http.server 8000
```

その後、ブラウザで `http://localhost:8000/60_portfoliosite/works/ProdNavigator/ProdNavigator.html` を開きます。

## データ更新

- 商品: `data/products.json`
- 工場: `data/factories.json`
- 仕向け先: `data/destinations.json`
- 関係: `data/relations.json`

初版は UI から編集せず、JSON を直接更新します。

## 次の実装候補

- 関係マップの起点選択とハイライト
- 詳細比較用のテーブル表示
- JSON バリデーション
- FAQ / 用語集の検索
