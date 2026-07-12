# Dynamic Workflow テンプレート（大隊規模・委譲用）

> このテンプレートは Claude Code の Dynamic Workflows に大隊規模の作業を委譲するときのガイドです。
> フォーマットの完全一致は不要。LLM が読めれば十分です。
> SSOT は `modules/dynamic-workflows.md`（機能の事実・委譲判断・レビュー規律・名前空間防御の正本）。
> 本テンプレートは「いつ使うか」「最小スクリプト骨格」「保存方法」「レビュー規律」の実用ガイドに絞る。
> 公式ドキュメント: https://code.claude.com/docs/en/workflows

---

## 1. いつ使うか（適用条件）

Dynamic Workflow への委譲を検討するのは、規模が**大隊**（6+ ファイル or 大規模）であり、かつ以下のいずれかに該当するときだけ。

- **codebase 横断監査**: 全体スキャン型（セキュリティ / 品質 / 規約 / 依存）
- **大規模機械的移行**: 定型変換が大量（API 旧→新シグネチャ一斉置換、設定形式の一括移行、命名規約の大量リネーム等）
- **クロス検証リサーチ**: 独立エージェントが相互検証して結論を収束させる調査

### 委譲しない条件（fail-safe）

- 各ステップで人手の中間承認が必要（Dynamic Workflow は run 中の途中入力不可）
- 人間が逐次確認する**可読成果物**が必須（Dynamic Workflow の中間結果はスクリプト変数に保持され、目視向きでない）
- 規模が中隊以下（オーバーキル）
- CPU 競合がある（TeamCreate が稼働中だと 16 体ローカル並列で CPU が枯渇する）
- 機能が OFF / 未ロールアウト → **委譲せず TeamCreate にフォールバック**

> Dynamic Workflows と TeamCreate は補完関係。
> TeamCreate = 人手の中間承認 + 可読成果物が要る作業。
> Dynamic Workflow = 中間承認不要で大量並列・自律収束が効く探索的作業。

---

## 2. 最小スクリプト骨格（fan-out + 敵対的検証）

実際のスクリプトは Claude が run 時に生成する。以下は**設計意図のドラフト**であり、構造把握用の骨格。
中間結果はスクリプト変数に保持されるため、親方猫（オーケストレーター）のコンテキストを消費しない。

```javascript
// 大隊規模ワークフローの最小骨格（実行は /workflows ランタイム）
// meta: run の識別情報（保存時に neko- 接頭辞を付ける）
export const meta = {
  name: "neko-<task-name>",   // 保存時は neko- 接頭辞必須
  description: "大隊規模の横断監査 / 大規模移行 / クロス検証",
};

export default async function ({ agent, parallel, pipeline, phase }) {
  // Phase 1: Map — 対象を機能単位（semantic source groups）に分割
  //   横断監査なら group = [{name, type, files}]
  //   移行なら     対象集合 = glob/grep で確定、pattern = {from, to, 例外条件}
  const groups = await phase("map", async () => {
    return await agent("対象を機能単位に分割し groups を返す");
  });

  // Phase 2: Work fan-out — 機能単位ごとに独立サブエージェントを並列起動（最大16同時）
  //   各エージェントが担当 group を処理（監査 / 変換 / 調査）
  const drafts = await phase("work", async () => {
    return await parallel(
      groups.map((g) => agent(`group ${g.name} を処理し findings/draft を返す`))
    );
  });

  // Phase 3: Adversarial verify（予備審査）— 別エージェント群が drafts を反証
  //   反証で生き残った結果のみ採用（自律収束）。これは予備審査であり最終 APPROVE ではない
  const verified = await phase("verify", async () => {
    return await parallel(
      drafts.map((d) => agent(`draft を反証し、生き残った結論だけ返す: ${d.id}`))
    );
  });

  // Phase 4: Dump — run 成果物を result/ + audit/ に書き出す
  //   ※ここまでが Workflow。最終 APPROVE は Workflow 外の kurouto-neko が行う
  return await pipeline(verified, (v) => agent("verified を result/audit にダンプ"));
}
```

> 上記の Phase 構成は説明用の例。実プロジェクトでは対象の実態に合わせて調整する。

---

## 3. 保存方法（名前空間衝突の防止）

完了した run は `/workflows` → 対象 run を選択 → `s` で保存できる。保存先と命名を必ず守ること。

- **保存先**: プロジェクト側 `.claude/workflows/` を選ぶ（ホーム側 `~/.claude/workflows/` は**禁止**）
- **命名**: `neko-` 接頭辞を付ける（例: `neko-audit`、`neko-migration`）

### なぜ分離するか

ホーム側 `~/.claude/workflows/*.md`（bug-fix / new-feature / refactor / security-audit / research）は**手順書**（how-to）で、開始ゲートのルーティング表が Read する対象。
Dynamic Workflow の保存スクリプトは同じ `.md` 拡張子だが中身は JS オーケストレーション。混在するとゲートが JS を手順書として誤読する。

防御:
1. Dynamic Workflow の出力はプロジェクト側 `.claude/workflows/` に `neko-` 接頭辞でのみ保存（ホーム側に置かない）
2. 開始ゲートに「`neko-*` workflow はルーティング表の Read 対象外」と注記
3. 手順書（how-to）と実行エンジン（JS）の役割差をドキュメント化

---

## 4. レビュー規律（厳守）

Dynamic Workflow 内部の敵対的相互レビューは**予備審査**であり、猫軍団の implementer ≠ reviewer / Adversarial 2nd-Pass / Evidence Level Ladder / 5段フェーズとは**別レイヤー**。Workflow に委譲しても最終レビューは置き換わらない。

- 最終 APPROVE は**必ず Workflow 外の kurouto-neko（玄人猫）**が行う
- Workflow を起動した親方猫がレビューを兼任してはならない（implementer ≠ reviewer 違反）
- run 成果物は `result/` + `audit/` にダンプしてから Evidence Level Ladder で判定する（スクリプト変数のままでは判定不能）
- ループ上限 3 回・仲裁者エスカレーションは Workflow の**外側**（猫軍団レビューループ）に適用。Workflow 内部の収束回数とは別カウント

---

## 5. 機能の事実・制約（要点）

- **ローカル実行**: バックグラウンドで JS スクリプトを実行し、サブエージェントを大規模統括する。最大 16 体同時（CPU バウンド）、1 run あたり総計 1000 体まで
- **コスト**: 既存サブスクリプションの usage 枠を消費。外部 API 課金なし・データはマシン外に出ない
- **起動 3 経路**: (1) プロンプトに `workflow` キーワード（誤発火は alt+w で無視）、(2) `/effort ultracode`（xhigh + 自動統括、セッション限定。`/effort high` で戻る）、(3) 同梱の `/deep-research <question>`
- **制約**: run 中の途中入力不可、同一セッション内のみ resume 可、別セッションはゼロから
- **OFF**: `/config` トグル、settings.json の `disableWorkflows:true`、環境変数 `CLAUDE_CODE_DISABLE_WORKFLOWS=1`

---

## 6. 棚卸し

research preview のため挙動・コマンドは変わりうる。preview → GA 移行時に再検証すること。
採用していない場合も dormant rule として保持し、削除しない。
