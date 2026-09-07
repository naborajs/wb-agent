"""
Codebase Self-Inspection, Diagnostics, and Meta-Cognitive Analysis Service.
Equips both Friday (Web Copilot) and EDITH (Commercial Closer) with live API access
to inspect their own codebase, search Python backend & Next.js frontend files,
trace system errors, and understand root causes.
"""

from pathlib import Path
import re
from typing import Any, Dict, List, Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.models import (
    Conversation,
    Customer,
    InterBrainMessage,
    Lead,
    Order,
    Product,
    PricingRule,
    WatchdogAlert,
)
from app.utils.logging import logger

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class CodebaseService:
    """
    Self-inspection engine for AI agents (Friday & EDITH) to inspect their own code,
    search functions, trace exceptions, and verify architecture.
    """

    @staticmethod
    def _resolve_safe_path(rel_path: str) -> Path:
        """Resolves path relative to project root and prevents directory traversal attacks."""
        clean = rel_path.strip().lstrip("/\\")
        target = (PROJECT_ROOT / clean).resolve()
        try:
            target.relative_to(PROJECT_ROOT)
        except ValueError:
            raise ValueError(f"Access denied: path '{rel_path}' is outside the repository root.")
        return target

    @classmethod
    def read_code_file(
        cls,
        rel_path: str,
        start_line: int = 1,
        end_line: int = 150,
    ) -> Dict[str, Any]:
        """
        Reads a snippet of code from any file in the repository.
        Lines are 1-indexed.
        """
        safe_path = cls._resolve_safe_path(rel_path)
        if not safe_path.exists():
            raise FileNotFoundError(f"File not found: {rel_path}")
        if not safe_path.is_file():
            raise ValueError(f"Path is a directory, not a file: {rel_path}")

        try:
            with open(safe_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
        except Exception as e:
            raise IOError(f"Could not read file '{rel_path}': {e}")

        total_lines = len(lines)
        start = max(1, start_line)
        end = min(total_lines, max(start, end_line))

        selected_lines = [
            f"{i + 1}: {lines[i]}"
            for i in range(start - 1, end)
        ]
        content = "".join(lines[start - 1 : end])

        return {
            "path": rel_path.replace("\\", "/"),
            "absolute_path": str(safe_path),
            "total_lines": total_lines,
            "start_line": start,
            "end_line": end,
            "lines_with_numbers": "".join(selected_lines),
            "raw_content": content,
        }

    @classmethod
    def search_codebase(
        cls,
        query: str,
        directory: str = "backend/app",
        max_results: int = 30,
    ) -> Dict[str, Any]:
        """
        Searches the codebase for a text pattern or symbol.
        """
        safe_dir = cls._resolve_safe_path(directory)
        if not safe_dir.exists() or not safe_dir.is_dir():
            safe_dir = PROJECT_ROOT

        matches: List[Dict[str, Any]] = []
        pattern = re.compile(re.escape(query), re.IGNORECASE)

        valid_exts = {".py", ".ts", ".tsx", ".js", ".json", ".md", ".toml", ".txt"}

        for p in safe_dir.rglob("*"):
            if not p.is_file():
                continue
            if any(part in p.parts for part in {".git", "node_modules", ".next", "__pycache__", ".pytest_cache", ".venv", "venv"}):
                continue
            if p.suffix.lower() not in valid_exts:
                continue

            try:
                with open(p, "r", encoding="utf-8", errors="ignore") as f:
                    for line_idx, line in enumerate(f, start=1):
                        if pattern.search(line):
                            rel_p = str(p.relative_to(PROJECT_ROOT)).replace("\\", "/")
                            matches.append({
                                "file": rel_p,
                                "line_number": line_idx,
                                "content": line.strip(),
                            })
                            if len(matches) >= max_results:
                                break
            except Exception:
                pass
            if len(matches) >= max_results:
                break

        return {
            "query": query,
            "directory": directory,
            "matches_found": len(matches),
            "matches": matches,
        }

    @classmethod
    def get_structure(
        cls,
        subdir: str = "backend/app",
        max_depth: int = 3,
    ) -> Dict[str, Any]:
        """
        Returns file tree structure of a given codebase directory.
        """
        safe_dir = cls._resolve_safe_path(subdir)
        if not safe_dir.is_dir():
            raise ValueError(f"Path is not a directory: {subdir}")

        def _traverse(cur_path: Path, depth: int) -> Dict[str, Any]:
            if depth > max_depth:
                return {"name": cur_path.name, "type": "directory", "children": []}

            children = []
            try:
                for entry in sorted(cur_path.iterdir(), key=lambda x: (not x.is_dir(), x.name)):
                    if entry.name.startswith(".") or entry.name in ("__pycache__", "node_modules", ".next"):
                        continue
                    if entry.is_dir():
                        children.append(_traverse(entry, depth + 1))
                    else:
                        children.append({
                            "name": entry.name,
                            "type": "file",
                            "size_bytes": entry.stat().st_size,
                        })
            except Exception:
                pass

            return {
                "name": cur_path.name,
                "type": "directory",
                "path": str(cur_path.relative_to(PROJECT_ROOT)).replace("\\", "/"),
                "children": children,
            }

        return _traverse(safe_dir, 1)

    @classmethod
    def diagnose_error(
        cls,
        error_message: str,
        traceback_str: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Analyzes an error or exception traceback, locates the relevant file and lines,
        and provides root-cause diagnosis.
        """
        identified_file = None
        identified_line = None

        tb_text = traceback_str or error_message

        # Search for File "...", line X patterns
        file_line_match = re.findall(r'File "([^"]+)", line (\d+)', tb_text)
        if file_line_match:
            raw_path, raw_line = file_line_match[-1]  # Take innermost frame
            try:
                p = Path(raw_path)
                if p.is_absolute() and str(p).startswith(str(PROJECT_ROOT)):
                    identified_file = str(p.relative_to(PROJECT_ROOT)).replace("\\", "/")
                    identified_line = int(raw_line)
                elif not p.is_absolute():
                    identified_file = str(p).replace("\\", "/")
                    identified_line = int(raw_line)
            except Exception:
                pass

        code_snippet = None
        if identified_file and identified_line:
            try:
                start = max(1, identified_line - 5)
                end = identified_line + 5
                read_res = cls.read_code_file(identified_file, start_line=start, end_line=end)
                code_snippet = read_res["lines_with_numbers"]
            except Exception:
                pass

        # Formulate diagnosis explanation
        diagnosis_bullets = []
        if "AttributeError" in error_message:
            attr_match = re.search(r"has no attribute ['\"]([^'\"]+)['\"]", error_message)
            attr_name = attr_match.group(1) if attr_match else "unknown"
            diagnosis_bullets.append(
                f"Missing Attribute: The code attempted to access `.{attr_name}`, which is not defined on the target object."
            )
            diagnosis_bullets.append(
                f"Fix Recommendation: Verify the model/schema definition in {identified_file or 'the model file'} and ensure `{attr_name}` exists or use `getattr(obj, '{attr_name}', None)`."
            )
        elif "KeyError" in error_message:
            diagnosis_bullets.append("Key Error: Attempted to access a dictionary key that does not exist in the dictionary payload.")
            diagnosis_bullets.append("Fix Recommendation: Use `.get('key', default_value)` instead of direct bracket access.")
        elif "ValidationError" in error_message or "pydantic" in error_message.lower():
            diagnosis_bullets.append("Schema Validation Error: The payload does not match expected Pydantic model types or constraints.")
        else:
            diagnosis_bullets.append(f"Runtime Exception: {error_message}")

        return {
            "error_summary": error_message[:200],
            "identified_file": identified_file,
            "identified_line": identified_line,
            "code_context": code_snippet,
            "diagnosis": " ".join(diagnosis_bullets),
            "recommendations": diagnosis_bullets,
        }

    @classmethod
    async def get_system_diagnostics(
        cls,
        session: AsyncSession,
        org_id: str,
    ) -> Dict[str, Any]:
        """
        Gathers comprehensive platform health, database table row counts,
        and service configurations for AI inspection.
        """
        counts = {}
        for model_cls, name in [
            (Lead, "leads"),
            (Customer, "customers"),
            (Conversation, "conversations"),
            (Order, "orders"),
            (Product, "products"),
            (PricingRule, "pricing_rules"),
            (InterBrainMessage, "inter_brain_messages"),
            (WatchdogAlert, "watchdog_alerts"),
        ]:
            try:
                cnt = (await session.execute(select(func.count(model_cls.id)))).scalar_one()
                counts[name] = cnt
            except Exception:
                counts[name] = 0

        return {
            "status": "healthy",
            "org_id": org_id,
            "business_name": settings.BUSINESS_NAME,
            "business_industry": settings.BUSINESS_INDUSTRY,
            "database_tables": counts,
            "active_models": {
                "friday": "Google Gemini 3.1 Flash Live Preview",
                "edith": settings.NVIDIA_MODEL,
                "output_guardrail": "nvidia/llama-3.1-nemotron-safety-guard-8b-v3",
            },
            "environment": settings.APP_ENV,
            "project_root": str(PROJECT_ROOT),
        }
