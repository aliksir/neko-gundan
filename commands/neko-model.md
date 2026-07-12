# /neko-model — エージェントモデル設定

猫軍団のエージェントモデルを一括または個別に設定する。

## 引数

### 一括設定
- `/neko-model opus` — 全エージェントを Opus に設定
- `/neko-model sonnet` — 全エージェントを Sonnet に設定
- `/neko-model haiku` — 全エージェントを Haiku に設定
- `/neko-model reset` — model 指定を全て削除（セッションモデルを継承）

### 個別設定
- `/neko-model oyakata opus` — 親方猫のみ Opus に設定
- `/neko-model shigoto sonnet` — 仕事猫のみ Sonnet に設定
- `/neko-model genba haiku` — 現場猫のみ Haiku に設定
- `/neko-model kurouto opus` — 玄人猫のみ Opus に設定
- `/neko-model koneko sonnet` — 子猫のみ Sonnet に設定
- `/neko-model {名前} reset` — 指定エージェントの model 指定を削除

### 表示
- `/neko-model`（引数なし） — 現在の設定を表示

## エージェント名の対応表

| 短縮名 | エージェント | ファイル |
|--------|------------|---------|
| `oyakata` | 親方猫 | `agents/oyakata-neko.md` |
| `shigoto` | 仕事猫 | `agents/shigoto-neko.md` |
| `genba` | 現場猫 | `agents/genba-neko.md` |
| `kurouto` | 玄人猫 | `agents/kurouto-neko.md` |
| `koneko` | 子猫 | `agents/koneko-neko.md` |

## 実行手順

### 引数パース

引数を空白で分割する:
- 0個 → 表示モード
- 1個 → 一括設定（値は `opus` / `sonnet` / `haiku` / `reset`）
- 2個 → 個別設定（第1引数=エージェント名、第2引数=モデル名 or `reset`）

第1引数がエージェント名（上記対応表）に一致するかで一括/個別を判定する。

### 表示モード（引数なし）

1. `agents/` 配下の全 `.md` ファイルの frontmatter から `model:` 行を抽出する
2. `model:` が未指定のエージェントは「(継承)」と表示する
3. 表でまとめて報告する

### 一括設定モード

1. 引数が `opus` / `sonnet` / `haiku` / `reset` のいずれかであることを確認する
2. 対応表の全 5 ファイルの frontmatter を Edit で更新する
3. **`reset` の場合**: 各ファイルの frontmatter から `model:` 行を削除する
4. **それ以外の場合**: 各ファイルの frontmatter に `model: {引数}` を追加または更新する
   - 既に `model:` 行がある → 値を置換
   - `model:` 行がない → `name:` 行の直後に追加
5. 変更結果を表で報告する

### 個別設定モード

1. 第1引数が対応表のエージェント名と一致することを確認する
2. 第2引数が `opus` / `sonnet` / `haiku` / `reset` のいずれかであることを確認する
3. 該当 1 ファイルのみ Edit で更新する（手順は一括と同じ）
4. 変更結果を報告する

### 対象ファイルの検出

`agents/` ディレクトリは猫軍団リポジトリのルート、またはプロジェクトの `.claude/agents/` のどちらかにある。
以下の順で検出する:

1. カレントディレクトリに `agents/oyakata-neko.md` があればそこを使う
2. なければ `.claude/agents/oyakata-neko.md` を探す
3. どちらもなければエラー: 「猫軍団のエージェント定義が見つからないっす…」

## 報告フォーマット

### 一括設定時
```
よーし、猫軍団モデル設定を更新したぞ。ヨシッ！

| エージェント | 変更前 | 変更後 |
|---|---|---|
| 親方猫 | (継承) | opus |
| 仕事猫 | sonnet | opus |
| 現場猫 | sonnet | opus |
| 玄人猫 | sonnet | opus |
| 子猫 | (継承) | opus |
```

### 個別設定時
```
よーし、仕事猫のモデルを更新したぞ。ヨシッ！

| エージェント | 変更前 | 変更後 |
|---|---|---|
| 仕事猫 | sonnet | opus |

他のエージェントは変更なし。
```

### 表示時
```
猫軍団の現在のモデル設定だ。

| エージェント | モデル |
|---|---|
| 親方猫 | (継承) |
| 仕事猫 | opus |
| 現場猫 | sonnet |
| 玄人猫 | opus |
| 子猫 | (継承) |

(継承) = セッションモデルをそのまま使用
```

## 注意事項

- このコマンドは frontmatter の `model:` フィールドのみを変更する。`effort:` や他のフィールドは触らない
- 変更は即座にファイルに反映される。次回のエージェント spawn から有効になる
- `reset` で model 指定を消すと、Claude Code 起動時のモデルがそのまま適用される（最も柔軟）
- 有効なモデル値は `opus` / `sonnet` / `haiku` のみ。それ以外はエラーにする
