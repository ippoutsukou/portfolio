---
name: index-note-sync
description: 30_outputs/drafts の記事から 60_portfoliosite/index.html の Latest Note セクションを更新する。_v2 優先、進捗（x/100）抽出、3件表示、誘導UI維持、バックアップ作成を繰り返し実行したい時に使う。
---

# index-note-sync

`index.html` の `Latest Note` を記事ドラフトから同期するためのスキル。

## 実行手順
1. 必要に応じて `assets/tag-map.example.json` をコピーしてタグ定義を作る
2. 以下コマンドを実行する

```powershell
powershell -ExecutionPolicy Bypass -File .agent/skills/index-note-sync/scripts/update-index-notes.ps1 \
  -RepoRoot "c:/Users/ippou/Documents/portfolio/porject/note" \
  -Count 3
```

## 仕様
- 対象記事: `30_outputs/drafts/*.md`
- 除外: `.bak` / `bak.md`
- バージョン: `_v2` などは同名記事の最新版として優先
- 並び順: 更新日時の新しい順
- 進捗: `#AI活用100本ノック 進捗：x/100` を抽出
- バックアップ: `60_portfoliosite/index.html.bak-YYYYMMDDHHMMSS` を作成してから上書き
- 文字コード: UTF-8 で保存

## 任意オプション
- `-TagMapPath <json>`: 記事ファイル名ごとのタグを指定
- `-DryRun`: 差し替えHTMLを標準出力のみ（ファイル未更新）

## 注意
- リンク先は暫定で `#` のまま維持する前提
- `Featured Apps` セクションは変更しない
