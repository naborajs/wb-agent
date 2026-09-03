"""
Domain models for Wholesale Orders and Order Line Items (Sections 85, 154).
Supports order creation directly from the dashboard or AI sales close.
"""

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base, OrgScopedMixin, TimestampMixin, UniversalJSON, generate_uuid


class Order(Base, OrgScopedMixin, TimestampMixin):
    """
    Wholesale commercial tea order generated through dashboard or sales conversion.
    """
    __tablename__ = "orders"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    order_number = Column(String(64), nullable=False, index=True)
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True)
    
    status = Column(String(32), default="confirmed", nullable=False, index=True)  # draft, confirmed, invoiced, dispatched, completed, cancelled
    total_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    currency = Column(String(8), default="INR", nullable=False)
    
    # Shipping & Fulfillment
    shipping_name = Column(String(255), nullable=True)
    shipping_phone = Column(String(32), nullable=True)
    shipping_address = Column(Text, nullable=True)
    shipping_city = Column(String(128), nullable=True)
    shipping_state = Column(String(128), nullable=True)
    shipping_postal_code = Column(String(32), nullable=True)
    
    payment_status = Column(String(32), default="pending", nullable=False)  # pending, advance_paid, fully_paid
    payment_terms = Column(String(128), default="Standard Wholesale (100% on Dispatch)", nullable=False)
    notes = Column(Text, nullable=True)
    extra_metadata = Column(UniversalJSON, default=dict, nullable=False)

    customer = relationship("Customer", backref="orders")
    conversation = relationship("Conversation", backref="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_orders_org_status", "org_id", "status"),
    )


class OrderItem(Base, TimestampMixin):
    """
    Line item belonging to a wholesale commercial tea order.
    """
    __tablename__ = "order_items"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    order_id = Column(String(64), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(String(64), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    variant_id = Column(String(64), ForeignKey("product_variants.id", ondelete="SET NULL"), nullable=True)
    
    product_name = Column(String(255), nullable=False)
    tea_grade = Column(String(64), nullable=True)
    packaging_type = Column(String(64), default="Jute Bag", nullable=False)
    quantity_kg = Column(Numeric(10, 2), nullable=False)
    unit_price_per_kg = Column(Numeric(10, 2), nullable=False)
    discount_pct = Column(Float, default=0.0, nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
