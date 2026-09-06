"""
Document parsing and text extraction for knowledge ingestion.

Supports:
- PDF documents (.pdf) via pypdf with page-by-page extraction
- Microsoft Word documents (.docx) via native XML parsing
- Markdown (.md)
- Plain text (.txt)
- JSON documents & FAQs (.json)
- Structured CSV files (.csv)
"""

import io
import json
import os
from typing import Any, Dict, Tuple
import xml.etree.ElementTree as ET
import zipfile


def parse_document_content(
    raw_content: bytes,
    filename: str,
    max_size_bytes: int = 15728640,  # 15MB
) -> Tuple[str, str, str]:
    """
    Safely parses uploaded bytes into clean, chunk-ready text.

    Args:
        raw_content: Raw byte payload of the uploaded document.
        filename: Original file name.
        max_size_bytes: Maximum allowed file size in bytes (default: 15MB).

    Returns:
        (title, source_type, extracted_text)

    Raises:
        ValueError: If file is oversized, corrupted, or cannot be parsed.
    """
    if len(raw_content) > max_size_bytes:
        raise ValueError(
            f"File size ({len(raw_content)} bytes) exceeds maximum limit of {max_size_bytes} bytes."
        )

    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    base_name = os.path.splitext(os.path.basename(filename))[0]
    title = base_name.replace("_", " ").replace("-", " ").strip().title()

    # 1. PDF Document Extraction via pypdf
    if ext == "pdf":
        try:
            import pypdf

            reader = pypdf.PdfReader(io.BytesIO(raw_content))
            pages_text = []
            for idx, page in enumerate(reader.pages, start=1):
                page_content = page.extract_text() or ""
                trimmed = page_content.strip()
                if trimmed:
                    pages_text.append(f"## Page {idx}\n{trimmed}")

            if not pages_text:
                raise ValueError(
                    f"PDF '{filename}' contains no extractable text (it may be a scanned document or image). "
                    "Please upload a text-based PDF or Markdown/Text document."
                )

            return title, "pdf", "\n\n".join(pages_text)
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF '{filename}': {e}")

    # 2. Microsoft Word (.docx) Extraction via native ZIP/XML
    elif ext == "docx":
        try:
            with zipfile.ZipFile(io.BytesIO(raw_content)) as z:
                if "word/document.xml" not in z.namelist():
                    raise ValueError("Invalid .docx file: word/document.xml not found.")
                xml_content = z.read("word/document.xml")
                tree = ET.fromstring(xml_content)
                paragraphs = []
                # Namespace-agnostic element traversal
                for p in tree.iter():
                    if p.tag.endswith("}p"):
                        texts = [elem.text for elem in p.iter() if elem.tag.endswith("}t") and elem.text]
                        if texts:
                            paragraphs.append("".join(texts).strip())

                extracted = "\n\n".join([p for p in paragraphs if p])
                if not extracted.strip():
                    raise ValueError(f"DOCX '{filename}' contains no extractable paragraph text.")
                return title, "docx", extracted
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Failed to extract text from Word document '{filename}': {e}")

    # 3. Markdown & Plain Text
    elif ext in ("md", "markdown", "txt"):
        try:
            text = raw_content.decode("utf-8")
        except UnicodeDecodeError:
            text = raw_content.decode("latin-1")
        if not text.strip():
            raise ValueError(f"Document '{filename}' is empty.")
        return title, ext, text

    # 4. JSON & FAQs
    elif ext == "json":
        try:
            data = json.loads(raw_content.decode("utf-8"))
            if isinstance(data, list):
                paragraphs = []
                for item in data:
                    if isinstance(item, dict):
                        q = item.get("question", item.get("q", ""))
                        a = item.get("answer", item.get("a", ""))
                        if q or a:
                            paragraphs.append(f"### Q: {q}\n**A:** {a}")
                        else:
                            paragraphs.append(json.dumps(item))
                    else:
                        paragraphs.append(str(item))
                return title, "json", "\n\n".join(paragraphs)
            elif isinstance(data, dict):
                return title, "json", json.dumps(data, indent=2)
            return title, "json", str(data)
        except Exception as e:
            raise ValueError(f"Malformed JSON document '{filename}': {e}")

    # 5. CSV Data
    elif ext == "csv":
        try:
            text = raw_content.decode("utf-8")
        except UnicodeDecodeError:
            text = raw_content.decode("latin-1")
        if not text.strip():
            raise ValueError(f"CSV '{filename}' is empty.")
        return title, "csv", text

    # 6. Default Fallback
    try:
        text = raw_content.decode("utf-8", errors="replace")
        if not text.strip():
            raise ValueError(f"Document '{filename}' contains no readable content.")
        return title, ext or "txt", text
    except Exception as e:
        raise ValueError(f"Unable to parse document '{filename}': {e}")
