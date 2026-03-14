# モード — 必要なものだけ入れる

猫軍団は部分導入を前提に設計されている。フレームワーク全体は必要ない — 解決したい課題に合うモードだけ選べばいい。

## 利用可能なモード

### koneko — 「同じ原則を、PROプランの予算で」

PROプランユーザー向けの軽量版。独立レビューと証跡ベースのゲートを、最小限のトークンコストで提供する。

**何が入るか:**
- `koneko-neko`（軽量レビュアー — タスクごとに1回のAgent呼び出し）
- 子猫ゲート（3項目の簡易完了チェック）
- 安全Tier（Tier 1禁止、Tier 2要確認）
- ファイル削除安全バッファ（`_deleted/`）

**入らないもの:** マルチエージェント階層、並列実行、モジュール、ホワイトボード。

**こんな人向け:** フル版猫軍団のトークンコストは払えないが、品質ガードレールは欲しいPROプランユーザー。

```bash
bash neko-gundan/scripts/install.sh koneko ./your-project
```

[詳細ガイド](koneko.ja.md)

---

### quality — 「自己レビューをやめる」

独立レビュアーエージェントと証跡ベースの完了ゲートを追加。コードを書いた猫がレビューすることは絶対にない。

**何が入るか:**
- `kurouto-neko`（構造化ルブリックによるレビュアーエージェント）
- レビュープロトコル（実装者 != レビュアー、最大3サイクル）
- 完了ゲート（「確認した」ではなく証跡が必要）
- Reflexion（構造化された失敗分析）
- Linter設定保護（エージェントはコードを直す。lint設定を直さない）
- 生ログ（エージェントの全行動の監査証跡 — opt-in）
- 監査証跡（トレーサビリティ・承認ログ・変更管理・監査サマリー — opt-in）
- PostToolUse自動lintフック（書き込み時にミリ秒レベルのフィードバック）

**こんな人向け:** セカンドオピニオンが欲しいソロ開発者、形骸化したレビューに疲れたチーム。

```bash
bash neko-gundan/scripts/install.sh quality ./your-project
```

---

### implement — 「並列作業を安全に回す」

タスクを複数エージェントに分割して安全に並列実行するためのマネージャー・ワーカーエージェントを追加。

**何が入るか:**
- `shigoto-neko`（マネージャー: タスク分解、進捗監視）
- `genba-neko`（ワーカー: 実装、スタック検出付き）
- 競合防止（同一ファイルの同時編集を禁止）
- Heartbeatプロトコル（スタック検出とエスカレーション）

**こんな人向け:** 多数のファイルに触る大規模変更、並列化で効率を上げたいタスク。

```bash
bash neko-gundan/scripts/install.sh implement ./your-project
```

---

### plan — 「コードを書く前に考える」

戦略立案、タスク分解、エージェント間の知識共有を追加。

**何が入るか:**
- `oyakata-neko`（将軍: 戦略、委譲、仲裁）
- ホワイトボードシステム（エージェント間の発見共有）
- Intent State Vector（意思決定の理由を記録）
- 仕様駆動レビュー（要件との整合性を検証）

**こんな人向け:** 事前設計が必要な複雑な機能、複数フェーズにまたがるプロジェクト。

```bash
bash neko-gundan/scripts/install.sh plan ./your-project
```

---

### security — 「事故を防ぐ」

安全ルールと信頼レベルを追加。エージェント不要 — ルールだけで動作する。

**何が入るか:**
- 安全Tier（Tier 1は絶対禁止、Tier 2は要確認）
- `_deleted/` ファイル安全バッファ（即削除しない）
- FIDES信頼レベル（外部データはLOWタグ付け）
- 競合防止

**こんな人向け:** エージェントに間違ったファイルを消された経験がある全ての人。

```bash
bash neko-gundan/scripts/install.sh security ./your-project
```

---

## モードの組み合わせ

モードは独立しており、自由に組み合わせられる。`+` で結合:

```bash
# レビュー品質 + 事故防止（チーム階層不要）
bash install.sh quality+security ./your-project

# 計画+実装のフルチーム
bash install.sh plan+implement ./your-project

# 全部入り（従来のfullインストール相当）
bash install.sh all ./your-project
```

## よくある組み合わせ

| 目的 | モード | 得られるもの |
|------|--------|-------------|
| 「PRO予算で品質を上げたい」 | `koneko` | 軽量レビュアー + 安全ルール |
| 「コードレビューだけ改善したい」 | `quality` | 独立レビュアー + 証跡ゲート |
| 「誤削除を防ぎたい」 | `security` | 安全Tier + _deleted/バッファ |
| 「レビューも安全も欲しい」 | `quality+security` | 両方（チーム階層不要） |
| 「大規模リファクタリング」 | `implement+quality` | 並列ワーカー + レビュー |
| 「計画から実装まで」 | `plan+implement+quality` | 戦略 + ワーカー + レビュー |
| 「全部入り」 | `all` | 4モード全部 |

## ダウングレード

MAXからPROに切り替え？安全にダウングレードできる:

```bash
bash install.sh --downgrade koneko ./your-project
```

不要ファイルは `_deleted/` に退避される（即削除しない）。ダウングレード後にCLAUDE.mdのスニペットを更新すること。

## 後から追加OK

小さく始めて、必要に応じてモードを追加できる。インストーラは既存ファイルをスキップするので、安全に再実行可能:

```bash
# まずqualityだけ
bash install.sh quality ./your-project

# 後からimplementを追加
bash install.sh implement ./your-project

# さらにplanも追加
bash install.sh plan ./your-project
```

## アップストリームからの更新

neko-gundanの新バージョンがリリースされたら、`--update`で差分確認:

```bash
cd neko-gundan && git pull
bash scripts/install.sh --update all ./your-project
```

変更があるファイルごとにdiffを表示し、選択できる:
- **y** — 新バージョンで上書き
- **n** — 手元のバージョンを維持
- **d** — フルdiffを見てから判断

カスタマイズしていないファイルは「up to date」と表示され、操作不要。

## モードの位置づけ — 全体像

猫軍団には4つの独立した仕組みがある。モードはその1つ:

| 判断 | 仕組み | いつ | 例 |
|------|--------|------|---|
| **何を入れる？** | **モード**（このページ） | `install.sh` | `quality+security` |
| **どこまで回す？** | [プロセスウェイト](process-weight.ja.md) | タスクごと | 「ライトで」「厳密に」 |
| **何をON/OFFする？** | [しつけ](shitsuke-guide.ja.md) | `config.yaml` | `heartbeat: false` |
| **何が常に守られる？** | 安全対策 | 常時 | 削除安全策、競合防止 |

**モード vs しつけ:**
- モード = `.claude/` にどのファイルがあるか（粗い、インストール時）
- しつけ = どの機能が有効か（細かい、インストール後いつでも）

**使い方の例:**
1. `implement` モードをインストール → 仕事猫、現場猫、heartbeat、race-prevention等が入る
2. 後からしつけでheartbeatをOFF → ファイルは残るが、エージェントはプロトコルをスキップ
3. さらに後で `quality` モードを追加 → 玄人猫とレビュープロトコルが追加される

しつけは最初から必要ない。モードだけで動く構成が手に入る。
