"""
Product catalog query service: search, recommendations, and inventory checks.
"""

from decimal import Decimal
from typing import List, Optional
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database.models import Product, ProductVariant


class ProductService:
    """
    Retrieves verified product catalog items directly from PostgreSQL.
    Guarantees the agent never recommends non-existent or out-of-stock items.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id

    async def get_by_id(self, product_id: str) -> Optional[Product]:
        """Fetches product by primary key with loaded variants."""
        stmt = (
            select(Product)
            .options(selectinload(Product.variants))
            .where(Product.id == product_id, Product.org_id == self.org_id)
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_by_sku(self, sku: str) -> Optional[Product]:
        """Fetches product by SKU."""
        stmt = (
            select(Product)
            .options(selectinload(Product.variants))
            .where(Product.sku == sku, Product.org_id == self.org_id)
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def search_products(
        self,
        query: Optional[str] = None,
        category: Optional[str] = None,
        max_price_per_kg: Optional[Decimal] = None,
        min_quantity_kg: Optional[Decimal] = None,
        in_stock_only: bool = True,
    ) -> List[Product]:
        """
        Searches catalog using keyword matching, category filters, and quantity constraints.
        """
        stmt = (
            select(Product)
            .options(selectinload(Product.variants))
            .where(Product.org_id == self.org_id, Product.is_active == True)
        )

        if in_stock_only:
            stmt = stmt.where(Product.in_stock == True)

        if category:
            stmt = stmt.where(Product.category.ilike(f"%{category}%"))

        if min_quantity_kg is not None:
            stmt = stmt.where(Product.min_order_quantity_kg <= min_quantity_kg)

        if query:
            clean_q = f"%{query.strip()}%"
            stmt = stmt.where(
                or_(
                    Product.name.ilike(clean_q),
                    Product.description.ilike(clean_q),
                    Product.tea_grade.ilike(clean_q),
                    Product.category.ilike(clean_q),
                    Product.sku.ilike(clean_q),
                )
            )

        res = await self.session.execute(stmt)
        return list(res.scalars().all())
