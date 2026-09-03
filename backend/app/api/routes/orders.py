"""
Orders API: Endpoints to manage wholesale commercial tea orders directly from the dashboard.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database.models import Customer, Order, OrderItem
from app.database.session import get_db
from app.utils.logging import logger
from app.whatsapp.service import WhatsAppService

router = APIRouter(prefix="/orders", tags=["Orders"])


class OrderItemInput(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    product_name: str
    tea_grade: Optional[str] = "BP"
    packaging_type: str = "Jute Bag"
    quantity_kg: float = Field(..., gt=0)
    unit_price_per_kg: float = Field(..., gt=0)
    discount_pct: float = Field(0.0, ge=0, le=100)


class OrderCreateInput(BaseModel):
    customer_id: str
    conversation_id: Optional[str] = None
    shipping_name: Optional[str] = None
    shipping_phone: Optional[str] = None
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    shipping_postal_code: Optional[str] = None
    payment_terms: str = "Standard Wholesale (100% on Dispatch)"
    notes: Optional[str] = None
    items: List[OrderItemInput]


class OrderUpdateInput(BaseModel):
    status: Optional[str] = None  # confirmed, invoiced, dispatched, completed, cancelled
    payment_status: Optional[str] = None  # pending, advance_paid, fully_paid
    notes: Optional[str] = None


@router.get("")
async def list_orders(
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
):
    """
    Lists commercial tea orders with line items and customer details.
    """
    stmt = (
        select(Order)
        .where(Order.org_id == settings.DEFAULT_ORG_ID)
        .options(selectinload(Order.items), selectinload(Order.customer))
        .order_by(desc(Order.created_at))
        .limit(limit)
    )
    if status:
        stmt = stmt.where(Order.status == status)

    orders = (await session.execute(stmt)).scalars().all()
    results = []
    for o in orders:
        results.append({
            "id": o.id,
            "order_number": o.order_number,
            "customer_id": o.customer_id,
            "customer_name": o.customer.name if o.customer else o.shipping_name,
            "customer_company": o.customer.company_name if o.customer else None,
            "customer_phone": o.customer.primary_phone if o.customer else o.shipping_phone,
            "status": o.status,
            "total_amount": float(o.total_amount),
            "discount_amount": float(o.discount_amount),
            "currency": o.currency,
            "shipping_city": o.shipping_city,
            "shipping_address": o.shipping_address,
            "payment_status": o.payment_status,
            "payment_terms": o.payment_terms,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "items_count": len(o.items),
            "items": [
                {
                    "product_name": item.product_name,
                    "tea_grade": item.tea_grade,
                    "quantity_kg": float(item.quantity_kg),
                    "unit_price_per_kg": float(item.unit_price_per_kg),
                    "subtotal": float(item.subtotal),
                    "packaging_type": item.packaging_type,
                }
                for item in o.items
            ],
        })
    return {"total": len(results), "orders": results}


@router.post("")
async def create_order(
    payload: OrderCreateInput,
    session: AsyncSession = Depends(get_db),
):
    """
    Creates a new wholesale order from the dashboard and alerts the business owner.
    """
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must include at least one item.")

    customer = await session.get(Customer, payload.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    # Generate Order Number
    import random
    from datetime import datetime
    order_num = f"NBT-{datetime.utcnow().strftime('%y%m%d')}-{random.randint(100, 999)}"

    # Calculate item totals
    total_amount = 0.0
    total_discount = 0.0
    order_items = []

    for item in payload.items:
        raw_subtotal = item.quantity_kg * item.unit_price_per_kg
        discount = raw_subtotal * (item.discount_pct / 100.0)
        final_subtotal = raw_subtotal - discount
        total_amount += final_subtotal
        total_discount += discount

        order_item = OrderItem(
            product_id=item.product_id,
            variant_id=item.variant_id,
            product_name=item.product_name,
            tea_grade=item.tea_grade,
            packaging_type=item.packaging_type,
            quantity_kg=item.quantity_kg,
            unit_price_per_kg=item.unit_price_per_kg,
            discount_pct=item.discount_pct,
            subtotal=final_subtotal,
        )
        order_items.append(order_item)

    order = Order(
        org_id=settings.DEFAULT_ORG_ID,
        order_number=order_num,
        customer_id=customer.id,
        conversation_id=payload.conversation_id,
        status="confirmed",
        total_amount=total_amount,
        discount_amount=total_discount,
        currency="INR",
        shipping_name=payload.shipping_name or customer.name,
        shipping_phone=payload.shipping_phone or customer.primary_phone,
        shipping_address=payload.shipping_address or customer.city,
        shipping_city=payload.shipping_city or customer.city,
        shipping_state=payload.shipping_state or customer.state,
        shipping_postal_code=payload.shipping_postal_code,
        payment_status="pending",
        payment_terms=payload.payment_terms,
        notes=payload.notes,
        items=order_items,
    )
    session.add(order)
    await session.commit()
    await session.refresh(order)

    # WhatsApp Alert to Business Owner (+91 89006 53250)
    owner_phone = settings.OWNER_WHATSAPP_NUMBER or "+918900653250"
    alert_msg = (
        f"📦 *NEW WHOLESALE ORDER CREATED!*\n\n"
        f"• *Order #:* {order.order_number}\n"
        f"• *Customer:* {order.shipping_name} ({customer.company_name or 'Business'})\n"
        f"• *Phone:* {order.shipping_phone}\n"
        f"• *Destination:* {order.shipping_city or 'India'}\n"
        f"• *Total Value:* ₹{order.total_amount:,.2f}\n"
        f"• *Terms:* {order.payment_terms}\n\n"
        f"👉 View and manage at Dashboard /orders"
    )
    try:
        wa = WhatsAppService.get_provider()
        await wa.send_message(to_phone=owner_phone, text=alert_msg)
    except Exception as e:
        logger.error(f"Failed to alert owner on order creation: {e}")

    return {
        "status": "created",
        "order_id": order.id,
        "order_number": order.order_number,
        "total_amount": float(order.total_amount),
    }


@router.patch("/{order_id}")
async def update_order(
    order_id: str,
    payload: OrderUpdateInput,
    session: AsyncSession = Depends(get_db),
):
    """
    Updates status or payment status of an order.
    """
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    if payload.status:
        order.status = payload.status
    if payload.payment_status:
        order.payment_status = payload.payment_status
    if payload.notes:
        order.notes = payload.notes

    await session.commit()
    return {"status": "updated", "order_id": order.id, "order_status": order.status}
