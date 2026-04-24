# ETC明細PDF自動作成

ETC利用明細照会サービスを Playwright で操作し、対象月の明細から条件に一致する行をチェックして、PDFを `out/` に保存するスクリプトです。

ログイン情報は保存しません。ブラウザで手動ログインしたあと、ターミナルで `done` を入力して処理を続行します。

## 主なファイル

- `recorded.py`: 本番実行用スクリプト
- `config.json`: 対象年月、抽出条件、出力先、dry run の設定
- `debug_popup.py`: PDF出力画面の構造確認用
- `tests/`: Playwright fixture を使ったテスト
- `out/`: PDF出力先
- `backup/`: 変更前バックアップ置き場

## 実行前の確認

`config.json` を確認します。

```json
{
  "search": {
    "target_year_month": "previous_month",
    "conditions": {
      "routes": [
        { "entrance_ic": "岡崎東", "exit_ic": "豊明" },
        { "entrance_ic": "豊明", "exit_ic": "岡崎東" }
      ]
    }
  },
  "save_dir": "out",
  "dry_run": false
}
```

- `target_year_month`: `YYYYMM` または `previous_month`
- `routes`: 対象にする入口ICと出口ICの組み合わせ
- `save_dir`: PDF保存先。原則 `out`
- `dry_run`: `true` ならPDF保存せず確認のみ、`false` ならチェックしてPDF保存

## 実行方法

```powershell
.\.venv\Scripts\python.exe recorded.py
```

1. ブラウザが開いたら手動ログインする。
2. 明細ページが表示されたら、ターミナルで `done` を入力して Enter を押す。
3. 対象年月へ移動し、条件一致行をチェックする。
4. `dry_run=false` の場合、PDFを `out/etc_meisai_YYYYMM.pdf` に保存する。

## 出力ログ

実行後、以下のような集計が表示されます。

```text
対象候補の合計: 39 件 / チェック可能: 39 件 / 選択済み: 39 件 / 新規チェック: 39 件 / チェック不可: 0 件
方向別・確定（朝夕）件数:
  豊明 -> 岡崎東: 対象 20 件 / 確定（朝夕） 18 件
  岡崎東 -> 豊明: 対象 19 件 / 確定（朝夕） 7 件
  計 25 件
保存しました: C:\Users\ippou\Documents\portfolio\Python_Scripts\etc_pdf_auto\out\etc_meisai_202603.pdf
```

## テスト

```powershell
.\.venv\Scripts\python.exe -m py_compile recorded.py debug_popup.py
.\.venv\Scripts\python.exe -m pytest tests -v
```

Playwright の Windows named pipe 作成が権限エラーになる場合は、通常権限で再実行してください。

## 注意事項

- ID/PW はコード、設定、ログに保存しないでください。
- 入力データや既存PDFを直接変更せず、出力は `out/` に集約します。
- 既存ファイルを変更する場合は、先に変更内容を確認し、`backup/` にバックアップを作成します。
- `debug_popup.py` は確認用です。本番保存には `recorded.py` を使います。
