"""
Job Handler Registry mapping job types to asynchronous worker execution routines.
"""

from typing import Any, Callable, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.jobs.handlers.messages import handle_process_message
from app.jobs.handlers.background_analysis import handle_background_analysis

JOB_HANDLERS: Dict[str, Callable] = {
    "process_message": handle_process_message,
    "background_analysis": handle_background_analysis,
}


def register_handler(job_type: str, handler_func: Callable):
    """Registers a new job handler dynamically."""
    JOB_HANDLERS[job_type] = handler_func


def get_handler(job_type: str) -> Callable:
    """Retrieves handler for a given job type or raises ValueError."""
    if job_type not in JOB_HANDLERS:
        raise ValueError(f"No registered worker handler for job type '{job_type}'.")
    return JOB_HANDLERS[job_type]
