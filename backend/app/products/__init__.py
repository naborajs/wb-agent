"""
Products module: catalog service and catalog seed specifications.
"""

from app.products.catalog import DEMO_PRODUCTS
from app.products.service import ProductService

__all__ = ["DEMO_PRODUCTS", "ProductService"]
