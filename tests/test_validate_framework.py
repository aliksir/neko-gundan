#!/usr/bin/env python3
"""Tests for validate_framework.py"""

import unittest
from pathlib import Path
import tempfile
import os
import sys

# Add scripts/ to path so we can import the module
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from validate_framework import (
    extract_active_modules_from_agents,
    validate_p2,
    validate_p5,
    main,
)


class TestP1ExtractActiveModules(unittest.TestCase):
    """P1: Active Modules extraction from agent files."""

    def _write_agent(self, agents_dir: Path, name: str, content: str):
        (agents_dir / name).write_text(content, encoding="utf-8")

    def test_table_format(self):
        """テーブル形式からモジュール参照を抽出できる"""
        with tempfile.TemporaryDirectory() as tmp:
            agents_dir = Path(tmp) / "agents"
            agents_dir.mkdir()
            self._write_agent(agents_dir, "shigoto-neko.md", """\
# Shigoto-neko

## Active Modules

| Module | When |
|--------|------|
| `modules/heartbeat.md` | step 3 |
| `modules/race-prevention.md` | always |

## Other Section
""")
            refs = extract_active_modules_from_agents(agents_dir)
            self.assertIn("modules/heartbeat.md", refs)
            self.assertIn("modules/race-prevention.md", refs)
            self.assertEqual(len(refs), 2)

    def test_bullet_list_format(self):
        """箇条書き形式からモジュール参照を抽出できる"""
        with tempfile.TemporaryDirectory() as tmp:
            agents_dir = Path(tmp) / "agents"
            agents_dir.mkdir()
            self._write_agent(agents_dir, "oyakata-neko.md", """\
# Oyakata-neko

## Active Modules

- `modules/heartbeat.md` — 常時ON
- `modules/reflexion.md` — 失敗時

## Other Section
""")
            refs = extract_active_modules_from_agents(agents_dir)
            self.assertIn("modules/heartbeat.md", refs)
            self.assertIn("modules/reflexion.md", refs)
            self.assertEqual(len(refs), 2)

    def test_mixed_format(self):
        """テーブルと箇条書きが混在する場合（別ファイル）両方抽出できる"""
        with tempfile.TemporaryDirectory() as tmp:
            agents_dir = Path(tmp) / "agents"
            agents_dir.mkdir()
            self._write_agent(agents_dir, "a.md", """\
## Active Modules

| Module | When |
|--------|------|
| `modules/alpha.md` | always |

## End
""")
            self._write_agent(agents_dir, "b.md", """\
## Active Modules

- `modules/beta.md` — always

## End
""")
            refs = extract_active_modules_from_agents(agents_dir)
            self.assertIn("modules/alpha.md", refs)
            self.assertIn("modules/beta.md", refs)

    def test_no_active_modules_section(self):
        """Active Modulesセクションがないファイルは空を返す"""
        with tempfile.TemporaryDirectory() as tmp:
            agents_dir = Path(tmp) / "agents"
            agents_dir.mkdir()
            self._write_agent(agents_dir, "empty.md", """\
# Agent

## Some Section

Nothing here.
""")
            refs = extract_active_modules_from_agents(agents_dir)
            self.assertEqual(len(refs), 0)

    def test_no_agents_dir(self):
        """agents/ディレクトリが存在しない場合は空を返す"""
        with tempfile.TemporaryDirectory() as tmp:
            refs = extract_active_modules_from_agents(Path(tmp) / "agents")
            self.assertEqual(len(refs), 0)


class TestP2IntegrationPoints(unittest.TestCase):
    """P2: modules/*.md に Integration Points セクションがあるか"""

    def test_has_integration_points(self):
        """Integration Pointsがあればissueなし"""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            modules_dir = root / "modules"
            modules_dir.mkdir()
            (modules_dir / "heartbeat.md").write_text(
                "# Heartbeat\n\n## Integration Points\n\n- agents\n",
                encoding="utf-8",
            )
            issues = validate_p2(root)
            self.assertEqual(len(issues), 0)

    def test_missing_integration_points(self):
        """Integration Pointsがなければwarning"""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            modules_dir = root / "modules"
            modules_dir.mkdir()
            (modules_dir / "broken.md").write_text(
                "# Broken Module\n\nNo integration.\n",
                encoding="utf-8",
            )
            issues = validate_p2(root)
            self.assertEqual(len(issues), 1)
            self.assertEqual(issues[0].severity, "WARNING")
            self.assertEqual(issues[0].pattern, "P2")

    def test_no_modules_dir(self):
        """modules/ディレクトリがなければerror"""
        with tempfile.TemporaryDirectory() as tmp:
            issues = validate_p2(Path(tmp))
            self.assertEqual(len(issues), 1)
            self.assertEqual(issues[0].severity, "ERROR")


class TestP5ConfigModules(unittest.TestCase):
    """P5: config.yaml の underscore→hyphen 変換とファイル存在チェック"""

    def test_underscore_to_hyphen(self):
        """config.yamlのunderscore名がhyphenファイル名にマッチする"""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            modules_dir = root / "modules"
            modules_dir.mkdir()
            (modules_dir / "race-prevention.md").write_text(
                "# Race Prevention\n\n## Integration Points\n\n- agents\n",
                encoding="utf-8",
            )
            (root / "neko-gundan.config.yaml").write_text(
                "shitsuke:\n  race_prevention: true\n",
                encoding="utf-8",
            )
            issues = validate_p5(root)
            self.assertEqual(len(issues), 0)

    def test_missing_module_file(self):
        """対応するモジュールファイルがなければerror"""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            modules_dir = root / "modules"
            modules_dir.mkdir()
            (root / "neko-gundan.config.yaml").write_text(
                "shitsuke:\n  nonexistent_module: true\n",
                encoding="utf-8",
            )
            issues = validate_p5(root)
            self.assertEqual(len(issues), 1)
            self.assertEqual(issues[0].pattern, "P5")
            self.assertEqual(issues[0].severity, "ERROR")
            self.assertIn("nonexistent_module", issues[0].message)


class TestMain(unittest.TestCase):
    """メイン関数の統合テスト"""

    def test_valid_project(self):
        """正常なプロジェクト構造で exit code 0"""
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "agents").mkdir()
            (root / "modules").mkdir()
            (root / "rules").mkdir()
            # minimal completion-gates.md
            (root / "rules" / "completion-gates.md").write_text(
                "# Completion Gates\n\n## Core Gate Items\n\n1. Check\n",
                encoding="utf-8",
            )
            # minimal config
            (root / "neko-gundan.config.yaml").write_text(
                "shitsuke:\n  heartbeat: true\n",
                encoding="utf-8",
            )
            # module file
            (root / "modules" / "heartbeat.md").write_text(
                "# Heartbeat\n\n## Integration Points\n\n- agents\n",
                encoding="utf-8",
            )
            # agent file referencing the module
            (root / "agents" / "test-agent.md").write_text(
                "## Active Modules\n\n- `modules/heartbeat.md` — always\n\n## End\n",
                encoding="utf-8",
            )
            # Run main with project root argument
            original_argv = sys.argv
            sys.argv = ["validate_framework.py", str(root)]
            try:
                exit_code = main()
            finally:
                sys.argv = original_argv
            self.assertEqual(exit_code, 0)

    def test_invalid_project_root(self):
        """存在しないディレクトリで exit code 1"""
        original_argv = sys.argv
        sys.argv = ["validate_framework.py", "/nonexistent/path/abc123"]
        try:
            exit_code = main()
        finally:
            sys.argv = original_argv
        self.assertEqual(exit_code, 1)


if __name__ == "__main__":
    unittest.main()
