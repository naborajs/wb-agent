"""
Invoices & Commercial Quotes API Routes (Milestone 1, Requirement R1).
Provides endpoints for deterministic vector PDF pro-forma invoice compilation,
file downloads, and WhatsApp dispatch.
"""

from decimal import Decimal
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database.models import Customer, Quote, QuoteItem
from app.database.session import get_db
from app.services.invoice_generator import InvoiceGenerator
from app.whatsapp.service import WhatsAppService

router = APIRouter(prefix="/invoices", tags=["Invoices"])


class InvoiceItemInput(BaseModel):
    product_name: str
    tea_grade: Optional[str] = None
    packaging_type: Optional[str] = None
    quantity_kg: float = Field(..., gt=0)
    unit_price: Optional[float] = None
    discount_pct: Optional[float] = None


class GenerateInvoiceRequest(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    company_name: Optional[str] = None
    delivery_city: Optional[str] = None
    delivery_state: Optional[str] = "West Bengal"
    delivery_address: Optional[str] = None
    buyer_gstin: Optional[str] = None
    items: List[InvoiceItemInput] = []
    notes: Optional[str] = None


@router.post("/generate")
async def generate_proforma_invoice(
    req: GenerateInvoiceRequest,
):
    """
    Compiles a North Bengal Tea Co. branded pro-forma invoice PDF deterministically.
    """
    order_data: Dict[str, Any] = {
        "buyer_name": req.customer_name or "Commercial Buyer",
        "buyer_phone": req.customer_phone or "+91 98000 00000",
        "buyer_company": req.company_name or "Commercial Partner",
        "delivery_city": req.delivery_city or "Siliguri",
        "delivery_state": req.delivery_state or "West Bengal",
        "delivery_address": req.delivery_address,
        "buyer_gstin": req.buyer_gstin,
        "items": [item.model_dump() for item in req.items],
        "notes": req.notes,
    }

    pdf_path = InvoiceGenerator.generate_proforma_pdf(order_data)
    filename = Path(pdf_path).name

    return {
        "success": True,
        "filename": filename,
        "file_path": pdf_path,
        "download_url": f"{settings.API_URL}{settings.API_V1_STR}/invoices/download?file={filename}",
    }


@router.get("/download")
async def download_invoice(
    file: str = Query(..., description="Invoice PDF filename"),
):
    """Serves the generated PDF file."""
    # Sanitize filename to prevent directory traversal
    clean_filename = Path(file).name
    target_path = Path(settings.STORAGE_BASE_PATH) / "exports" / "invoices" / clean_filename

    if not target_path.exists():
        raise HTTPException(status_code=404, detail="Invoice PDF file not found")

    return FileResponse(
        path=str(target_path),
        media_type="application/pdf",
        filename=clean_filename,
    )


@router.post("/quotes/{quote_id}/pdf")
async def generate_quote_pdf(
    quote_id: str,
    session: AsyncSession = Depends(get_db),
):
    """
    Compiles a commercial pro-forma invoice PDF from an existing Quote database record.
    """
    stmt = (
        select(Quote)
        .options(selectinload(Quote.items), selectinload(Quote.customer))
        .where(Quote.id == quote_id)
    )
    res = await session.execute(stmt)
    quote = res.scalar_one_or_none()

    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    customer = quote.customer
    items_data = [
        {
            "product_name": itm.product_name,
            "quantity_kg": float(itm.quantity),
            "unit_price": float(itm.unit_price),
            "discount_pct": float(itm.discount_pct),
            "subtotal": float(itm.subtotal),
        }
        for itm in quote.items
    ]

    order_data = {
        "invoice_number": quote.quote_number,
        "buyer_name": customer.name if customer else "Commercial Buyer",
        "buyer_phone": customer.primary_phone if customer else "+91 98000 00000",
        "buyer_company": customer.company_name if customer else "Commercial Partner",
        "delivery_city": customer.city if customer else "Siliguri",
        "delivery_state": customer.state if customer else "West Bengal",
        "issue_date": quote.created_at.strftime("%d-%b-%Y") if quote.created_at else None,
        "valid_until": quote.valid_until.strftime("%d-%b-%Y") if quote.valid_until else None,
        "items": items_data,
        "notes": quote.notes,
    }

    pdf_path = InvoiceGenerator.generate_proforma_pdf(order_data)
    filename = Path(pdf_path).name

    return {
        "success": True,
        "quote_id": quote.id,
        "quote_number": quote.quote_number,
        "filename": filename,
        "file_path": pdf_path,
        "download_url": f"{settings.API_URL}{settings.API_V1_STR}/invoices/download?file={filename}",
    }


@router.post("/quotes/{quote_id}/send-whatsapp")
async def send_quote_via_whatsapp(
    quote_id: str,
    phone_number: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """
    Generates and dispatches the pro-forma invoice PDF via WhatsApp.
    """
    stmt = (
        select(Quote)
        .options(selectinload(Quote.items), selectinload(Quote.customer))
        .where(Quote.id == quote_id)
    )
    res = await session.execute(stmt)
    quote = res.scalar_one_or_none()

    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    customer = quote.customer
    target_phone = phone_number or (customer.primary_phone if customer else None)
    if not target_phone:
        raise HTTPException(status_code=400, detail="Target WhatsApp phone number required")

    # Generate PDF first
    items_data = [
        {
            "product_name": itm.product_name,
            "quantity_kg": float(itm.quantity),
            "unit_price": float(itm.unit_price),
            "discount_pct": float(itm.discount_pct),
        }
        for itm in quote.items
    ]
    order_data = {
        "invoice_number": quote.quote_number,
        "buyer_name": customer.name if customer else "Valued Client",
        "buyer_phone": target_phone,
        "buyer_company": customer.company_name if customer else "Enterprise",
        "delivery_city": customer.city if customer else "Siliguri",
        "delivery_state": customer.state if customer else "West Bengal",
        "items": items_data,
    }
    pdf_path = InvoiceGenerator.generate_proforma_pdf(order_data)
    filename = Path(pdf_path).name

    wa = WhatsAppService.get_provider()
    caption = (
        f"📄 *North Bengal Tea Co. - Commercial Pro-Forma Invoice*\n"
        f"Quote No: *{quote.quote_number}*\n"
        f"Rate locked for 7 days. Please review itemized pricing and payment details."
    )
    result = await wa.send_document(
        to_phone=target_phone,
        file_path=pdf_path,
        caption=caption,
        filename=filename,
    )

    if result.success:
        quote.status = "sent"
        await session.commit()

    return {
        "success": result.success,
        "provider_message_id": result.provider_message_id,
        "error_message": result.error_message,
        "quote_number": quote.quote_number,
        "recipient": target_phone,
        "file_path": pdf_path,
    }
