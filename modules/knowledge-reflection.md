# Knowledge Reflection Module

> **Module**: `knowledge_reflection` | **Default**: ON | **Scale**: Squad+
> **出典**: Ubie Warren (zenn.dev/ubie_dev/articles/sec-agent-harness-eng, 2026-04-16)

タスク完了後に知見を自動抽出し、既存知識との統合・矛盾解消まで行う「知識編纂」モジュール。
auto_lessonsの上位レイヤーとして動作する（auto_lessonsの記録機能はそのまま活用）。

## auto_lessonsとの関係

| 機能 | auto_lessons | knowledge_reflection |
|------|-------------|---------------------|
| 知見の記録 | genba-nekoが作業中に `[c:0.5]` で追記 | auto_lessonsに委譲（変更なし） |
| 品質チェック | 仕事猫の完了ゲートで重複・actionable・タグ確認 | そのまま活用（変更なし） |
| **知見の編纂** | なし（追記のみ） | **新規**: 既存知識との統合・矛盾解消・古い知識の削除 |
| **カテゴリ分類** | タグのみ | **新規**: technique / fact の2軸分類 |
| **トリガー** | 作業中（随時） | **タスク完了後**（仕事猫の完了ゲート内） |

## 知見の2カテゴリ

### Technique（手法知識）— タスク単位で抽出
- 効果的だったアプローチ・クエリパターン・ツールの使い方
- **失敗したアプローチとその理由**（失敗知識は成功知識より価値が高い）
- データソースの所在・アクセス方法

### Fact（事実知識）— セッション単位で抽出
- プロジェクト固有の構成情報（ポート番号、ファイル構造、依存関係）
- 既知の誤検知パターン・既知の制約
- 環境固有の設定値

## 知見編纂の3ステップ（仕事猫が実行）

完了ゲートの「知見メタ評価」ステップを以下に拡張する:

### Step 1: 既存知識の検索
```
search-yoshiまたはGrepで、今回の知見に関連する既存lessonsを検索する。
検索キー: [PJ名] + [技術タグ] + [キーワード]
```

### Step 2: 矛盾・重複チェック
```
■ 重複あり → 既存エントリを更新（confidenceを +0.1 バンプ）
■ 矛盾あり → 新しい方が正しいか検証し、古い方を削除または修正
■ 該当なし → 新規追記として残す
```

### Step 3: 統合・整理
```
■ 同一トピックに散在する知見を統合（1トピック1セクションに集約）
■ confidence [c:0.1] 以下のエントリは削除候補としてマーク
■ 3ヶ月以上更新のないエントリにdecayを適用（auto_lessonsのdecayルールに従う）
```

## 重要原則

- **LLMの内部知識ではなく、実際にツール実行で観測された結果のみを記録する**
- 「〜だと思う」「一般的に〜」は記録しない。「実行した結果〜だった」のみ
- 記録は追記だけでなく、編纂（検索・更新・削除）を含む
- 知識の膨張を防ぐため、統合と削除を積極的に行う

## Query Write-back ループ — 2026-04-16追加

> **出典**: LLM Wikid (x.com/shannholmberg/status/2044111115878326444, Karpathy LLM Knowledge Bases派生)

「質問するたびにナレッジが豊かになる」フィードバックループ。

### 仕組み

search-yoshiやGrepで**有意義な検索結果**が得られた場合、その結果をbrain/に書き戻す。
次回の同じ質問は、前回の回答も含めたより豊かなコンテキストで答えられる。

### Write-back判定基準

全ての検索結果を書き戻すわけではない。以下の条件を**全て**満たす場合のみ:

1. **複数ソースの統合**: 2つ以上のlessons/brainページを横断して合成した回答である
2. **新しい洞察**: 個々のソースには書かれていない、統合によって初めて見える知見がある
3. **再利用可能性**: 今後同じ質問が来る可能性が高い（一回限りの調査ではない）

### Write-back先

```
memory/brain/concepts/{topic-slug}.md   ← 概念・フレームワークに関する統合知見
memory/brain/projects/{pj-slug}.md      ← PJ固有の統合知見（既存ページのTimeline追記）
memory/lessons/{topic}.md               ← 技術的な統合知見（既存ファイルに追記）
```

### Write-backフォーマット

```markdown
- [query-writeback] {統合知見の1行サマリー} — 元クエリ: "{検索クエリ}", ソース: [{ソース1}, {ソース2}] (YYYY-MM-DD)
```

### 実行タイミング

- 親方猫の開始ゲート（dev-lessons検索）で有意義な統合が発生した場合
- 仕事猫がsearch-yoshiで調査した結果が上記3条件を満たす場合
- `/takeover` 時のsearch-yoshi検索で有意義な統合が発生した場合

### 注意

- 書き戻すのは**統合知見のみ**。個々のソースの内容をコピーしてはならない（情報の重複防止）
- brain/スキーマ（`memory/brain/schema.md`）に従ったフォーマットで書き戻すこと
- Write-backしたエントリにも `[c:0.5]` を付与（未検証扱い）

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| genba-neko | During work | auto_lessonsで知見を `[c:0.5]` で記録（従来通り） |
| shigoto-neko | Completion gate (知見メタ評価) | 3ステップ編纂を実行（検索→矛盾チェック→統合） |
| shigoto-neko | On technique extraction | technique知見をタグ `[technique]` で分類 |
| shigoto-neko | On fact extraction | fact知見をタグ `[fact]` で分類 |
| oyakata-neko | Start gate (dev-lessons検索) | technique/factタグでフィルタリング可能 |
| oyakata-neko | Start gate / takeover (検索結果統合時) | Write-back判定 → 3条件を満たせばbrain/lessons/に書き戻し |
| shigoto-neko | 調査タスク完了後 | search-yoshi結果のWrite-back判定 |
