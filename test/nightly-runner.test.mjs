// node --test test/nightly-runner.test.mjs
// nightly-runner.mjs の expandTemplate / buildClaudeCmd の unit test
//
// 関連: plans/20260506_nightly-payload-fix.md / designs/20260506_nightly-payload-fix.md / test-plan/20260506_nightly-payload-fix.md
// レビュー: kurouto-neko 計画レビュー サイクル2 APPROVE（2026-05-06 23:46）

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  expandTemplate,
  buildClaudeCmd,
  parseYaml,
  mergePolicyPromptTemplates,
  countNonDryRunResults,
  STATUS,
} from '../scripts/nightly-runner.mjs';

// ===== T1: expandTemplate の基本動作 =====
test('T1: expandTemplate replaces {YYYYMMDD} with provided value', () => {
  const result = expandTemplate('hello {YYYYMMDD}', { YYYYMMDD: '20260506' });
  assert.equal(result, 'hello 20260506');
});

// ===== T4: expandTemplate は未知のプレースホルダをリテラル維持 =====
test('T4: expandTemplate keeps unknown placeholders intact', () => {
  const result = expandTemplate('hello {UNKNOWN}', { YYYYMMDD: '20260506' });
  assert.equal(result, 'hello {UNKNOWN}');
});

test('T4b: expandTemplate handles multiple placeholders, mixed known/unknown', () => {
  const result = expandTemplate('{YYYYMMDD} / {UNKNOWN} / {JOB_NAME}', {
    YYYYMMDD: '20260506',
    JOB_NAME: 'daily-research',
  });
  assert.equal(result, '20260506 / {UNKNOWN} / daily-research');
});

test('T4c: expandTemplate ignores lowercase or non-SCREAMING_SNAKE_CASE braces', () => {
  // {hello} や {Mix} は SCREAMING_SNAKE_CASE 正規表現にマッチしないので展開対象外
  const result = expandTemplate('{hello} {Mix} {ALL_CAPS}', { hello: 'X', Mix: 'Y', ALL_CAPS: 'Z' });
  assert.equal(result, '{hello} {Mix} Z');
});

// ===== T2: buildClaudeCmd に --add-dir C:/work/memo-yoshi が含まれる =====
test('T2: buildClaudeCmd args include --add-dir C:/work/memo-yoshi', () => {
  const cmd = buildClaudeCmd(
    { name: 'x', max_budget_usd: 1, prompt_template: 'p' },
    '/tmp/profile.json',
    '20260506'
  );
  const addDirIdx = cmd.indexOf('--add-dir');
  assert.ok(addDirIdx >= 0, '--add-dir flag should exist in args');
  assert.equal(cmd[addDirIdx + 1], 'C:/work/memo-yoshi', '--add-dir should be followed by C:/work/memo-yoshi');
});

// ===== T2b: --allowedTools に Bash(git checkout:*) が含まれる（kurouto P0） =====
test('T2b: buildClaudeCmd allowedTools includes Bash(git checkout:*)', () => {
  const cmd = buildClaudeCmd(
    { name: 'x', max_budget_usd: 1, prompt_template: 'p' },
    '/tmp/profile.json',
    '20260506'
  );
  const allowedIdx = cmd.indexOf('--allowedTools');
  assert.ok(allowedIdx >= 0, '--allowedTools flag should exist in args');
  const allowedToolsStr = cmd[allowedIdx + 1];
  assert.match(allowedToolsStr, /Bash\(git checkout:\*\)/, 'allowedTools should include Bash(git checkout:*)');
  assert.match(allowedToolsStr, /Bash\(git switch:\*\)/, 'allowedTools should include Bash(git switch:*)');
  assert.match(allowedToolsStr, /Bash\(git branch:\*\)/, 'allowedTools should include Bash(git branch:*)');
});

// ===== T3: 改修後 prompt_template 展開結果が commit 工程の3キーワードを全て含む =====
test('T3: expanded prompt contains cd / git checkout -b / git commit keywords', () => {
  // policy.yml の改修後 prompt_template を再現したテキスト
  const promptTemplate = [
    'daily-research タスクを実行する。',
    '1. cd C:/work/memo-yoshi',
    '2. git checkout -b feature/nightly-daily-research-{YYYYMMDD}',
    '3. arxiv で...',
    '5. git add MEMO-YOSHI.md',
    '6. git commit -m "nightly: daily-research {YYYYMMDD}"',
  ].join('\n');

  const cmd = buildClaudeCmd(
    { name: 'daily-research', max_budget_usd: 2, prompt_template: promptTemplate },
    '/tmp/profile.json',
    '20260506'
  );
  const expandedPrompt = cmd[cmd.length - 1];  // prompt は配列末尾

  assert.match(expandedPrompt, /cd C:\/work\/memo-yoshi/, 'expanded prompt should contain "cd C:/work/memo-yoshi"');
  assert.match(expandedPrompt, /git checkout -b/, 'expanded prompt should contain "git checkout -b"');
  assert.match(expandedPrompt, /git commit/, 'expanded prompt should contain "git commit"');
  assert.match(expandedPrompt, /20260506/, '{YYYYMMDD} placeholder should be expanded to 20260506');
  assert.doesNotMatch(expandedPrompt, /\{YYYYMMDD\}/, '{YYYYMMDD} literal should not remain');
});

// ===== T7: parseYaml が `|` ブロックを文字列として正しく抽出する（kurouto P0 cycle3） =====
test('T7: parseYaml extracts pipe block scalar as string', () => {
  const yaml = [
    'nightly_ok:',
    '  - name: daily-research',
    '    description: arxiv 探索',
    '    max_budget_usd: 2.00',
    '    prompt_template: |',
    '      1. cd C:/work/memo-yoshi',
    '      2. git checkout -b feature/x-{YYYYMMDD}',
    '      3. arxiv で探索',
    '      6. git commit',
    '',
    '  - name: typo-fix',
    '    description: typo',
  ].join('\n');

  const parsed = parseYaml(yaml);
  assert.ok(parsed.nightly_ok, 'nightly_ok should be parsed');
  assert.ok(Array.isArray(parsed.nightly_ok), 'nightly_ok should be an array');
  assert.equal(parsed.nightly_ok[0].name, 'daily-research');
  assert.equal(parsed.nightly_ok[1].name, 'typo-fix');
  // prompt_template が文字列として抽出されている（{} ではなく）
  const tpl = parsed.nightly_ok[0].prompt_template;
  assert.equal(typeof tpl, 'string', 'prompt_template should be a string');
  assert.match(tpl, /1\. cd C:\/work\/memo-yoshi/);
  assert.match(tpl, /git checkout -b feature\/x-\{YYYYMMDD\}/);
  assert.match(tpl, /git commit/);
});

// ===== T8: mergePolicyPromptTemplates は policy.prompt_template を job に注入する =====
test('T8: mergePolicyPromptTemplates injects prompt_template from policy entry', () => {
  const policy = {
    nightly_ok: [
      { name: 'daily-research', prompt_template: '1. cd ...\n6. git commit\n' },
      { name: 'typo-fix', prompt_template: 'fix typos\n' },
    ],
  };
  const jobs = [
    { name: 'daily-research', max_budget_usd: 2 },  // queue JSON 由来、prompt_template なし
  ];
  const merged = mergePolicyPromptTemplates(jobs, policy);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].name, 'daily-research');
  assert.match(merged[0].prompt_template, /1\. cd \.\.\./);
  assert.match(merged[0].prompt_template, /git commit/);
  // 元の job は不変（純粋関数）
  assert.equal(jobs[0].prompt_template, undefined);
});

test('T8b: mergePolicyPromptTemplates does not overwrite existing job.prompt or prompt_template', () => {
  const policy = {
    nightly_ok: [
      { name: 'x', prompt_template: 'policy-template' },
    ],
  };
  const jobsWithPrompt = [{ name: 'x', prompt: 'job-prompt' }];
  const m1 = mergePolicyPromptTemplates(jobsWithPrompt, policy);
  assert.equal(m1[0].prompt, 'job-prompt');
  assert.equal(m1[0].prompt_template, undefined, 'should not inject when job has prompt');

  const jobsWithTpl = [{ name: 'x', prompt_template: 'job-template' }];
  const m2 = mergePolicyPromptTemplates(jobsWithTpl, policy);
  assert.equal(m2[0].prompt_template, 'job-template', 'should not overwrite existing prompt_template');
});

// ===== T9: countNonDryRunResults は dry_run エントリを除外する =====
test('T9: countNonDryRunResults excludes dry_run entries (STATUS定数参照)', () => {
  const list = [
    { job_name: 'a', status: STATUS.SUCCESS },
    { job_name: 'b', status: STATUS.DRY_RUN },
    { job_name: 'c', status: STATUS.FAILED },
    { job_name: 'd', status: STATUS.DRY_RUN },
    { job_name: 'e', status: STATUS.SUCCESS },
  ];
  // 5 entries 中 dry_run 2件を除いた 3件
  assert.equal(countNonDryRunResults(list), 3);
  assert.equal(countNonDryRunResults([]), 0);
  assert.equal(countNonDryRunResults(null), 0);
  assert.equal(countNonDryRunResults('not-an-array'), 0);
});

// ===== T10: 統合テスト: policy YAML → parseYaml → merge → buildClaudeCmd → 展開後 prompt =====
test('T10: integration — policy YAML to expanded prompt with cd / git checkout / git commit', () => {
  const yaml = [
    'nightly_ok:',
    '  - name: daily-research',
    '    max_budget_usd: 2.00',
    '    prompt_template: |',
    '      daily-research タスクを実行する。',
    '      1. cd C:/work/memo-yoshi',
    '      2. git checkout -b feature/nightly-daily-research-{YYYYMMDD}',
    '      6. git commit -m "nightly: {YYYYMMDD}"',
    'limits:',
    '  max_jobs_per_night: 5',
  ].join('\n');

  const policy = parseYaml(yaml);
  const queueJobs = [{ name: 'daily-research', max_budget_usd: 2 }];
  const merged = mergePolicyPromptTemplates(queueJobs, policy);
  const cmd = buildClaudeCmd(merged[0], '/tmp/profile.json', '20260507');
  const expandedPrompt = cmd[cmd.length - 1];

  assert.match(expandedPrompt, /cd C:\/work\/memo-yoshi/);
  assert.match(expandedPrompt, /git checkout -b feature\/nightly-daily-research-20260507/);
  assert.match(expandedPrompt, /git commit -m "nightly: 20260507"/);
  assert.doesNotMatch(expandedPrompt, /\{YYYYMMDD\}/, '{YYYYMMDD} should be fully expanded');
});
