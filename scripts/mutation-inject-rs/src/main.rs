use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Nonce};
use rand::Rng;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::process;

const SAMPLE_CODE: &str = r#"function authenticateUser(username, password, db) {
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
}"#;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Mutation {
    id: String,
    category: String,
    line: usize,
    original: String,
    mutated: String,
    description: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Output {
    source: String,
    mutations: Vec<Mutation>,
    mutated_file: Option<String>,
    total: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    encrypted: Option<String>,
}

struct Operator {
    id: &'static str,
    category: &'static str,
    pattern: &'static str,
    replacement: &'static str,
    description: &'static str,
}

const OPERATORS: &[Operator] = &[
    Operator { id: "M1-001", category: "logic_inversion", pattern: r"(\w+)\s*>\s*(\w+)", replacement: "$1 <= $2", description: "Greater-than to less-than-or-equal" },
    Operator { id: "M1-002", category: "logic_inversion", pattern: r"(\w+)\s*!==\s*(\w+)", replacement: "$1 === $2", description: "Not-equal to equal" },
    Operator { id: "M1-003", category: "logic_inversion", pattern: r"&&", replacement: "||", description: "AND to OR" },
    Operator { id: "M2-001", category: "boundary_shift", pattern: r">\s*(\d+)", replacement: "BOUNDARY_SHIFT", description: "Off-by-one boundary shift" },
    Operator { id: "M3-001", category: "null_safety_removal", pattern: r"if\s*\(\s*(\w+)\s*==\s*null\s*\)", replacement: "if (false)", description: "Null check disabled" },
    Operator { id: "M5-001", category: "silent_error", pattern: r"return\s*\{\s*success:\s*false", replacement: "return { success: true", description: "Error return changed to success" },
    Operator { id: "M6-001", category: "security_weakness", pattern: r"!==", replacement: "!=", description: "Strict to loose comparison" },
    Operator { id: "M7-001", category: "type_confusion", pattern: r"(\w+)\s*\+\s*1", replacement: "$1 + '1'", description: "Number addition to string concat" },
    Operator { id: "M8-001", category: "dead_code", pattern: r"if\s*\(", replacement: "if (true || ", description: "Condition made always-true" },
];

struct Args {
    sample: bool,
    count: usize,
    seed: Option<u64>,
    encrypt: bool,
    file: Option<String>,
}

fn parse_args() -> Args {
    let argv: Vec<String> = env::args().collect();
    let mut args = Args { sample: false, count: 5, seed: None, encrypt: false, file: None };
    let mut i = 1;
    while i < argv.len() {
        match argv[i].as_str() {
            "--sample" => args.sample = true,
            "--count" => { i += 1; args.count = argv.get(i).and_then(|s| s.parse().ok()).unwrap_or(5); }
            "--seed" => { i += 1; args.seed = argv.get(i).and_then(|s| s.parse().ok()); }
            "--encrypt" => args.encrypt = true,
            s if !s.starts_with("--") => args.file = Some(s.to_string()),
            _ => {}
        }
        i += 1;
    }
    args
}

#[derive(PartialEq)]
enum LineType { Code, Comment, String, Blank }

fn classify_line(line: &str, in_block_comment: &mut bool, in_template: &mut bool) -> LineType {
    let trimmed = line.trim_start();
    if *in_block_comment {
        if trimmed.contains("*/") { *in_block_comment = false; }
        return LineType::Comment;
    }
    if *in_template {
        if trimmed.contains('`') { *in_template = false; }
        return LineType::String;
    }
    if trimmed.starts_with("//") { return LineType::Comment; }
    if trimmed.starts_with("/*") {
        *in_block_comment = !trimmed.contains("*/");
        return LineType::Comment;
    }
    if trimmed.is_empty() { return LineType::Blank; }
    let backtick_count = trimmed.matches('`').count();
    if backtick_count % 2 != 0 {
        *in_template = !*in_template;
        if *in_template { return LineType::String; }
    }
    LineType::Code
}

struct MutationSite {
    line: usize,
    operator_idx: usize,
    original: String,
}

fn find_mutation_sites(lines: &[&str]) -> Vec<MutationSite> {
    let mut sites = Vec::new();
    let mut in_block = false;
    let mut in_template = false;

    for (i, line) in lines.iter().enumerate() {
        if classify_line(line, &mut in_block, &mut in_template) != LineType::Code {
            continue;
        }
        for (op_idx, op) in OPERATORS.iter().enumerate() {
            if let Ok(re) = Regex::new(op.pattern) {
                if re.is_match(line) {
                    sites.push(MutationSite {
                        line: i + 1,
                        operator_idx: op_idx,
                        original: line.to_string(),
                    });
                }
            }
        }
    }
    sites
}

fn seeded_select(sites_len: usize, count: usize, seed: Option<u64>) -> Vec<usize> {
    if sites_len <= count { return (0..sites_len).collect(); }
    let mut indices: Vec<usize> = (0..sites_len).collect();
    let mut s = seed.unwrap_or(42);
    for i in (1..indices.len()).rev() {
        s = s.wrapping_mul(1103515245).wrapping_add(12345) & 0x7fffffff;
        let j = (s as usize) % (i + 1);
        indices.swap(i, j);
    }
    indices.truncate(count);
    indices.sort();
    indices
}

fn apply_mutation(line: &str, op: &Operator) -> String {
    if let Ok(re) = Regex::new(op.pattern) {
        if op.id == "M2-001" {
            if let Some(caps) = re.captures(line) {
                if let Some(m) = caps.get(1) {
                    if let Ok(n) = m.as_str().parse::<i64>() {
                        return re.replace(line, format!("> {}", n - 1).as_str()).to_string();
                    }
                }
            }
            return line.to_string();
        }
        re.replace(line, op.replacement).to_string()
    } else {
        line.to_string()
    }
}

fn encrypt_mutations(mutations: &[Mutation]) -> Result<String, String> {
    let key = Aes256Gcm::generate_key(&mut OsRng);
    let cipher = Aes256Gcm::new(&key);
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let json = serde_json::to_string(mutations).map_err(|e| e.to_string())?;
    let ciphertext = cipher.encrypt(nonce, json.as_bytes()).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    result.extend_from_slice(&key);
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    Ok(result.iter().map(|b| format!("{:02x}", b)).collect())
}

fn main() {
    let args = parse_args();

    if !args.sample && args.file.is_none() {
        eprintln!("Usage: mutation-inject [--sample | <file>] [--count N] [--seed N] [--encrypt]");
        process::exit(1);
    }

    let (source, source_path) = if args.sample {
        (SAMPLE_CODE.to_string(), "(built-in sample)".to_string())
    } else {
        let path = args.file.as_ref().unwrap();
        match fs::read_to_string(path) {
            Ok(content) => (content, path.clone()),
            Err(_) => {
                eprintln!("Error: file not found: {}", path);
                process::exit(1);
            }
        }
    };

    let lines: Vec<&str> = source.lines().collect();
    let sites = find_mutation_sites(&lines);
    let selected_indices = seeded_select(sites.len(), args.count, args.seed);

    if args.count == 0 || selected_indices.is_empty() {
        let output = Output {
            source: source_path,
            mutations: vec![],
            mutated_file: None,
            total: 0,
            encrypted: None,
        };
        println!("{}", serde_json::to_string_pretty(&output).unwrap());
        return;
    }

    let mut mutated_lines: Vec<String> = lines.iter().map(|l| l.to_string()).collect();
    let mut mutations = Vec::new();

    for &idx in &selected_indices {
        let site = &sites[idx];
        let op = &OPERATORS[site.operator_idx];
        let mutated = apply_mutation(&mutated_lines[site.line - 1], op);
        mutated_lines[site.line - 1] = mutated.clone();
        mutations.push(Mutation {
            id: op.id.to_string(),
            category: op.category.to_string(),
            line: site.line,
            original: site.original.trim().to_string(),
            mutated: mutated.trim().to_string(),
            description: op.description.to_string(),
        });
    }

    let encrypted = if args.encrypt {
        match encrypt_mutations(&mutations) {
            Ok(enc) => Some(enc),
            Err(e) => {
                eprintln!("Encryption error: {}", e);
                None
            }
        }
    } else {
        None
    };

    let output = Output {
        source: source_path,
        mutations: if args.encrypt { vec![] } else { mutations },
        mutated_file: None,
        total: selected_indices.len(),
        encrypted,
    };

    println!("{}", serde_json::to_string_pretty(&output).unwrap());
}
