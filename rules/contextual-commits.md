# Contextual Commits（v0.1.0 準拠）

> コミットメッセージに「なぜ」を構造化して埋め込む規約。
> 仕様: https://github.com/berserkdisruptors/contextual-commits

## フォーマット

```
<type>(<scope>): <subject>          ← Conventional Commit（従来通り）

<action-type>(<scope>): <description>  ← アクションライン（0行以上）
<action-type>(<scope>): <description>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

## アクションタイプ（5種）

| タイプ | 記録するもの | 書くタイミング |
|--------|-------------|--------------|
| `intent(scope)` | 意図・目的 | なぜこの変更をしたか、diffから読めない場合 |
| `decision(scope)` | 選択した手段と理由 | 代替案がある技術選定をした場合 |
| `rejected(scope)` | 却下した代替案＋理由 | **理由なしの却下は禁止**（SPEC Rule 13） |
| `constraint(scope)` | 制約条件 | 実装を縛るハードリミットを発見した場合 |
| `learned(scope)` | 発見した知見 | APIの罠、非自明な振る舞いを発見した場合 |

## いつ書くか

| コミットの種類 | アクションライン |
|--------------|----------------|
| typo修正、フォーマット、依存バンプ | 不要（ゼロ行でOK） |
| バグ修正（原因が自明） | 不要〜1行（constraintやlearnedがあれば） |
| 機能追加・リファクタ（設計判断あり） | 書く（intent + decision が最低限） |
| 代替案を検討して却下した | **必ず書く**（rejected が最も価値が高い） |
| 外部API・ライブラリの罠を踏んだ | 書く（learned） |

**原則: diffで分かることは書かない。diffで分からない「なぜ」だけを書く。**

## scope のルール

- 小文字英数字＋ハイフン: `auth`, `oauth-library`, `redis-cluster`
- プロジェクト内で一貫させる: `auth` と `authentication` を混ぜない
- subject-line の scope とは独立（異なってOK）

## 猫軍団固有ガイドライン

### lessons/ との棲み分け
- **コミット**: その場の判断記録（point-in-time）。git history に残る
- **lessons/**: 複数セッション横断の教訓（accumulated）。パターン化されたもの
- 同じ知見が両方に書かれてもOK（冗長は許容、消失は許容しない）

### エージェント別の責務
- **現場猫**: 実装コミット時にアクションラインを付与
- **玄人猫**: レビューでアクションラインの品質チェック（diffと重複してないか、rejectedに理由があるか）
- **仕事猫**: 計画書の設計判断をコミットの decision/rejected に転記するよう指示

### fabrication禁止（SPEC Rule 14）
前セッションのコンテキストが不明な場合、推測でアクションラインを捏造しない。
diffから明らかな技術選択のみ `decision()` として書いてOK。
`intent`, `rejected`, `constraint`, `learned` は証拠なしに書かない。

## 例

```
feat(auth): implement JWT authentication

intent(auth): stateless auth for horizontal scaling
decision(auth-library): jose over jsonwebtoken — ESM native, maintained
rejected(auth-library): jsonwebtoken — CJS only, 2y no release
constraint(token-expiry): max 15min per security policy
learned(jose): importSPKI requires PEM format, not JWK

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

## クエリ例

```bash
# 過去にauthで却下された手段を全件検索
git log --all --grep="rejected(auth"

# constraintの一覧
git log --all --grep="constraint(" --oneline

# 特定scopeのlearned
git log --all --grep="learned(redis" --format="%B" | grep "^learned("
```
