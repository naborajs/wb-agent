"""
Friday Problem & Issue Reporting Service.
Central telemetry and diagnostic reporting engine for Friday.
Records internal runtime failures, unhandled user requests (capability gaps),
tool/action execution errors, and explicit operator-filed bug reports ('report this problem').
Dual-persists to SQLite database and append-only JSONL / Markdown audit trails.
"""

from datetime import datetime
import json
import os
from pathlib import Path
import traceback
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.base import Base, utc_now
from app.database.models import AgentNotification, FridayProblemReport
from app.utils.logging import logger

REPORTS_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
REPORTS_JSONL_PATH = REPORTS_DATA_DIR / "friday_reports.jsonl"
DOCS_REPORTS_MD_PATH = Path(__file__).resolve().parent.parent.parent.parent / "docs" / "reports" / "friday_issues.md"


def generate_report_code() -> str:
    """Generates a human-readable, unique report identifier e.g. REP-20260919-A1B2."""
    now_str = utc_now().strftime("%Y%m%d")
    random_suffix = uuid.uuid4().hex[:4].upper()
    return f"REP-{now_str}-{random_suffix}"


class FridayReportService:
    """
    Manages structured issue, error, and capability gap reports for Friday.
    """

    @classmethod
    async def record_problem(
        cls,
        session: AsyncSession,
        org_id: str,
        category: str,
        title: str,
        description: str,
        user_instruction: Optional[str] = None,
        current_path: Optional[str] = "/",
        error_trace: Optional[str] = None,
        context_data: Optional[Dict[str, Any]] = None,
        suggested_fix: Optional[str] = None,
        severity: str = "medium",
    ) -> Dict[str, Any]:
        """
        Persists a problem report to SQLite and file audit trails,
        dispatches a real-time AgentNotification and WebSocket event.
        """
        # Ensure database tables exist
        try:
            conn = await session.connection()
            await conn.run_sync(Base.metadata.create_all)
        except Exception as e:
            logger.debug(f"[FridayReportService] DB metadata sync notice: {e}")

        report_code = generate_report_code()
        created_dt = utc_now()
        context_payload = context_data or {}

        # 1. Store in SQLite Database
        report_entry = FridayProblemReport(
            org_id=org_id,
            report_code=report_code,
            category=category,
            severity=severity,
            title=title[:255],
            description=description,
            user_instruction=user_instruction,
            current_path=current_path or "/",
            error_trace=error_trace,
            context_data=context_payload,
            suggested_fix=suggested_fix,
            status="open",
        )
        session.add(report_entry)

        # 2. Create AgentNotification for Dashboard Visibility
        notif_severity = "critical" if severity in ("critical", "high") else "warning"
        notif = AgentNotification(
            org_id=org_id,
            sender_brain="FRIDAY",
            title=f"Friday Report [{report_code}]: {title[:40]}",
            content=f"[{category}] {description[:160]}",
            category="SYSTEM_ALERT",
            severity=notif_severity,
            action_url="/brain",
        )
        session.add(notif)

        try:
            await session.commit()
            await session.refresh(report_entry)
        except Exception as commit_err:
            await session.rollback()
            logger.error(f"[FridayReportService] Database commit error: {commit_err}")

        # 3. Broadcast Real-Time WebSocket Alerts
        try:
            from app.realtime.connection_manager import ws_manager
            await ws_manager.broadcast_to_org(org_id, "friday_problem_reported", {
                "report_id": report_entry.id,
                "report_code": report_entry.report_code,
                "category": report_entry.category,
                "severity": report_entry.severity,
                "title": report_entry.title,
                "description": report_entry.description,
                "user_instruction": report_entry.user_instruction,
                "status": report_entry.status,
                "created_at": created_dt.isoformat(),
            })
            await ws_manager.broadcast_to_org(org_id, "agent_notification", {
                "id": notif.id,
                "sender_brain": notif.sender_brain,
                "title": notif.title,
                "content": notif.content,
                "category": notif.category,
                "severity": notif.severity,
                "is_read": False,
                "action_url": notif.action_url,
                "created_at": created_dt.isoformat(),
            })
        except Exception as ws_err:
            logger.debug(f"[FridayReportService] Realtime broadcast notice: {ws_err}")

        # 4. Append to JSONL File Audit Trail
        report_dict = {
            "id": report_entry.id,
            "report_code": report_entry.report_code,
            "category": report_entry.category,
            "severity": report_entry.severity,
            "title": report_entry.title,
            "description": report_entry.description,
            "user_instruction": report_entry.user_instruction,
            "current_path": report_entry.current_path,
            "error_trace": report_entry.error_trace,
            "context_data": report_entry.context_data,
            "suggested_fix": report_entry.suggested_fix,
            "status": report_entry.status,
            "created_at": created_dt.isoformat(),
        }

        try:
            REPORTS_DATA_DIR.mkdir(parents=True, exist_ok=True)
            with open(REPORTS_JSONL_PATH, "a", encoding="utf-8") as f:
                f.write(json.dumps(report_dict, default=str) + "\n")
        except Exception as file_err:
            logger.warning(f"[FridayReportService] Failed to write JSONL audit log: {file_err}")

        # 5. Append to Markdown Report Log if docs exist
        try:
            if DOCS_REPORTS_MD_PATH.parent.exists():
                md_entry = (
                    f"\n### [{report_code}] {title}\n"
                    f"- **Category:** `{category}` | **Severity:** `{severity}` | **Status:** `OPEN`\n"
                    f"- **Logged At:** {created_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
                    f"- **User Prompt:** *\"{user_instruction or 'N/A'}\"*\n"
                    f"- **Description:** {description}\n"
                )
                if suggested_fix:
                    md_entry += f"- **Suggested Fix:** {suggested_fix}\n"
                if error_trace:
                    md_entry += f"- **Error Trace:**\n```\n{error_trace[:300]}\n```\n"

                with open(DOCS_REPORTS_MD_PATH, "a", encoding="utf-8") as mf:
                    mf.write(md_entry)
        except Exception as md_err:
            logger.debug(f"[FridayReportService] Markdown append notice: {md_err}")

        logger.info(
            f"[FridayReportService] Logged report {report_code} ({category}): {title}"
        )

        return report_dict

    @classmethod
    async def list_reports(
        cls,
        session: AsyncSession,
        org_id: str,
        status: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Retrieves recent problem reports matching filters."""
        stmt = select(FridayProblemReport).where(FridayProblemReport.org_id == org_id)
        if status:
            stmt = stmt.where(FridayProblemReport.status == status)
        if category:
            stmt = stmt.where(FridayProblemReport.category == category)
        stmt = stmt.order_by(desc(FridayProblemReport.created_at)).limit(limit)

        results = (await session.execute(stmt)).scalars().all()
        return [
            {
                "id": r.id,
                "report_code": r.report_code,
                "category": r.category,
                "severity": r.severity,
                "title": r.title,
                "description": r.description,
                "user_instruction": r.user_instruction,
                "current_path": r.current_path,
                "error_trace": r.error_trace,
                "context_data": r.context_data,
                "suggested_fix": r.suggested_fix,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "resolved_at": r.resolved_at.isoformat() if r.resolved_at else None,
                "resolved_by": r.resolved_by,
                "resolution_notes": r.resolution_notes,
            }
            for r in results
        ]

    @classmethod
    async def resolve_report(
        cls,
        session: AsyncSession,
        org_id: str,
        report_id_or_code: str,
        resolved_by: str = "operator",
        resolution_notes: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Marks a problem report as resolved."""
        stmt = select(FridayProblemReport).where(
            FridayProblemReport.org_id == org_id,
            or_(
                FridayProblemReport.id == report_id_or_code,
                FridayProblemReport.report_code == report_id_or_code,
            ),
        )
        report = (await session.execute(stmt)).scalar_one_or_none()
        if not report:
            return None

        report.status = "resolved"
        report.resolved_at = utc_now()
        report.resolved_by = resolved_by
        report.resolution_notes = resolution_notes or "Resolved by developer or operator."
        await session.commit()
        await session.refresh(report)

        return {
            "id": report.id,
            "report_code": report.report_code,
            "status": report.status,
            "resolved_at": report.resolved_at.isoformat() if report.resolved_at else None,
            "resolved_by": report.resolved_by,
            "resolution_notes": report.resolution_notes,
        }

    @classmethod
    def format_chat_confirmation(cls, rep: Dict[str, Any]) -> str:
        """Formats a clean, executive markdown response for Friday chat."""
        cat_badge = {
            "CAPABILITY_GAP": "🧩 Capability Gap",
            "INTERNAL_ERROR": "⚠️ Internal Error",
            "TOOL_FAILURE": "🛠️ Tool Failure",
            "USER_REPORTED": "📋 User Bug Report",
            "NAVIGATION_FAILURE": "🧭 Navigation Issue",
            "MODEL_FAILURE": "🤖 Model API Issue",
        }.get(rep.get("category", ""), f"📌 {rep.get('category')}")

        return (
            f"📋 **Problem Report Filed Successfully!**\n\n"
            f"• **Report Code:** `{rep['report_code']}`\n"
            f"• **Category:** {cat_badge}\n"
            f"• **Summary:** {rep['title']}\n"
            f"• **Severity:** `{rep.get('severity', 'medium').upper()}`\n"
            f"• **Status:** `OPEN` (Stored for Engineering Review)\n\n"
            f"{rep.get('description', '')}\n\n"
            f"I have saved the full context, user prompt, and diagnostics to our system issue registry "
            f"(`friday_reports.jsonl` & database) so our developers can inspect and fix this directly."
        )

    @classmethod
    def format_chat_report_list(cls, reports: List[Dict[str, Any]]) -> str:
        """Formats a summary of open reports for Friday chat."""
        if not reports:
            return "🎉 **All Clear!** There are currently no open problem reports or recorded capability gaps in Friday's registry."

        lines = [f"📊 **Recorded Friday Problem Reports ({len(reports)}):**\n"]
        for r in reports[:10]:
            status_icon = "🟢" if r["status"] == "resolved" else "🔴"
            created_str = r.get("created_at", "")[:10]
            lines.append(
                f"{status_icon} **`{r['report_code']}`** `[{r['category']}]` — **{r['title']}**\n"
                f"   *Status: {r['status'].upper()} | Severity: {r['severity']} | Date: {created_str}*\n"
                f"   *{r['description'][:100]}...*\n"
            )

        if len(reports) > 10:
            lines.append(f"\n*...and {len(reports) - 10} more reports in `/api/v1/brain/reports`.*")

        lines.append("\nYou can ask me to resolve any report by code, or check full telemetry at `/api/v1/brain/reports`.")
        return "\n".join(lines)
