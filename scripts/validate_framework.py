#!/usr/bin/env python3
"""
validate_framework.py - Neko Gundan Framework Integrity Validator

Validates cross-file consistency across the neko-gundan framework documents.
Detects 5 patterns of inconsistency that were originally found via manual E2E testing.

Exit codes:
    0 - No errors found (warnings may exist)
    1 - One or more errors detected

Usage:
    python scripts/validate_framework.py [project_root]

    If project_root is omitted, uses current working directory.

Requires: Python 3.8+ (standard library only)
"""

import os
import re
import sys
from pathlib import Path
from typing import Dict, List, NamedTuple, Optional, Set, Tuple


# Shared regex pattern for module references in backticks
MODULE_REF_PATTERN = r"`(modules/[^`]+\.md)`"


class Issue(NamedTuple):
    """A single validation issue."""
    pattern: str
    severity: str  # "ERROR" or "WARNING"
    file: str
    message: str


def read_file(path: Path) -> str:
    """Read a file and return its contents, or empty string if not found."""
    try:
        return path.read_text(encoding="utf-8")
    except (FileNotFoundError, PermissionError):
        return ""


# =============================================================================
# P1: Active Modules table references -> modules/ file existence
# =============================================================================

def extract_active_modules_from_agents(agents_dir: Path) -> Dict[str, List[Tuple[str, int]]]:
    """
    Parse Active Modules tables from all agents/*.md files.

    Returns:
        Dict mapping module path (e.g., "modules/heartbeat.md") to list of
        (agent_filename, line_number) tuples where it's referenced.
    """
    module_refs: Dict[str, List[Tuple[str, int]]] = {}

    if not agents_dir.is_dir():
        return module_refs

    for agent_file in sorted(agents_dir.glob("*.md")):
        content = read_file(agent_file)
        lines = content.splitlines()

        in_active_modules = False
        in_table = False

        for i, line in enumerate(lines, 1):
            # Detect "## Active Modules" section
            if re.match(r"^##\s+Active Modules", line):
                in_active_modules = True
                in_table = False
                continue

            # Detect next section (end of Active Modules)
            if in_active_modules and re.match(r"^##\s+", line) and not re.match(r"^##\s+Active Modules", line):
                in_active_modules = False
                in_table = False
                continue

            if not in_active_modules:
                continue

            # Detect table header separator
            if re.match(r"^\|[-\s|]+\|$", line):
                in_table = True
                continue

            # Parse table rows and bullet list lines
            if (in_table and line.startswith("|")) or not in_table:
                matches = re.findall(MODULE_REF_PATTERN, line)
                for mod_path in matches:
                    module_refs.setdefault(mod_path, []).append((agent_file.name, i))
                if in_table:
                    continue

    return module_refs


def validate_p1(root: Path) -> List[Issue]:
    """
    P1: Check that every module referenced in agents' Active Modules tables
    exists as a file in modules/.
    """
    issues: List[Issue] = []
    agents_dir = root / "agents"

    module_refs = extract_active_modules_from_agents(agents_dir)

    for mod_path, refs in sorted(module_refs.items()):
        full_path = root / mod_path
        if not full_path.is_file():
            for agent_name, line_num in refs:
                issues.append(Issue(
                    pattern="P1",
                    severity="ERROR",
                    file=f"agents/{agent_name}:{line_num}",
                    message=f"Active Modules references `{mod_path}` but file does not exist",
                ))

    return issues


# =============================================================================
# P2: modules/*.md must have "Integration Points" section
# =============================================================================

def validate_p2(root: Path) -> List[Issue]:
    """
    P2: Check that every modules/*.md file has an '## Integration Points' section.
    """
    issues: List[Issue] = []
    modules_dir = root / "modules"

    if not modules_dir.is_dir():
        issues.append(Issue(
            pattern="P2",
            severity="ERROR",
            file="modules/",
            message="modules/ directory does not exist",
        ))
        return issues

    for mod_file in sorted(modules_dir.glob("*.md")):
        content = read_file(mod_file)

        # Check for Integration Points section heading
        if not re.search(r"^##\s+Integration Points", content, re.MULTILINE):
            issues.append(Issue(
                pattern="P2",
                severity="WARNING",
                file=f"modules/{mod_file.name}",
                message="Missing '## Integration Points' section",
            ))

    return issues


# =============================================================================
# P3: Active Modules step numbers vs agent Work Procedure step count
# =============================================================================

def extract_work_procedure_steps(content: str) -> Optional[int]:
    """
    Count the number of top-level steps in the Work Procedure section.

    Looks for a section like "## Work Procedure" and counts numbered list items
    (e.g., "1. ...", "2. ...", etc.) that are at the top level.

    Returns the maximum step number found, or None if section not found.
    """
    lines = content.splitlines()
    in_procedure = False
    max_step = 0

    for line in lines:
        if re.match(r"^##\s+Work Procedure", line):
            in_procedure = True
            continue

        if in_procedure and re.match(r"^##\s+", line) and not re.match(r"^##\s+Work Procedure", line):
            break

        if not in_procedure:
            continue

        # Match top-level numbered steps like "1. ..." (not indented sub-steps)
        m = re.match(r"^(\d+)\.\s+", line)
        if m:
            step_num = int(m.group(1))
            if step_num > max_step:
                max_step = step_num

    return max_step if max_step > 0 else None


def extract_step_refs_from_active_modules(content: str) -> List[Tuple[str, str, int]]:
    """
    Extract step number references from the Active Modules table.

    Returns list of (module_path, step_reference_text, line_number).
    Step references are strings like "steps 6-7", "step 3", "step 12, on failure", etc.
    """
    refs: List[Tuple[str, str, int]] = []
    lines = content.splitlines()

    in_active_modules = False
    in_table = False

    for i, line in enumerate(lines, 1):
        if re.match(r"^##\s+Active Modules", line):
            in_active_modules = True
            in_table = False
            continue

        if in_active_modules and re.match(r"^##\s+", line) and not re.match(r"^##\s+Active Modules", line):
            break

        if not in_active_modules:
            continue

        if re.match(r"^\|[-\s|]+\|$", line):
            in_table = True
            continue

        if in_table and line.startswith("|"):
            # Extract module path
            mod_matches = re.findall(MODULE_REF_PATTERN, line)
            if not mod_matches:
                continue

            mod_path = mod_matches[0]

            # Extract step references like "step 3", "steps 6-7", "step 12, on failure"
            step_matches = re.findall(r"steps?\s+(\d+(?:-\d+)?)", line, re.IGNORECASE)
            for step_ref in step_matches:
                refs.append((mod_path, step_ref, i))

    return refs


def validate_p3(root: Path) -> List[Issue]:
    """
    P3: Check that step numbers in Active Modules tables are within the range
    of the agent's Work Procedure steps.
    """
    issues: List[Issue] = []
    agents_dir = root / "agents"

    if not agents_dir.is_dir():
        return issues

    for agent_file in sorted(agents_dir.glob("*.md")):
        content = read_file(agent_file)

        max_step = extract_work_procedure_steps(content)
        if max_step is None:
            # No Work Procedure section - skip step validation
            continue

        step_refs = extract_step_refs_from_active_modules(content)

        for mod_path, step_ref, line_num in step_refs:
            # Parse step numbers from reference like "6-7" or "3"
            parts = step_ref.split("-")
            for part in parts:
                try:
                    step_num = int(part.strip())
                except ValueError:
                    continue

                if step_num > max_step:
                    issues.append(Issue(
                        pattern="P3",
                        severity="ERROR",
                        file=f"agents/{agent_file.name}:{line_num}",
                        message=(
                            f"Active Modules references step {step_num} "
                            f"but Work Procedure only has {max_step} steps"
                        ),
                    ))

    return issues


# =============================================================================
# P4: completion-gates.md gate number references vs other files
# =============================================================================

def extract_gate_module_mapping(content: str) -> Dict[int, str]:
    """
    Extract module-specific gate items from completion-gates.md.

    Returns dict mapping gate number -> module config key name.
    E.g., {8: "whiteboard", 9: "checklist_export", ...}
    """
    mapping: Dict[int, str] = {}
    lines = content.splitlines()

    in_module_gates = False
    in_table = False

    for line in lines:
        # Look for the module-specific gate items table
        if "Module-Specific Gate Items" in line:
            in_module_gates = True
            in_table = False
            continue

        if in_module_gates and re.match(r"^##", line):
            break

        if not in_module_gates:
            continue

        if re.match(r"^\|[-\s|]+\|$", line):
            in_table = True
            continue

        if in_table and line.startswith("|"):
            cells = [c.strip() for c in line.split("|")]
            # cells[0] is empty (before first |), cells[1] is #, cells[2] is module, etc.
            if len(cells) >= 3:
                try:
                    gate_num = int(cells[1])
                except (ValueError, IndexError):
                    continue

                module_name = cells[2].strip()
                mapping[gate_num] = module_name

    return mapping


def extract_gate_refs_from_agents(agents_dir: Path) -> Dict[int, List[Tuple[str, int]]]:
    """
    Find gate item number references (like "Gate item #8") in agent files.

    Returns dict mapping gate number -> list of (filename, line_number).
    """
    refs: Dict[int, List[Tuple[str, int]]] = {}

    if not agents_dir.is_dir():
        return refs

    for agent_file in sorted(agents_dir.glob("*.md")):
        content = read_file(agent_file)
        lines = content.splitlines()

        for i, line in enumerate(lines, 1):
            # Match patterns like "Gate item #8", "gate item #12", "#8 (platoon+)"
            for m in re.finditer(r"[Gg]ate\s+item\s+#(\d+)", line):
                gate_num = int(m.group(1))
                if gate_num not in refs:
                    refs[gate_num] = []
                refs[gate_num].append((agent_file.name, i))

    return refs


def extract_gate_refs_from_config(config_content: str) -> Dict[int, str]:
    """
    Find gate item references in config.yaml comments.

    Returns dict mapping gate number -> config key.
    E.g., line "whiteboard: true  # ... Gate item #8" -> {8: "whiteboard"}
    """
    refs: Dict[int, str] = {}

    for line in config_content.splitlines():
        # Match "Gate item #N" in comments
        gate_match = re.search(r"[Gg]ate\s+item\s+#(\d+)", line)
        if not gate_match:
            continue

        gate_num = int(gate_match.group(1))

        # Extract the config key from the YAML line
        key_match = re.match(r"\s*(\w+)\s*:", line)
        if key_match:
            refs[gate_num] = key_match.group(1)

    return refs


def validate_p4(root: Path) -> List[Issue]:
    """
    P4: Check that gate number references in completion-gates.md are consistent
    with references in agent files and config.yaml.
    """
    issues: List[Issue] = []

    gates_file = root / "rules" / "completion-gates.md"
    gates_content = read_file(gates_file)

    if not gates_content:
        issues.append(Issue(
            pattern="P4",
            severity="ERROR",
            file="rules/completion-gates.md",
            message="File not found or empty",
        ))
        return issues

    # Get the canonical gate-number -> module mapping from completion-gates.md
    gate_module_map = extract_gate_module_mapping(gates_content)

    # Check config.yaml gate references
    config_file = root / "neko-gundan.config.yaml"
    config_content = read_file(config_file)

    if config_content:
        config_gate_refs = extract_gate_refs_from_config(config_content)

        for gate_num, config_key in config_gate_refs.items():
            if gate_num in gate_module_map:
                # The canonical module name for this gate number
                canonical_module = gate_module_map[gate_num]
                # Check if config key matches the module name
                if config_key != canonical_module:
                    issues.append(Issue(
                        pattern="P4",
                        severity="ERROR",
                        file="neko-gundan.config.yaml",
                        message=(
                            f"Gate item #{gate_num} is mapped to module `{canonical_module}` "
                            f"in completion-gates.md, but config key is `{config_key}`"
                        ),
                    ))
            else:
                issues.append(Issue(
                    pattern="P4",
                    severity="WARNING",
                    file="neko-gundan.config.yaml",
                    message=(
                        f"References Gate item #{gate_num} but this gate number "
                        f"is not defined in completion-gates.md module-specific items"
                    ),
                ))

    # Check agent file gate references
    agent_gate_refs = extract_gate_refs_from_agents(root / "agents")

    # All gate numbers defined in completion-gates.md (core: 1-7, module-specific: 8+)
    all_defined_gates: Set[int] = set(range(1, 8)) | set(gate_module_map.keys())

    for gate_num, refs in agent_gate_refs.items():
        if gate_num not in all_defined_gates:
            for agent_name, line_num in refs:
                issues.append(Issue(
                    pattern="P4",
                    severity="ERROR",
                    file=f"agents/{agent_name}:{line_num}",
                    message=(
                        f"References Gate item #{gate_num} but this gate number "
                        f"is not defined in completion-gates.md"
                    ),
                ))

    return issues


# =============================================================================
# P5: config.yaml module names -> modules/ file existence
# =============================================================================

def extract_config_modules(config_path: Path) -> List[Tuple[str, int]]:
    """
    Extract module names from neko-gundan.config.yaml's shitsuke section.

    Returns list of (module_name, line_number).
    """
    modules: List[Tuple[str, int]] = []
    content = read_file(config_path)

    if not content:
        return modules

    lines = content.splitlines()
    in_shitsuke = False

    for i, line in enumerate(lines, 1):
        stripped = line.strip()

        # Detect shitsuke section
        if stripped == "shitsuke:":
            in_shitsuke = True
            continue

        if not in_shitsuke:
            continue

        # End of shitsuke section (next top-level key or end of file)
        if not line.startswith(" ") and not line.startswith("\t") and stripped and not stripped.startswith("#"):
            break

        # Parse "key: value" pairs (with optional comments)
        # Use the original line (not stripped) to match indented YAML keys
        m = re.match(r"\s+(\w+)\s*:\s*(true|false)", line)
        if m:
            module_name = m.group(1)
            modules.append((module_name, i))

    return modules


def validate_p5(root: Path) -> List[Issue]:
    """
    P5: Check that every module name in config.yaml's shitsuke section
    has a corresponding .md file in modules/.

    Module names use underscores in config (e.g., "race_prevention")
    and hyphens in filenames (e.g., "race-prevention.md").
    """
    issues: List[Issue] = []

    config_path = root / "neko-gundan.config.yaml"
    config_modules = extract_config_modules(config_path)

    if not config_modules:
        issues.append(Issue(
            pattern="P5",
            severity="WARNING",
            file="neko-gundan.config.yaml",
            message="No modules found in shitsuke section (file missing or empty?)",
        ))
        return issues

    modules_dir = root / "modules"

    for module_name, line_num in config_modules:
        # Convert underscore to hyphen for filename lookup
        filename = module_name.replace("_", "-") + ".md"
        full_path = modules_dir / filename

        if not full_path.is_file():
            issues.append(Issue(
                pattern="P5",
                severity="ERROR",
                file=f"neko-gundan.config.yaml:{line_num}",
                message=(
                    f"Config registers module `{module_name}` "
                    f"but `modules/{filename}` does not exist"
                ),
            ))

    return issues


# =============================================================================
# Main
# =============================================================================

def main() -> int:
    """Run all validation patterns and report results."""
    # Determine project root
    if len(sys.argv) > 1:
        root = Path(sys.argv[1])
    else:
        root = Path.cwd()

    root = root.resolve()

    if not root.is_dir():
        print(f"ERROR: Project root does not exist: {root}", file=sys.stderr)
        return 1

    print(f"Validating framework integrity: {root}")
    print("=" * 70)

    # Run all validators
    validators = [
        ("P1: Active Modules -> modules/ file existence", validate_p1),
        ("P2: modules/*.md Integration Points section", validate_p2),
        ("P3: Active Modules step numbers vs Work Procedure", validate_p3),
        ("P4: completion-gates.md gate number consistency", validate_p4),
        ("P5: config.yaml modules -> modules/ file existence", validate_p5),
    ]

    all_issues: List[Issue] = []

    for label, validator_fn in validators:
        print(f"\n[{label}]")
        issues = validator_fn(root)
        all_issues.extend(issues)

        if issues:
            for issue in issues:
                print(f"  {issue.severity}: {issue.file}")
                print(f"    {issue.message}")
        else:
            print("  PASS: No issues found")

    # Summary
    print("\n" + "=" * 70)
    errors = sum(1 for i in all_issues if i.severity == "ERROR")
    warnings = sum(1 for i in all_issues if i.severity == "WARNING")

    if errors == 0 and warnings == 0:
        print("RESULT: ALL CHECKS PASSED (0 issues)")
        return 0
    else:
        print(f"RESULT: {errors} error(s), {warnings} warning(s)")
        return 1 if errors > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
