# 猫軍団 - Claude Code マルチエージェントオーケストレーション

[![CI](https://github.com/aliksir/neko-gundan/actions/workflows/ci.yml/badge.svg)](https://github.com/aliksir/neko-gundan/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/aliksir/neko-gundan)](https://github.com/aliksir/neko-gundan/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **推奨: 対話形式セットアップ**
> ```bash
> git clone https://github.com/aliksir/neko-gundan.git
> cp -r neko-gundan/skills/welcome-neko ~/.claude/skills/
> # Claude Codeで /welcome-neko を実行
> ```
> `/welcome-neko` がモード選択・インストール・初期設定を対話でガイドします。手動設定は不要。

**[English README](README.md)** | **PROプラン？ → [子猫軍団（ライト版）](README.koneko.ja.md)**

> Claude Codeは1体でもコードを書ける。でも自分のミスを自分で見つけたり、悪い判断を止めたり、複数ファイルを安全に協調して変更することはできない。猫軍団は作業をチームに分割する — コードを書いた猫がレビューすることは絶対にない。

## こんな人・使い方に向いている

**向いている:**
- エージェントにファイルを消された、動いてたコードを壊された、「確認しました」が嘘だった経験がある
- 品質事故がリアルに時間を奪うプロダクト開発をしている（使い捨てプロトタイプではない）
- AI生成コードにセカンドオピニオンが欲しいが、毎行レビューはしたくない
- 複数ファイルの変更を並列で進めたいが、エージェント同士の衝突が怖い

**向いていない:**
- プロトタイプや実験が主で、正確さより速さが優先
- 100体以上の専門エージェントのカタログが欲しい — [VoltAgent](https://github.com/VoltAgent/core) や [wshobson/agents](https://github.com/wshobson/agents) を検討してほしい
- `quality` や `security` 1モードでも重く感じる — 標準のClaude Code subagentsで十分かもしれない

猫軍団は万能ツールではない。こだわっているのは一つだけ: **「終わった」ではなく「正しいと証明された」。**

## おすすめ構成 — 「迷ったらこれ」

| あなたの状況 | おすすめ構成 | 理由 |
|------------|------------|------|
| 個人開発、安全ネットが欲しい | `security` | エージェント不要。誤削除・危険操作を防ぐルールだけ |
| 小規模プロダクト、品質が大事 | `quality+security` | レビュアー1体 + 安全ルール。コスパ最良のスタート地点 |
| 複数ファイル変更、チーム規模 | `all` | フルチーム構造。通常タスクは標準、リリースは厳密に |

まず軽く始めて、後から追加できる。`install.sh` を再実行するだけでモード追加可能。

## クイックスタート（上級者・CI向け）

手動インストールやCI統合が必要な場合は、インストーラを直接実行:

```bash
git clone https://github.com/aliksir/neko-gundan.git

# 必要なモードだけ選んでインストール
bash neko-gundan/scripts/install.sh quality+security ./your-project

# または全部入り
bash neko-gundan/scripts/install.sh all ./your-project
bash neko-gundan/scripts/setup.sh  # ランタイムディレクトリを初期化
```

インストーラが必要なファイルだけコピーし、CLAUDE.mdに追加するスニペットを表示する。アップデートやフック設定の詳細は [アップデートガイド](docs/update-guide.ja.md) と [フックガイド](docs/hooks-guide.ja.md) を参照。

> **フレームワーク全体は要らない？** `security`（エージェント不要、安全ルールだけ）や `quality`（レビュアーだけ）から始められる。[全モード詳細](docs/modes.ja.md)

## あなたがやることは3つだけ

1. **インストール** — モードを選んでインストーラを実行。30秒で終わる。
2. **タスクを伝える** — 普通の言葉でやりたいことを言う。「ライトで」「厳密に」で丁寧さを調整。
3. **証拠を確認する** — エージェントは「終わりました」ではなく証拠（テスト結果、diff）を出す。あなたはコードではなく証拠を確認する。

役割の割り当て、レビュー分離、異議申立、安全チェック — 全部裏で勝手に回る。

## 1分デモ

小さな変更依頼を投げたらどう動くか:

```text
> /neko-gundan "設定画面にダークモード切替を追加して"

[oyakata-neko]   READ   Purpose/, plans/ を読み込み — 偵察規模、仕事猫 1 体
[oyakata-neko]   PLAN   plans/20260524_dark-mode-toggle.md（合格基準 C1-C5、Pre-Mortem 4 件）
[oyakata-neko]   DESIGN designs/20260524_dark-mode-toggle.md（CSS 変数 + localStorage）
[kurouto-neko]   REVIEW 設計 — APPROVE（evidence_level: static_check_passed）
[shigoto-neko]   IMPL   src/settings/DarkModeToggle.tsx, src/styles/theme.css
[kurouto-neko]   REVIEW コード — Adversarial Q1-Q5 全 PASS
                        APPROVE（evidence_level: test_passed）
[oyakata-neko]   GATE   完了ゲート — 成果物 5 種揃い、CR-1〜CR-6 違反 0
[oyakata-neko]   DONE   result/20260524_dark-mode-toggle.md
```

**書いた猫はレビューしない。** あなたが見るのは「終わりました」ではなく証拠（成果物、evidence_level、ゲート結果）。diff を読まなくても、証拠が記録されていなければフレームワークがタスク完了を拒否する。

## 仕組み

```
総司令（人間）
    |
親方猫（親方 / Opus）--- 戦略立案・委譲
    |
仕事猫（中間管理職 / Sonnet）--- タスク分解・品質確認
    |
現場猫（実働部隊 / Sonnet）--- 実装
    |
玄人猫（専門家 / Opus）--- 独立レビュー
```

タスクの規模に応じて自動的にチーム編成を調整:

| 規模 | 判定基準 | 編成 |
|------|---------|------|
| 偵察 | 質問・調査 | 親方猫が直接対応 |
| 小隊 | 1-2ファイル、または3-5ファイルの単純リファクタ | 仕事猫が単独対応 |
| 中隊 | 3-5ファイル AND 設計判断を含む | 仕事猫 + 現場猫1-2体 |
| 大隊 | 6ファイル以上 | 仕事猫 + 現場猫3体 |

## 主要機能

### 設計→実装→レビューの必須フロー

全タスクは**計画 → 設計 → 実装 → 品質確認**に従う。設計書（`designs/`）は必須成果物で、`commit-guard` hookが不在時にコミットをブロック。「何を変えたか」だけでなく「なぜそう作ったか」を常に遡れるようにする。

### フェーズ別独立実行

```bash
/neko-gundan design "認証機能を追加"          # 設計のみ
/neko-gundan implement "plans/auth.md"        # 実装のみ
/neko-gundan review "feature/auth ブランチ"    # レビューのみ
/neko-gundan test "src/auth/"                 # テストのみ
/neko-gundan "認証機能を追加"                  # 全フロー（デフォルト）
```

各フェーズに専用の軽量ゲートあり。詳細は [WORKFLOW.md](docs/WORKFLOW.md#フェーズ別独立実行) を参照。

### 実装者 != レビュアー

1. コードを書いた猫が自分でレビューすることは**絶対にない**
2. レビュアーは**読み取り専用** — 指摘のみ、コード変更禁止
3. 3サイクル超過で仲裁者（Opus）が最終判断

**Adversarial 2nd-Pass（Clearwing由来、v1.10.x）**: レビュアーは APPROVE を出す直前に同一サイクル内で敵対的再検証を実行する（Q1: 壊れるエッジケースは? Q2: 合格基準の見落とし観点は? Q3: 実装者が認識していないリスクは? Q4: 実装者が「指示になかったが裁量補完で埋めた箇所」は? Q5: 実装が証明できない仕様プロパティは?）。3サイクル上限には加算しない。中隊+で必須、小隊で推奨。出典: [Lazarus-AI/clearwing](https://github.com/Lazarus-AI/clearwing)（MIT）

**Evidence Level Ladder**: APPROVE 判定に証拠レベル6段階（`suspicion → static_check_passed → test_passed → root_cause_explained → integration_verified → production_validated`）を付記。合格基準で「レベルN以上」を要求してタスクごとに基準を引き上げ可能。

### 異議を申し立てるエージェント

不適切な指示に**異議を申し立てる義務**がある。各異議には**事実 + 懸念 + 代替案**が必要。

- **OBJECTION-001**（現場猫 → 仕事猫）：「この指示は既存機能を壊します」
- **OBJECTION-002**（仕事猫 → 親方猫）：「この戦略は目的と矛盾しています」
- **OBJECTION-003**（玄人猫 → 仕事猫）：「この設計には欠陥があります」

### 証跡ベースの品質ゲート

「確認した」は許されない — 「これが証拠だ」だけが有効。全タスクは証跡付きのゲートを通過する。

### 安全対策

- **ファイル削除安全策**: 即削除せず `_deleted/` に退避
- **競合防止**: 同一ファイルの同時編集を禁止
- **信頼レベル（FIDES）**: 外部データはLOW信頼としてタグ付け
- **破壊操作Tier**: Tier 1は絶対禁止、Tier 2は要確認
- **カスケード障害防止（CASCADE-001）**: ホワイトボード上の `←` 記法でタスク依存を宣言。上流タスク失敗時に下流を自動ブロック
- **Fan-Out/Aggregate（FANOUT-001）**: 並列エージェントの結果を3フェーズ（Fan-Out→Collect→Aggregate）で構造化統合。矛盾・重複を自動検出
- **物理スイッチ（cwc由来、v1.10.0）**: `touch ~/.claude/AGENT_STOP` で全ツール呼出を即停止、`echo "<指示>" > ~/.claude/STEER.md` で次のツール呼出時に1回だけ方向修正。pre-tool-use hookで surface。出典: [anthropics/cwc-long-running-agents](https://github.com/anthropics/cwc-long-running-agents)（Apache-2.0）
- **夜間 autopilot ガード（v1.10.0）**: 23:00〜07:00 JST の nightly-runner は Draft PR 必須、`master`/`main` 直 push 禁止、tier-2 破壊操作の自動エスカレーション、`--no-verify` バイパス検出を強制
- **コード出所・ライセンスチェック（v1.10.x）**: レビュー時に出所不明のコード混入がないか、全依存のライセンスが互換性を持つかを検証。ライセンス分類表（許可/要注意/禁止/不明）で設計ゲート段階から禁止ライセンスをブロック — 不明は禁止扱い
- **neko-kensa 自動解析（v1.10.x）**: 依存ゼロの内製コード品質検査ツールがレビュー Phase 2 開始時に自動実行。`lint`（巨大ファイル/過度な依存/未解決import/深い継承/シンボル過多）+ `deps`（循環依存/ルール違反）を code-graph DB から検出し、レビュー findings に自動統合。人間のレビューは設計判断に集中

### 探索モード（ツリー探索、v1.10.x）

最適解が自明でないタスクに対して、仕事猫が複数の解の枝それぞれを試す並列現場猫を独立 git worktree で spawn する（ツリー探索）。結果をスコア付けして優勝枝を採用、棄却枝の理由は `lessons/` に自動記録され次回の探索モード発動時に既知の失敗アプローチを回避できる。設計案が複数あって「間違った選択のコストが高い」タスクで使う。デフォルト無効、タスクごとに `exploration` フラグで opt-in。

### サンドボックスエージェント

サブエージェントにタスク種別に応じたツールレベルの制限を付与。レビュアーはコード編集不可、ドキュメント担当はBash実行不可。指示ではなく構造で制約を強制する。

| プロファイル | 許可ツール | 用途 |
|------------|-----------|------|
| `read-only` | Read, Glob, Grep | コードレビュー、調査 |
| `docs-only` | Read, Write, Glob, Grep | ドキュメント作成 |
| `no-bash` | Bash以外全て | シェル実行が不要/リスクの高いタスク |
| `no-db` | DB変更コマンド以外 | DB変更がスコープ外のタスク |
| `research` | Read, Glob, Grep, WebSearch, WebFetch | 外部リサーチ |

3層隔離: **worktree（git）> race prevention（ファイル）> sandbox（ツール）**

### pass@k 信頼性メトリクス

高リスクタスク（DB変更、セキュリティコード、EDI連携）では検証をk回独立実行し成功率を測定。pass@3 = 2/3 は「だいたい動くが非決定的な挙動がある」というフレーキーのシグナル。単一実行テストでは見逃す問題を検出する。

### 知識の信頼度スコアリング

`memory/lessons/` の各教訓に信頼度スコア `[c:0.0-1.0]` を付与。別PJで確認されればスコア上昇、60日間再確認なければ減衰、0.0到達で自動アーカイブ。0.9+かつ3PJ以上で確認されれば恒久ルールへの昇格候補。戦場で鍛えられた教訓が昇格し、古くなった教訓が退場する自己改善パイプライン。

### 観測可能性

| 機能 | 何が見えるか | 詳細 |
|------|------------|------|
| **チェックリスト外出し** | ゲート結果と証跡 | [しつけガイド](docs/shitsuke-guide.ja.md) |
| **品質メトリクス** | ゲート通過率・スキップ率・レビュー周回数・pass@k | [しつけガイド](docs/shitsuke-guide.ja.md) |
| **生ログ** | 全Edit/Bash/判断の監査証跡 | [しつけガイド](docs/shitsuke-guide.ja.md) |
| **監査証跡** | トレーサビリティ・承認ログ・変更管理 | [しつけガイド](docs/shitsuke-guide.ja.md) |

### モードとプロセスウェイト

| いつ決めるか | 仕組み | 何を制御するか | 例 |
|-------------|--------|---------------|---|
| **導入時に** | [モード](docs/modes.ja.md) | `.claude/` に何を入れるか | `quality+security` |
| **依頼ごとに** | [プロセスウェイト](docs/process-weight.ja.md) | どこまで厳密に回すか | 「ライトで」「厳密に」 |
| **依頼ごとに** | [オートパイロット](modules/autopilot.md) | 計画承認後の自動実行 | 計画承認→完了まで自動 |
| **運用ポリシーとして** | [しつけ](docs/shitsuke-guide.ja.md) | どの機能を有効にするか | `heartbeat: false` |
| **絶対に崩さない** | 安全対策 | 下げてはいけない最低ライン | `_deleted/`、競合防止 |

## 設計思想

全てのプロトコルは、それがなかったために問題が発生した実際のインシデントに基づいている。

| インシデント | 対策 |
|------------|------|
| エージェントが自分のミスに気づけなかった | 独立レビュアーの必須化 |
| 不適切な指示がそのまま実行された | 双方向異議申立プロトコル |
| 「確認した」に証拠がなかった | 証跡ベースの完了ゲート |
| ファイルを誤って即削除した | `_deleted/` 安全バッファ |
| タスク途中でコンテキストを喪失した | ホワイトボード知識共有 |
| 上流タスクの失敗で下流の作業が無駄になった | カスケード障害自動ブロック（CASCADE-001） |
| 並列結果が構造化されずにマージされた | Fan-Out/Aggregate 3フェーズ統合（FANOUT-001） |

[ケーススタディ](docs/case-studies.ja.md)で具体的な適用例を見る。

## トレードオフ

**最終判断は人間。** レビュアーと実装者は同じモデルファミリーなので同じ盲点を共有し得る。「より良い初稿」であって「レビュー不要」ではない。

| 増えるコスト | 減るコスト |
|---|---|
| トークン消費（中隊規模で2〜3倍） | エージェントが仕込んだバグのデバッグ |
| 初回レスポンス時間 | 誤ファイル削除からの復旧 |
| `.claude/` のプロンプト複雑さ | 「完了」を自称する未検証作業の再レビュー |

安全ルール（`security` モード）はほぼコストゼロ。[他ツールとの比較](docs/comparison.ja.md)も参照。

## ドキュメント

| ガイド | 内容 |
|--------|------|
| [モードガイド](docs/modes.ja.md) | 必要なものだけ選んで組み合わせる |
| [プロセスウェイト](docs/process-weight.ja.md) | ライト / 標準 / ストリクト |
| [ワークフロー](docs/WORKFLOW.md) | フェーズ別独立実行の詳細 |
| [しつけガイド](docs/shitsuke-guide.ja.md) | モジュールシステムの設定 |
| [フックガイド](docs/hooks-guide.ja.md) | Gate Guard / Commit Guard の設定 |
| [アップデートガイド](docs/update-guide.ja.md) | 差分更新・自動チェック |
| [アーキテクチャ](docs/architecture.md) | システム設計とエージェント間連携 |
| [プロトコル一覧](docs/protocols.md) | 全プロトコル定義 |
| [ハーネスエンジニアリング](docs/harness-engineering.ja.md) | 設計原則とアンチパターン防御 |
| [Auto Mode](docs/auto-mode.ja.md) | 自動権限モードとの併用 |
| [他ツール比較](docs/comparison.ja.md) | Subagents / LangGraph / CrewAI との違い |
| [ケーススタディ](docs/case-studies.ja.md) | 実プロジェクトでの適用例 |
| [CLAUDE.md の例](examples/CLAUDE.md.example) | 完全な設定例 |
| [テンプレ選び方とカスタマイズ](examples/README.md) | TypeScript / Python / Go 言語別テンプレの選び方、カスタマイズ手順、完成イメージ |
| [品質ゲート](gates/) | 開始・完了・設計フェーズのゲート定義（チェックリスト付き） |
| [YAML定義](yaml/) | エージェント・ルール・モジュール・ゲートの機械可読YAML版 |

## コントリビュート

1. 既存のエージェント定義スタイルに従う
2. 新プロトコルにはプロトコルIDを付与（例: `NEWPROTOCOL-001`）
3. 新機能には使用例を付ける
4. 提出前にClaude Codeの実セッションでテストする

## ライセンス

MIT License - 詳細は [LICENSE](LICENSE) を参照。

## 謝辞

- [Claude Code](https://github.com/anthropics/claude-code)（Anthropic）向けに構築
- 発想の土台 — Claude Codeでのマルチエージェント運用 — は[おしおさんのこの記事](https://zenn.dev/shio_shoppaize/articles/5fee11d03a11a1)から
- [仕事猫 / 現場猫](https://dic.nicovideo.jp/a/%E4%BB%95%E4%BA%8B%E7%8C%AB)のインターネットミームキャラクターに着想
- レビュープロトコルは [takt](https://www.npmjs.com/package/takt) オーケストレーションツールに着想
- Reflexionパターンは [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366) に基づく
- pass@kメトリクス、信頼度スコアリング、サンドボックスエージェントは [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) に着想
- 物理スイッチ（kill-switch / steer hooks、v1.10.0）は [anthropics/cwc-long-running-agents](https://github.com/anthropics/cwc-long-running-agents)（Apache-2.0）に由来
- Adversarial 2nd-Pass + Evidence Level Ladder（v1.10.x）は [Lazarus-AI/clearwing](https://github.com/Lazarus-AI/clearwing)（MIT）に着想
