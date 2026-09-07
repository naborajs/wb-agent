"""
Product catalog, packaging variants, and deterministic pricing rule models.
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base, OrgScopedMixin, TimestampMixin, UniversalJSON, generate_uuid


class Product(Base, OrgScopedMixin, TimestampMixin):
    """
    Catalog item representing an industry-agnostic commercial product or service offering.
    """
    __tablename__ = "products"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    sku = Column(String(64), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(128), nullable=False, index=True)  # General product/service category classification
    description = Column(Text, nullable=True)
    grade = Column(String(64), nullable=True)  # Tier, grade, material, or quality specification
    origin = Column(String(128), nullable=True)
    harvest_season = Column(String(64), nullable=True)  # Optional season, batch, or release
    min_order_quantity = Column(Numeric(10, 2), default=1.0, nullable=False)
    in_stock = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    attributes = Column(UniversalJSON, default=dict, nullable=False)

    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")
    pricing_rules = relationship("PricingRule", back_populates="product")

    # Backward compatibility aliases for legacy references
    @property
    def tea_grade(self):
        return self.grade

    @tea_grade.setter
    def tea_grade(self, value):
        self.grade = value

    @property
    def min_order_quantity_kg(self):
        return self.min_order_quantity

    @min_order_quantity_kg.setter
    def min_order_quantity_kg(self, value):
        self.min_order_quantity = value

    __table_args__ = (
        Index("ix_products_org_sku", "org_id", "sku", unique=True),
    )


class ProductVariant(Base, TimestampMixin):
    """
    Specific packaging and unit variant of a product (e.g., unit, pack, case, carton).
    """
    __tablename__ = "product_variants"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    product_id = Column(String(64), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(64), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    packaging_type = Column(String(64), default="standard", nullable=False)  # standard, box, pack, carton, case, unit
    unit_quantity = Column(Numeric(10, 2), default=1.0, nullable=False)
    base_price_per_unit = Column(Numeric(10, 2), nullable=False)
    in_stock = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    product = relationship("Product", back_populates="variants")

    # Backward compatibility aliases
    @property
    def weight_kg(self):
        return self.unit_quantity

    @weight_kg.setter
    def weight_kg(self, value):
        self.unit_quantity = value

    @property
    def base_price_per_kg(self):
        return self.base_price_per_unit

    @base_price_per_kg.setter
    def base_price_per_kg(self, value):
        self.base_price_per_unit = value


class PricingRule(Base, OrgScopedMixin, TimestampMixin):
    """
    Configurable deterministic pricing, discount, and spreadsheet-style business rules.
    Enforces strict discount authority limits.
    """
    __tablename__ = "pricing_rules"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    product_id = Column(String(64), ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True)
    rule_name = Column(String(128), nullable=False)
    rule_type = Column(String(64), nullable=False)  # volume_tier, customer_segment, promotional, payment_terms, custom_matrix
    min_quantity = Column(Numeric(10, 2), default=0.0, nullable=False)
    max_quantity = Column(Numeric(10, 2), nullable=True)
    discount_percentage = Column(Numeric(5, 2), default=0.0, nullable=False)
    fixed_price = Column(Numeric(10, 2), nullable=True)
    customer_segment = Column(String(64), nullable=True)  # wholesale, retail, enterprise, distributor, smb
    min_margin_percentage = Column(Numeric(5, 2), default=15.0, nullable=False)
    
    # Authority boundaries
    requires_human_approval = Column(Boolean, default=False, nullable=False)
    max_autonomous_discount_percentage = Column(Numeric(5, 2), default=5.0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    rule_metadata = Column(UniversalJSON, default=dict, nullable=False)  # Arbitrary spreadsheet columns, formulas, conditions

    product = relationship("Product", back_populates="pricing_rules")

    # Backward compatibility aliases
    @property
    def min_quantity_kg(self):
        return self.min_quantity

    @min_quantity_kg.setter
    def min_quantity_kg(self, value):
        self.min_quantity = value

    @property
    def max_quantity_kg(self):
        return self.max_quantity

    @max_quantity_kg.setter
    def max_quantity_kg(self, value):
        self.max_quantity = value

    @property
    def fixed_price_per_kg(self):
        return self.fixed_price

    @fixed_price_per_kg.setter
    def fixed_price_per_kg(self, value):
        self.fixed_price = value


class ProductCustomField(Base, OrgScopedMixin, TimestampMixin):
    """
    Industry-agnostic extensible custom attribute definition (Sections 38 & 39).
    Enables storing custom specs (e.g., material, dimensions, certifications, origin).
    """
    __tablename__ = "product_custom_fields"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    product_id = Column(String(64), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name = Column(String(64), nullable=False)
    field_type = Column(String(32), default="text", nullable=False)  # text, number, boolean, select
    field_value = Column(Text, nullable=True)
    is_required = Column(Boolean, default=False, nullable=False)

    product = relationship("Product", backref="custom_fields")


class PricingRuleVersion(Base, OrgScopedMixin, TimestampMixin):
    """
    Audit and version history for deterministic pricing rules (Section 40 & 41).
    """
    __tablename__ = "pricing_rule_versions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    rule_id = Column(String(64), ForeignKey("pricing_rules.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, default=1, nullable=False)
    rule_name = Column(String(128), nullable=False)
    rule_type = Column(String(64), nullable=False)
    discount_percentage = Column(Numeric(5, 2), nullable=False)
    changed_by = Column(String(128), default="system", nullable=False)
    change_reason = Column(String(255), nullable=True)
    snapshot = Column(UniversalJSON, default=dict, nullable=False)


class Inventory(Base, OrgScopedMixin, TimestampMixin):
    """
    Stock tracking across warehouses and batches (Section 76).
    """
    __tablename__ = "inventory"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    product_id = Column(String(64), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    variant_id = Column(String(64), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=True, index=True)
    quantity_on_hand = Column(Numeric(12, 2), default=0.0, nullable=False)
    reserved_quantity = Column(Numeric(12, 2), default=0.0, nullable=False)
    warehouse_location = Column(String(128), default="Main Warehouse", nullable=False)
    last_counted_at = Column(DateTime(timezone=True), nullable=True)

    product = relationship("Product")
    variant = relationship("ProductVariant")

