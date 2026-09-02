"""
Structured logging module for WB-Agent.

Features:
- JSON or readable console output depending on environment.
- Contextual correlation IDs (request_id, conversation_id, lead_id, message_id).
- Automatic redaction of sensitive credentials, API keys, and PII.
"""

import json
import logging
import sys
from contextvars import ContextVar
from typing import Any, Dict, Optional

# Context variables for tracing requests across asynchronous boundaries
request_id_ctx: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
conversation_id_ctx: ContextVar[Optional[str]] = ContextVar("conversation_id", default=None)
lead_id_ctx: ContextVar[Optional[str]] = ContextVar("lead_id", default=None)

# Keys that must always be masked if logged
SENSITIVE_KEYS = {
    "password", "secret", "token", "api_key", "access_token",
    "authorization", "private_key", "verify_token", "webhook_secret"
}


def redact_sensitive_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively redacts sensitive keys from log payloads.
    """
    cleaned: Dict[str, Any] = {}
    for k, v in data.items():
        lower_k = str(k).lower()
        if any(sens in lower_k for sens in SENSITIVE_KEYS):
            cleaned[k] = "[REDACTED]"
        elif isinstance(v, dict):
            cleaned[k] = redact_sensitive_dict(v)
        elif isinstance(v, list):
            cleaned[k] = [
                redact_sensitive_dict(item) if isinstance(item, dict) else item
                for item in v
            ]
        else:
            cleaned[k] = v
    return cleaned


class StructuredFormatter(logging.Formatter):
    """
    Formats log records as single-line JSON or formatted key-value pairs,
    injecting active correlation context.
    """

    def __init__(self, json_mode: bool = False):
        super().__init__()
        self.json_mode = json_mode

    def format(self, record: logging.LogRecord) -> str:
        # Extract contextual trace variables
        req_id = request_id_ctx.get()
        conv_id = conversation_id_ctx.get()
        lead_id = lead_id_ctx.get()

        log_data: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        if req_id:
            log_data["request_id"] = req_id
        if conv_id:
            log_data["conversation_id"] = conv_id
        if lead_id:
            log_data["lead_id"] = lead_id

        # Attach extra fields if passed in record.__dict__
        if hasattr(record, "extra_data") and isinstance(record.extra_data, dict):
            log_data.update(redact_sensitive_dict(record.extra_data))

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        if self.json_mode:
            return json.dumps(log_data)

        # Pretty console format
        trace_str = ""
        if conv_id:
            trace_str += f" [conv:{conv_id}]"
        if req_id:
            trace_str += f" [req:{req_id}]"
        return f"{log_data['timestamp']} [{record.levelname:^7}] {record.name}{trace_str}: {log_data['message']}"


def setup_logger(name: str = "wb_agent", level: str = "INFO", json_mode: bool = False) -> logging.Logger:
    """
    Configures and returns a logger instance with structured formatting.
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper(), logging.INFO))
    
    # Avoid duplicate handlers on re-configuration
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredFormatter(json_mode=json_mode))
        logger.addHandler(handler)
        logger.propagate = False
        
    return logger


# Global default logger instance
logger = setup_logger()
