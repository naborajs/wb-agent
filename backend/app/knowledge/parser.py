"""
Document parsing and text extraction for knowledge ingestion.

Supports:
- PDF documents (.pdf) via pypdf with page-by-page extraction
- Microsoft Word documents (.docx) via native XML parsing
- Excel Spreadsheets (.xlsx) via native XML parsing (openpyxl fallback if available)
- Structured CSV files (.csv) with category-specific tabular schema parsing
- Markdown (.md)
- Plain text (.txt)
- JSON documents & FAQs (.json)
"""

import csv
from decimal import Decimal
import io
import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple
import xml.etree.ElementTree as ET
import zipfile


def parse_csv_structured(
    text: str,
    category: str = "business_info",
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Parses CSV text into clean markdown and extracted structured rows.
    """
    reader = csv.reader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        return "", []

    raw_headers = [h.strip() for h in rows[0]]
    norm_headers = [h.lower().replace(" ", "_").replace("-", "_") for h in raw_headers]
    data_rows = rows[1:]

    structured_items: List[Dict[str, Any]] = []
    markdown_lines: List[str] = []

    # Category 1: Pricing Rules
    if category == "pricing_rule":
        markdown_lines.append("### Commercial Pricing Rules & Volume Tiers\n")
        markdown_lines.append("| Tier / Rule Name | Type | Min Qty | Max Qty | Discount | Max Ceiling | Segment |")
        markdown_lines.append("|---|---|---|---|---|---|---|")

        for r in data_rows:
            if not any(cell.strip() for cell in r):
                continue
            row_dict = {norm_headers[i]: r[i].strip() if i < len(r) else "" for i in range(len(norm_headers))}
            
            rule_name = row_dict.get("rule_name") or row_dict.get("name") or row_dict.get("tier") or "Volume Tier"
            rule_type = row_dict.get("rule_type") or row_dict.get("type") or "volume_tier"
            
            # Numeric extraction helper
            def _clean_num(val: str, default: Optional[float] = None) -> Optional[float]:
                if not val:
                    return default
                cleaned = re.sub(r"[^\d.]", "", val)
                try:
                    return float(cleaned) if cleaned else default
                except Exception:
                    return default

            min_q = _clean_num(row_dict.get("min_quantity") or row_dict.get("min_qty") or row_dict.get("min"), 0.0)
            max_q = _clean_num(row_dict.get("max_quantity") or row_dict.get("max_qty") or row_dict.get("max"), None)
            disc = _clean_num(row_dict.get("discount_percentage") or row_dict.get("discount") or row_dict.get("discount_pct"), 0.0)
            ceiling = _clean_num(row_dict.get("max_autonomous_discount_percentage") or row_dict.get("ceiling") or row_dict.get("max_discount"), disc)
            segment = row_dict.get("customer_segment") or row_dict.get("segment") or "all"

            structured_items.append({
                "rule_name": rule_name,
                "rule_type": rule_type,
                "min_quantity": min_q,
                "max_quantity": max_q,
                "discount_percentage": disc,
                "max_autonomous_discount_percentage": ceiling,
                "customer_segment": segment,
            })

            max_str = f"{max_q}" if max_q is not None else "Unlimited"
            markdown_lines.append(f"| {rule_name} | {rule_type} | {min_q} | {max_str} | {disc}% | {ceiling}% | {segment} |")

    # Category 2: Catalog Products
    elif category == "catalog_product":
        markdown_lines.append("### Commercial Product Catalog\n")
        markdown_lines.append("| SKU | Product Name | Category | Base Price | Unit | MOQ | Status |")
        markdown_lines.append("|---|---|---|---|---|---|---|")

        for r in data_rows:
            if not any(cell.strip() for cell in r):
                continue
            row_dict = {norm_headers[i]: r[i].strip() if i < len(r) else "" for i in range(len(norm_headers))}

            sku = row_dict.get("sku") or row_dict.get("code") or f"SKU-{len(structured_items) + 1:03d}"
            name = row_dict.get("name") or row_dict.get("product_name") or row_dict.get("title") or "Unnamed Product"
            prod_cat = row_dict.get("category") or "General"
            
            def _clean_num(val: str, default: float = 0.0) -> float:
                if not val:
                    return default
                cleaned = re.sub(r"[^\d.]", "", val)
                try:
                    return float(cleaned) if cleaned else default
                except Exception:
                    return default

            price = _clean_num(row_dict.get("base_price") or row_dict.get("price"), 0.0)
            unit = row_dict.get("unit") or row_dict.get("unit_of_measure") or row_dict.get("uom") or "unit"
            moq = _clean_num(row_dict.get("min_order_quantity") or row_dict.get("moq"), 1.0)
            stock_str = (row_dict.get("in_stock") or row_dict.get("stock") or "true").lower()
            in_stock = stock_str in ("true", "1", "yes", "in_stock", "available")
            desc = row_dict.get("description") or ""

            structured_items.append({
                "sku": sku,
                "name": name,
                "category": prod_cat,
                "base_price": price,
                "unit": unit,
                "min_order_quantity": moq,
                "in_stock": in_stock,
                "description": desc,
            })

            status = "In Stock" if in_stock else "Out of Stock"
            markdown_lines.append(f"| {sku} | {name} | {prod_cat} | ₹{price:.2f} | {unit} | {moq} | {status} |")

    # Generic Tabular Fallback for business_info, agent_guidance, or custom
    else:
        markdown_lines.append("| " + " | ".join(raw_headers) + " |")
        markdown_lines.append("| " + " | ".join(["---"] * len(raw_headers)) + " |")
        for r in data_rows:
            if not any(cell.strip() for cell in r):
                continue
            cells = [r[i].strip() if i < len(r) else "" for i in range(len(raw_headers))]
            markdown_lines.append("| " + " | ".join(cells) + " |")
            structured_items.append({norm_headers[i]: cells[i] for i in range(len(norm_headers))})

    return "\n".join(markdown_lines), structured_items


def parse_xlsx_native(raw_content: bytes) -> str:
    """
    Zero-dependency extraction of text and tables from Microsoft Excel (.xlsx) files.
    """
    try:
        with zipfile.ZipFile(io.BytesIO(raw_content)) as z:
            # 1. Read shared strings if present
            shared_strings = []
            if "xl/sharedStrings.xml" in z.namelist():
                sst_xml = z.read("xl/sharedStrings.xml")
                tree = ET.fromstring(sst_xml)
                for elem in tree.iter():
                    if elem.tag.endswith("}t") and elem.text:
                        shared_strings.append(elem.text)

            # 2. Find first worksheet
            sheet_name = None
            for name in ["xl/worksheets/sheet1.xml", "xl/worksheets/Sheet1.xml"]:
                if name in z.namelist():
                    sheet_name = name
                    break
            if not sheet_name:
                sheets = [n for n in z.namelist() if n.startswith("xl/worksheets/sheet")]
                if sheets:
                    sheet_name = sheets[0]

            if not sheet_name:
                raise ValueError("No worksheet XML found in .xlsx archive.")

            sheet_xml = z.read(sheet_name)
            stree = ET.fromstring(sheet_xml)

            rows_data = []
            for row in stree.iter():
                if row.tag.endswith("}row"):
                    row_cells = []
                    for c in row.iter():
                        if c.tag.endswith("}c"):
                            cell_type = c.attrib.get("t", "")
                            val_elem = next((e for e in c if e.tag.endswith("}v")), None)
                            val = ""
                            if val_elem is not None and val_elem.text:
                                raw_v = val_elem.text
                                if cell_type == "s":
                                    try:
                                        idx = int(raw_v)
                                        val = shared_strings[idx] if idx < len(shared_strings) else raw_v
                                    except Exception:
                                        val = raw_v
                                else:
                                    val = raw_v
                            elif cell_type == "inlineStr":
                                is_elem = next((e for e in c if e.tag.endswith("}is")), None)
                                if is_elem is not None:
                                    t_elem = next((e for e in is_elem if e.tag.endswith("}t")), None)
                                    val = t_elem.text if t_elem is not None and t_elem.text else ""
                            row_cells.append(val.strip())
                    if any(row_cells):
                        rows_data.append(row_cells)

            # Convert to CSV format in memory
            output = io.StringIO()
            writer = csv.writer(output)
            for r in rows_data:
                writer.writerow(r)
            return output.getvalue()
    except Exception as e:
        raise ValueError(f"Failed to parse Excel workbook: {e}")


def parse_tabular_or_document(
    raw_content: bytes,
    filename: str,
    category: str = "business_info",
    max_size_bytes: int = 15728640,  # 15MB
) -> Dict[str, Any]:
    """
    Multi-format parser extracting clean markdown, category, and structured tabular items.
    """
    if len(raw_content) > max_size_bytes:
        raise ValueError(
            f"File size ({len(raw_content)} bytes) exceeds maximum limit of {max_size_bytes} bytes."
        )

    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    base_name = os.path.splitext(os.path.basename(filename))[0]
    title = base_name.replace("_", " ").replace("-", " ").strip().title()

    structured_rows: List[Dict[str, Any]] = []

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
                    f"PDF '{filename}' contains no extractable text (it may be a scanned document or image)."
                )
            return {
                "title": title,
                "source_type": "pdf",
                "text": "\n\n".join(pages_text),
                "category": category,
                "structured_rows": [],
            }
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
                for p in tree.iter():
                    if p.tag.endswith("}p"):
                        texts = [elem.text for elem in p.iter() if elem.tag.endswith("}t") and elem.text]
                        if texts:
                            paragraphs.append("".join(texts).strip())

                extracted = "\n\n".join([p for p in paragraphs if p])
                if not extracted.strip():
                    raise ValueError(f"DOCX '{filename}' contains no extractable paragraph text.")
                return {
                    "title": title,
                    "source_type": "docx",
                    "text": extracted,
                    "category": category,
                    "structured_rows": [],
                }
        except ValueError:
            raise
        except Exception as e:
            raise ValueError(f"Failed to extract text from Word document '{filename}': {e}")

    # 3. Excel Spreadsheet (.xlsx)
    elif ext in ("xlsx", "xls"):
        csv_text = parse_xlsx_native(raw_content)
        if not csv_text.strip():
            raise ValueError(f"Excel workbook '{filename}' contains no readable tabular data.")
        md_table, structured_rows = parse_csv_structured(csv_text, category=category)
        return {
            "title": title,
            "source_type": "xlsx",
            "text": md_table or csv_text,
            "category": category,
            "structured_rows": structured_rows,
        }

    # 4. Structured CSV Data (.csv)
    elif ext == "csv":
        try:
            csv_text = raw_content.decode("utf-8")
        except UnicodeDecodeError:
            csv_text = raw_content.decode("latin-1")
        if not csv_text.strip():
            raise ValueError(f"CSV '{filename}' is empty.")
        md_table, structured_rows = parse_csv_structured(csv_text, category=category)
        return {
            "title": title,
            "source_type": "csv",
            "text": md_table or csv_text,
            "category": category,
            "structured_rows": structured_rows,
        }

    # 5. JSON & FAQs
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
                return {
                    "title": title,
                    "source_type": "json",
                    "text": "\n\n".join(paragraphs),
                    "category": category,
                    "structured_rows": data if all(isinstance(x, dict) for x in data) else [],
                }
            elif isinstance(data, dict):
                return {
                    "title": title,
                    "source_type": "json",
                    "text": json.dumps(data, indent=2),
                    "category": category,
                    "structured_rows": [data],
                }
            return {
                "title": title,
                "source_type": "json",
                "text": str(data),
                "category": category,
                "structured_rows": [],
            }
        except Exception as e:
            raise ValueError(f"Malformed JSON document '{filename}': {e}")

    # 6. Markdown & Plain Text
    elif ext in ("md", "markdown", "txt"):
        try:
            text = raw_content.decode("utf-8")
        except UnicodeDecodeError:
            text = raw_content.decode("latin-1")
        if not text.strip():
            raise ValueError(f"Document '{filename}' is empty.")
        return {
            "title": title,
            "source_type": ext,
            "text": text,
            "category": category,
            "structured_rows": [],
        }

    # 7. Default Fallback
    try:
        text = raw_content.decode("utf-8", errors="replace")
        if not text.strip():
            raise ValueError(f"Document '{filename}' contains no readable content.")
        return {
            "title": title,
            "source_type": ext or "txt",
            "text": text,
            "category": category,
            "structured_rows": [],
        }
    except Exception as e:
        raise ValueError(f"Unable to parse document '{filename}': {e}")


def parse_document_content(
    raw_content: bytes,
    filename: str,
    category: str = "business_info",
    max_size_bytes: int = 15728640,  # 15MB
) -> Tuple[str, str, str]:
    """
    Standard backward-compatible document parsing returning (title, source_type, extracted_text).
    """
    res = parse_tabular_or_document(
        raw_content=raw_content,
        filename=filename,
        category=category,
        max_size_bytes=max_size_bytes,
    )
    return res["title"], res["source_type"], res["text"]
