# Knowledge Lint Module

> **Module**: `knowledge_lint` | **Default**: ON | **Scale**: All
> **出典**: LLM Wikid /wiki-lint (x.com/shannholmberg/status/2044111115878326444, 2026-04-16)

ナレッジベース（memory/brain/ + memory/lessons/）の健全性を定期チェックする「知識の衛生管理」モジュール。
矛盾検出・陳腐化チェック・孤立ページ検出・重複概念の統合を行う。

## /wiki-lintとの関係

| LLM Wikid | 猫軍団 |
|-----------|-------|
| `/wiki-lint` コマンド | `/dreaming` の一部として週次実行 |
| 矛盾・陳腐化・孤立・重複を検出 | 同じ4観点 + confidence decay |
| エージェントが修正、人間判断が必要なものをフラグ | 同じ方針 |

## 4つのlintチェック

### 1. 矛盾検出（Contradiction Check）

同じトピックについて異なる主張をしているページを検出する。

```
検出方法: search-yoshiで同一キーワードの複数ヒットを取得し、主張が矛盾していないか確認
例: lessons/web-dev.md に「Reactは18以上必須」、brain/projects/xxx.md に「React 17で動作確認済み」
対処: 新しい方を正とし、古い方を更新または削除。判断がつかない場合はフラグのみ
```

### 2. 陳腐化検出（Staleness Check）

最終更新から一定期間経過したエントリを検出する。

```
検出方法: 各エントリの日付タグ (YYYY-MM-DD) を確認
基準:
  - 90日以上未更新 → [stale] フラグ付与
  - 180日以上未更新 → 削除候補として報告
  - confidence [c:0.1] 以下 → 削除候補として報告
対処: 内容がまだ有効か確認し、有効なら日付更新、無効なら削除
```

### 3. 孤立ページ検出（Orphan Check）

brain/ 内でどこからもWikilinkされていないページを検出する。

```
検出方法: brain/ 内の全 [[wikilink]] を収集し、リンクされていないページを特定
例: brain/people/tanaka.md が存在するが、どのdeals/projects/meetingsからもリンクされていない
対処: 関連ページにリンクを追加するか、不要なら archive/ に移動
```

### 4. 重複概念検出（Duplicate Check）

異なる名前で同じ概念を指しているページを検出する。

```
検出方法: brain/concepts/ と lessons/ でタイトル・内容の類似度が高いペアを search-yoshi vector検索で特定
例: brain/concepts/harness-engineering.md と lessons/agent-ops.md の「ハーネスエンジニアリング」セクション
対処: 一方に統合し、もう一方は削除またはリダイレクト記述
```

## 実行タイミングと統合先

### 週次lint（`/dreaming` 統合）

`/dreaming` の eveningモード実行時に、**週に1回**（月曜のevening dreaming時）lintを実行する。

```markdown
## Knowledge Lint Report (週次)
<!-- /dreaming evening 時に月曜のみ自動実行 -->
- 矛盾: N件 — [詳細]
- 陳腐化: N件（90日超: X件、180日超: Y件）
- 孤立: N件
- 重複候補: N件
- 自動修正: N件 / 要判断: N件
```

### 手動lint

任意のタイミングで親方猫が実行可能。大量のbrainページ追加後やセッション棚卸し時に推奨。

```
手順:
1. memory/brain/ と memory/lessons/ の全ファイルをGlobで一覧
2. 4つのチェックを順に実行
3. 自動修正可能なもの（日付更新、[stale]フラグ付与）は即実行
4. 人間判断が必要なもの（矛盾解決、削除判断）はレポートにまとめて総司令に提示
```

## 自動修正 vs 人間判断

| チェック | 自動修正 | 人間判断 |
|---------|---------|---------|
| 矛盾 | 日付が新しい方が明確に正しい場合のみ | 両方に根拠がある場合 |
| 陳腐化 | [stale]フラグ付与、confidence decay適用 | 削除判断 |
| 孤立 | なし | リンク追加 or archive移動 |
| 重複 | なし | 統合先の判断 |

**原則: 削除は人間判断。追記・フラグ付与は自動。**

## Integration Points

| Agent | Phase | Action |
|-------|-------|--------|
| oyakata-neko | /dreaming evening（月曜） | 4チェックを実行、レポート生成 |
| oyakata-neko | 手動実行時 | 任意タイミングで全チェック |
| oyakata-neko | レポート後 | 自動修正を適用、要判断項目を総司令に提示 |
| shigoto-neko | knowledge_reflection完了後 | 大量追記があった場合にlintを推奨 |
