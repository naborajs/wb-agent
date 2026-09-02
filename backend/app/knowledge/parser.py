"""
Document parsing and text extraction for knowledge ingestion.

Supports:
- Markdown (.md)
- Plain text (.txt)
- JSON documents & FAQs (.json)
- Structured CSV files (.csv)
- PDF fallback text extraction
"""

import json
import os
from typing import Any, Dict, Tuple


def parse_document_content(
    raw_content: bytes,
    filename: str,
    max_size_bytes: int = 10485760,
) -> Tuple[str, str, str]:
    """
    Safely parses uploaded bytes into clean text.

    Args:
        raw_content: Raw byte payload of the uploaded document.
        filename: Original file name.
        max_size_bytes: Maximum allowed file size in bytes.

    Returns:
        (title, source_type, extracted_text)

    Raises:
        ValueError: If file is oversized or cannot be parsed.
    """
    if len(raw_content) > max_size_bytes:
        raise ValueError(
            f"File size ({len(raw_content)} bytes) exceeds maximum limit of {max_size_bytes} bytes."
        )

    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    title = os.path.splitext(os.path.basename(filename))[0].replace("_", " ").title()

    if ext in ("md", "markdown", "txt"):
        try:
            text = raw_content.decode("utf-8")
        except UnicodeDecodeError:
            text = raw_content.decode("latin-1")
        return title, ext, text

    elif ext == "json":
        try:
            data = json.loads(raw_content.decode("utf-8"))
            # If JSON FAQ format: [{"question": "...", "answer": "..."}]
            if isinstance(data, list):
                paragraphs = []
                for item in data:
                    if isinstance(item, dict):
                        q = item.get("question", item.get("q", ""))
                        a = item.get("answer", item.get("a", ""))
                        paragraphs.append(f"### Q: {q}\n**A:** {a}")
                    else:
                        paragraphs.append(str(item))
                return title, "json", "\n\n".join(paragraphs)
            elif isinstance(data, dict):
                return title, "json", json.dumps(data, indent=2)
            return title, "json", str(data)
        except Exception as e:
            raise ValueError(f"Malformed JSON document: {e}")

    elif ext == "csv":
        try:
            text = raw_content.decode("utf-8")
            return title, "csv", text
        except UnicodeDecodeError:
            return title, "csv", raw_content.decode("latin-1")

    # Default fallback
    try:
        text = raw_content.decode("utf-8", errors="replace")
        return title, ext or "txt", text
    except Exception as e:
        raise ValueError(f"Unable to parse document '{filename}': {e}")
