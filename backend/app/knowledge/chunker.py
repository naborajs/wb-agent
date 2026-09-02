"""
Text chunking utilities: header-aware, markdown-friendly recursive chunker with overlap.
"""

import re
from typing import Any, Dict, List


class TextChunk:
    def __init__(
        self,
        content: str,
        section_heading: str = "General",
        chunk_index: int = 0,
        metadata: Dict[str, Any] = None,
    ):
        self.content = content
        self.section_heading = section_heading
        self.chunk_index = chunk_index
        self.metadata = metadata or {}


def chunk_markdown_document(
    text: str,
    max_chunk_chars: int = 800,
    chunk_overlap: int = 100,
) -> List[TextChunk]:
    """
    Splits markdown or text documents into chunks based on headers, paragraphs, and token bounds.
    """
    if not text or not text.strip():
        return []

    # Detect header lines: e.g. # Header 1, ## Header 2
    header_pattern = re.compile(r"^(#{1,4}\s+.+)$", re.MULTILINE)
    splits = header_pattern.split(text)

    chunks: List[TextChunk] = []
    current_heading = "Overview"
    chunk_idx = 0

    for part in splits:
        part_trimmed = part.strip()
        if not part_trimmed:
            continue

        if part_trimmed.startswith("#"):
            current_heading = part_trimmed.lstrip("#").strip()
            continue

        # If section is small enough, keep as single chunk
        if len(part_trimmed) <= max_chunk_chars:
            chunks.append(
                TextChunk(
                    content=part_trimmed,
                    section_heading=current_heading,
                    chunk_index=chunk_idx,
                )
            )
            chunk_idx += 1
        else:
            # Split by double newlines (paragraphs)
            paragraphs = part_trimmed.split("\n\n")
            current_buffer = ""

            for p in paragraphs:
                p_clean = p.strip()
                if not p_clean:
                    continue

                if len(current_buffer) + len(p_clean) + 2 <= max_chunk_chars:
                    current_buffer = f"{current_buffer}\n\n{p_clean}".strip()
                else:
                    if current_buffer:
                        chunks.append(
                            TextChunk(
                                content=current_buffer,
                                section_heading=current_heading,
                                chunk_index=chunk_idx,
                            )
                        )
                        chunk_idx += 1
                        # Retain overlap from end of previous buffer
                        overlap_tail = current_buffer[-chunk_overlap:] if len(current_buffer) > chunk_overlap else ""
                        current_buffer = f"{overlap_tail}\n\n{p_clean}".strip()
                    else:
                        current_buffer = p_clean

            if current_buffer:
                chunks.append(
                    TextChunk(
                        content=current_buffer,
                        section_heading=current_heading,
                        chunk_index=chunk_idx,
                    )
                )
                chunk_idx += 1

    return chunks
