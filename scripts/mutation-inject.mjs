#!/usr/bin/env node

import fs from 'fs';

const SAMPLE_CODE = `function authenticateUser(username, password, db) {
  if (username == null || password == null) {
    return { success: false, error: 'Missing credentials' };
  }
  const user = db.findUser(username);
  if (user == null) {
    return { success: false, error: 'User not found' };
  }
  if (user.loginAttempts > 5) {
    return { success: false, error: 'Account locked' };
  }
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  if (hash !== user.passwordHash) {
    user.loginAttempts = user.loginAttempts + 1;
    db.updateUser(user);
    return { success: false, error: 'Invalid password' };
  }
  user.loginAttempts = 0;
  user.lastLogin = new Date();
  db.updateUser(user);
  return { success: true, user: { id: user.id, name: user.name } };
}`;

const OPERATORS = [
  { id: 'M1-001', category: 'logic_inversion', pattern: /(\w+)\s*>\s*(\w+)/, replace: (m, a, b) => `${a} <= ${b}`, desc: 'Greater-than to less-than-or-equal' },
  { id: 'M1-002', category: 'logic_inversion', pattern: /(\w+)\s*!==\s*(\w+)/, replace: (m, a, b) => `${a} === ${b}`, desc: 'Not-equal to equal' },
  { id: 'M1-003', category: 'logic_inversion', pattern: /&&/, replace: () => '||', desc: 'AND to OR' },
  { id: 'M2-001', category: 'boundary_shift', pattern: />\s*(\d+)/, replace: (m, n) => `> ${Number(n) - 1}`, desc: 'Off-by-one boundary shift' },
  { id: 'M3-001', category: 'null_safety_removal', pattern: /if\s*\(\s*(\w+)\s*==\s*null\s*\)/, replace: (m, v) => `if (false)`, desc: 'Null check disabled' },
  { id: 'M4-001', category: 'resource_leak', pattern: /(\w+)\.(close|destroy|end)\(\)/, replace: (m, obj, method) => `// ${obj}.${method}()`, desc: 'Close/cleanup commented out' },
  { id: 'M5-001', category: 'silent_error', pattern: /return\s*\{\s*success:\s*false/, replace: () => 'return { success: true', desc: 'Error return changed to success' },
  { id: 'M5-002', category: 'silent_error', pattern: /throw\s+/, replace: () => 'return null; // ', desc: 'Throw replaced with silent return' },
  { id: 'M6-001', category: 'security_weakness', pattern: /!==/, replace: () => '!=', desc: 'Strict to loose comparison' },
  { id: 'M6-002', category: 'security_weakness', pattern: /crypto\.createHash\([^)]+\)\.update\((\w+)\)\.digest\([^)]+\)/, replace: (m, v) => v, desc: 'Hash computation removed' },
  { id: 'M7-001', category: 'type_confusion', pattern: /parseInt\(([^)]+)\)/, replace: (m, v) => v, desc: 'parseInt removed, raw string used' },
  { id: 'M7-002', category: 'type_confusion', pattern: /(\w+)\s*\+\s*1/, replace: (m, v) => `${v} + '1'`, desc: 'Number addition to string concat' },
  { id: 'M8-001', category: 'dead_code', pattern: /^(function\s+\w+\s*\([^)]*\)\s*\{)/, replace: (m) => `${m}\n  return undefined;`, desc: 'Early return injected' },
  { id: 'M8-002', category: 'dead_code', pattern: /if\s*\(/, replace: () => 'if (true || ', desc: 'Condition made always-true' },
];

function parseArgs(argv) {
  const args = { sample: false, count: 5, categories: null, seed: null, output: null, file: null };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--sample': args.sample = true; break;
      case '--count': args.count = Math.max(0, Number(argv[++i]) || 0); break;
      case '--categories': args.categories = argv[++i].split(',').map(s => s.trim()); break;
      case '--seed': args.seed = Number(argv[++i]); break;
      case '--output': args.output = argv[++i]; break;
      default:
        if (!argv[i].startsWith('--')) args.file = argv[i];
    }
  }
  return args;
}

function classifyLine(line, state) {
  const trimmed = line.trimStart();
  if (state.inBlockComment) {
    if (trimmed.includes('*/')) { state.inBlockComment = false; }
    return 'comment';
  }
  if (state.inTemplateLiteral) {
    if (/`/.test(trimmed) && !/\$\{/.test(trimmed.split('`')[1] || '')) {
      state.inTemplateLiteral = false;
    }
    return 'string';
  }
  if (trimmed.startsWith('//')) return 'comment';
  if (trimmed.startsWith('/*')) {
    state.inBlockComment = !trimmed.includes('*/');
    return 'comment';
  }
  if (trimmed === '') return 'blank';

  const backtickCount = (trimmed.match(/`/g) || []).length;
  if (backtickCount % 2 !== 0) {
    state.inTemplateLiteral = !state.inTemplateLiteral;
    if (state.inTemplateLiteral) return 'string';
  }

  const singleQuoteStripped = trimmed.replace(/'[^']*'/g, '""');
  const doubleQuoteStripped = singleQuoteStripped.replace(/"[^"]*"/g, '""');
  if (doubleQuoteStripped.trim() === '""' || doubleQuoteStripped.trim() === '"",') return 'string';

  return 'code';
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x80000000;
  };
}

function findMutationSites(lines, operators, categories) {
  const sites = [];
  const state = { inBlockComment: false, inTemplateLiteral: false };

  for (let i = 0; i < lines.length; i++) {
    const lineType = classifyLine(lines[i], state);
    if (lineType !== 'code') continue;

    for (const op of operators) {
      if (categories && !categories.includes(op.category) &&
          !categories.some(c => op.id.startsWith(c))) continue;

      const match = lines[i].match(op.pattern);
      if (match) {
        sites.push({ line: i + 1, operator: op, match, original: lines[i] });
      }
    }
  }
  return sites;
}

function selectMutations(sites, count, seed) {
  if (sites.length <= count) return sites;
  const rng = seed != null ? seededRandom(seed) : Math.random.bind(Math);
  const selected = [];
  const pool = [...sites];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected.sort((a, b) => a.line - b.line);
}

function applyMutations(lines, mutations) {
  const result = [...lines];
  for (const m of mutations) {
    const idx = m.line - 1;
    result[idx] = result[idx].replace(m.operator.pattern, m.operator.replace);
  }
  return result;
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.sample && !args.file) {
    process.stderr.write('Usage: mutation-inject.mjs [--sample | <file>] [--count N] [--categories C] [--seed N]\n');
    process.exit(1);
  }

  let source, sourcePath;
  if (args.sample) {
    source = SAMPLE_CODE;
    sourcePath = '(built-in sample)';
  } else {
    if (!fs.existsSync(args.file)) {
      process.stderr.write(`Error: file not found: ${args.file}\n`);
      process.exit(1);
    }
    source = fs.readFileSync(args.file, 'utf8');
    sourcePath = args.file;
  }

  const lines = source.split('\n');
  const sites = findMutationSites(lines, OPERATORS, args.categories);
  const selected = selectMutations(sites, args.count, args.seed);

  if (args.count === 0 || selected.length === 0) {
    const output = { source: sourcePath, mutations: [], mutated_file: null, total: 0 };
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    return;
  }

  const mutatedLines = applyMutations(lines, selected);
  let mutatedPath = null;

  if (args.output) {
    fs.writeFileSync(args.output, mutatedLines.join('\n'), 'utf8');
    mutatedPath = args.output;
  } else if (args.file) {
    mutatedPath = args.file.replace(/(\.\w+)$/, '.mutated$1');
    fs.writeFileSync(mutatedPath, mutatedLines.join('\n'), 'utf8');
  }

  const output = {
    source: sourcePath,
    mutations: selected.map(m => ({
      id: m.operator.id,
      category: m.operator.category,
      line: m.line,
      original: m.original.trim(),
      mutated: mutatedLines[m.line - 1].trim(),
      description: m.operator.desc,
    })),
    mutated_file: mutatedPath,
    total: selected.length,
  };

  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}

main();
