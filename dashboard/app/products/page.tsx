"use client";

import React, { useState, useEffect } from "react";
import {
  Coffee,
  CheckCircle2,
  XCircle,
  Plus,
  Edit2,
  Trash2,
  Search,
  Package,
  Save,
  X,
  AlertCircle,
} from "lucide-react";

interface Variant {
  id: string;
  sku: string;
  name: string;
  packaging_type?: string;
  weight_kg?: number;
  unit_quantity?: number;
  base_price_per_unit?: number;
  base_price_per_kg?: number;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  grade?: string;
  tea_grade?: string;
  origin?: string;
  min_order_quantity?: number;
  min_order_quantity_kg?: number;
  in_stock: boolean;
  variants: Variant[];
}

export default function ProductsCatalogPage() {
  const [products, setProducts] = useState<Product[]>([
    {
      id: "prod_1",
      sku: "PROD-STD-001",
      name: "Standard Commercial Package",
      category: "Commercial",
      description: "Comprehensive standard commercial product tier suited for business operations, reliable recurring supply, and enterprise delivery.",
      grade: "Commercial Grade A",
      tea_grade: "Commercial Grade A",
      origin: "Main Distribution Facility",
      min_order_quantity: 10,
      min_order_quantity_kg: 10,
      in_stock: true,
      variants: [
        { id: "v1", sku: "PROD-STD-V1", name: "Standard Pack (10 Units)", packaging_type: "box", unit_quantity: 10, weight_kg: 10, base_price_per_unit: 350, base_price_per_kg: 350 },
        { id: "v2", sku: "PROD-STD-V2", name: "Master Carton (50 Units)", packaging_type: "carton", unit_quantity: 50, weight_kg: 50, base_price_per_unit: 310, base_price_per_kg: 310 },
      ],
    },
    {
      id: "prod_2",
      sku: "PROD-PREM-002",
      name: "Premium Commercial Package",
      category: "Premium",
      description: "High-grade commercial selection with enhanced specifications, strict quality assurance, and priority fulfillment dispatch.",
      grade: "Enterprise Select",
      tea_grade: "Enterprise Select",
      origin: "Primary Facility",
      min_order_quantity: 5,
      min_order_quantity_kg: 5,
      in_stock: true,
      variants: [
        { id: "v3", sku: "PROD-PREM-V1", name: "Premium Unit (5 Units)", packaging_type: "box", unit_quantity: 5, weight_kg: 5, base_price_per_unit: 850, base_price_per_kg: 850 },
        { id: "v4", sku: "PROD-PREM-V2", name: "Bulk Premium Crate (25 Units)", packaging_type: "crate", unit_quantity: 25, weight_kg: 25, base_price_per_unit: 780, base_price_per_kg: 780 },
      ],
    },
    {
      id: "prod_3",
      sku: "PROD-ENT-003",
      name: "Enterprise Bulk Package",
      category: "Enterprise",
      description: "High-volume wholesale supply tier engineered for large institutional accounts, custom service terms, and distributor operations.",
      grade: "Industrial Grade 1",
      tea_grade: "Industrial Grade 1",
      origin: "Regional Logistics Hub",
      min_order_quantity: 25,
      min_order_quantity_kg: 25,
      in_stock: true,
      variants: [
        { id: "v5", sku: "PROD-ENT-V1", name: "Master Bulk Pack (25 Units)", packaging_type: "pallet", unit_quantity: 25, weight_kg: 25, base_price_per_unit: 260, base_price_per_kg: 260 },
        { id: "v6", sku: "PROD-ENT-V2", name: "Direct Freight Consignment (100 Units)", packaging_type: "container", unit_quantity: 100, weight_kg: 100, base_price_per_unit: 230, base_price_per_kg: 230 },
      ],
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states for Add Product
  const [newProd, setNewProd] = useState({
    name: "",
    category: "Commercial",
    tea_grade: "Commercial Grade A",
    origin: "Main Facility",
    description: "",
    min_order_quantity_kg: 10,
    base_price_per_kg: 350,
    weight_kg: 10,
    packaging_type: "box",
    in_stock: true,
  });

  // Load live products from backend
  const loadProducts = () => {
    fetch("/api/v1/products")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) setProducts(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // 1-Click Stock Toggle
  const handleToggleStock = async (product: Product) => {
    const nextStock = !product.in_stock;
    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, in_stock: nextStock } : p))
    );

    try {
      await fetch(`/api/v1/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_stock: nextStock }),
      });
    } catch (e) {
      console.error("Failed to update stock status", e);
      loadProducts();
    }
  };

  // Add New Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProd),
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewProd({
          name: "",
          category: "Assam CTC",
          tea_grade: "BP",
          origin: "North Bengal, India",
          description: "",
          min_order_quantity_kg: 20,
          base_price_per_kg: 340,
          weight_kg: 20,
          packaging_type: "sack",
          in_stock: true,
        });
        loadProducts();
      }
    } catch (e) {
      console.error("Error creating product", e);
    }
  };

  // Save Edited Product
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const res = await fetch(`/api/v1/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingProduct.name,
          category: editingProduct.category,
          tea_grade: editingProduct.tea_grade,
          origin: editingProduct.origin,
          description: editingProduct.description,
          min_order_quantity_kg: editingProduct.min_order_quantity_kg,
          base_price_per_kg: editingProduct.variants?.[0]?.base_price_per_kg || 300,
        }),
      });
      if (res.ok) {
        setEditingProduct(null);
        loadProducts();
      }
    } catch (e) {
      console.error("Error updating product", e);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to remove this product from the catalog?")) return;
    try {
      const res = await fetch(`/api/v1/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (e) {
      console.error("Error deleting product", e);
    }
  };

  const filtered = products.filter((p) => {
    const gradeStr = p.grade || p.tea_grade || "";
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gradeStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "ALL" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--ed-text-primary)]">
            Products & Services Catalog
          </h2>
          <p className="text-sm text-[var(--ed-text-muted)] mt-1">
            Industry-agnostic catalog management, 1-click in-stock toggling, pricing variants, and Minimum Order Quantities (MOQ).
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="ed-interactive ed-press ed-focus-ring inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-lg transition-all hover:opacity-90"
          style={{ background: "var(--ed-accent)", minHeight: "44px" }}
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between ed-panel p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--ed-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products, specifications, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] placeholder:text-[var(--ed-text-muted)] focus:outline-none ed-focus-ring"
            style={{ background: "var(--ed-bg)" }}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {["ALL", "Commercial", "Premium", "Enterprise", "Hospitality", "Custom"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`ed-press ed-focus-ring px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "text-white shadow-sm"
                  : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] border border-[var(--ed-border)]"
              }`}
              style={
                selectedCategory === cat
                  ? { background: "var(--ed-accent)" }
                  : { background: "var(--ed-bg)" }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((p) => (
          <div
            key={p.id}
            className={`p-5 rounded-xl border flex flex-col justify-between transition-all duration-200 ed-panel ${
              p.in_stock ? "" : "opacity-80"
            }`}
            style={!p.in_stock ? { background: "var(--ed-bg)" } : {}}
          >
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold text-[var(--ed-accent)] border border-[var(--ed-accent)]/20"
                  style={{ background: "color-mix(in srgb, var(--ed-accent) 10%, transparent)" }}
                >
                  {p.category}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[var(--ed-text-muted)]">
                    {p.grade || p.tea_grade || "Standard"}
                  </span>
                  <button
                    onClick={() => setEditingProduct(p)}
                    title="Edit Product"
                    className="ed-press ed-focus-ring p-1.5 rounded-md text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] hover:bg-[var(--ed-bg)] transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p.id)}
                    title="Delete Product"
                    className="ed-press ed-focus-ring p-1.5 rounded-md text-[var(--ed-text-muted)] hover:text-[var(--ed-danger)] hover:bg-[var(--ed-bg)] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-base text-[var(--ed-text-primary)] mt-3">{p.name}</h3>
              <div className="text-xs text-[var(--ed-text-muted)] font-data mt-0.5">
                SKU: {p.sku} • {p.origin || "Main Warehouse"}
              </div>
              <p className="text-xs text-[var(--ed-text-muted)] mt-3 leading-relaxed">
                {p.description}
              </p>

              {/* Packaging Variants & Rates */}
              <div className="mt-4 pt-4 border-t border-[var(--ed-border)]">
                <div className="text-[11px] font-semibold text-[var(--ed-text-muted)] uppercase tracking-wider mb-2">
                  Variants & Base Rates
                </div>
                <div className="space-y-1.5">
                  {p.variants && p.variants.length > 0 ? (
                    p.variants.map((v) => {
                      const price = v.base_price_per_unit ?? v.base_price_per_kg ?? 0;
                      const qty = v.unit_quantity ?? v.weight_kg ?? 1;
                      return (
                        <div
                          key={v.id}
                          className="flex justify-between items-center text-xs p-2 rounded border border-[var(--ed-border)] text-[var(--ed-text-primary)]"
                          style={{ background: "var(--ed-bg)" }}
                        >
                          <span className="font-medium">
                            {v.name} (<span className="font-data">{qty} units</span>)
                          </span>
                          <span className="font-bold font-data text-[var(--ed-text-primary)]">
                            ₹{price}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-[var(--ed-text-muted)] italic">No variants defined</div>
                  )}
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="mt-5 pt-4 border-t border-[var(--ed-border)] flex items-center justify-between">
              <span className="text-xs text-[var(--ed-text-muted)] font-semibold">
                MOQ: <span className="font-data font-bold text-[var(--ed-text-primary)]">{p.min_order_quantity ?? p.min_order_quantity_kg ?? 1} units</span>
              </span>
              <button
                onClick={() => handleToggleStock(p)}
                className={`ed-press ed-focus-ring px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                  p.in_stock
                    ? "text-[var(--ed-success)] border-[var(--ed-success)]/20"
                    : "text-[var(--ed-danger)] border-[var(--ed-danger)]/20"
                }`}
                style={{
                  background: p.in_stock
                    ? "color-mix(in srgb, var(--ed-success) 10%, transparent)"
                    : "color-mix(in srgb, var(--ed-danger) 10%, transparent)",
                }}
              >
                {p.in_stock ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ed-success)]" /> In Stock
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-[var(--ed-danger)]" /> Sold Out
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ADD NEW PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-[var(--ed-border)] shadow-2xl max-w-lg w-full p-6 space-y-4" style={{ background: "var(--ed-surface)" }}>
            <div className="flex items-center justify-between border-b border-[var(--ed-border)] pb-3">
              <h3 className="font-bold text-base text-[var(--ed-text-primary)] flex items-center gap-2">
                <Package className="w-5 h-5 text-[var(--ed-accent)]" />
                Add Product to Catalog
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="ed-press p-1 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Product / Service Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enterprise Cloud Suite / Standard Unit"
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] placeholder:text-[var(--ed-text-muted)] focus:outline-none ed-focus-ring"
                    style={{ background: "var(--ed-bg)" }}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Category
                  </label>
                  <select
                    value={newProd.category}
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] focus:outline-none ed-focus-ring"
                    style={{ background: "var(--ed-bg)" }}
                  >
                    <option value="Commercial">Commercial</option>
                    <option value="Premium">Premium</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Services">Services</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Grade / Specification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Grade A / Standard / Tier 1"
                    value={newProd.tea_grade}
                    onChange={(e) => setNewProd({ ...newProd, tea_grade: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] placeholder:text-[var(--ed-text-muted)] focus:outline-none ed-focus-ring"
                    style={{ background: "var(--ed-bg)" }}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Base Rate (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newProd.base_price_per_kg}
                    onChange={(e) => setNewProd({ ...newProd, base_price_per_kg: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-data font-bold focus:outline-none ed-focus-ring"
                    style={{ background: "var(--ed-bg)" }}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    MOQ (Units)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newProd.min_order_quantity_kg}
                    onChange={(e) => setNewProd({ ...newProd, min_order_quantity_kg: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-data focus:outline-none ed-focus-ring"
                    style={{ background: "var(--ed-bg)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                  Product / Service Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe specifications, key features, packaging format, recommended usage..."
                  value={newProd.description}
                  onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] placeholder:text-[var(--ed-text-muted)] focus:outline-none ed-focus-ring"
                  style={{ background: "var(--ed-bg)" }}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProd.in_stock}
                    onChange={(e) => setNewProd({ ...newProd, in_stock: e.target.checked })}
                    className="w-4 h-4 rounded accent-[var(--ed-accent)] ed-focus-ring"
                  />
                  <span className="font-semibold text-[var(--ed-text-primary)]">
                    Immediately Available In Stock
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="ed-press ed-focus-ring px-4 py-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] text-xs font-medium hover:bg-[var(--ed-bg)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ed-btn-primary ed-press ed-focus-ring px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    Save Product
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-[var(--ed-border)] shadow-2xl max-w-md w-full p-6 space-y-4" style={{ background: "var(--ed-surface)" }}>
            <div className="flex items-center justify-between border-b border-[var(--ed-border)] pb-3">
              <h3 className="font-bold text-base text-[var(--ed-text-primary)]">
                Edit Product: {editingProduct.name}
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="ed-press p-1 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] focus:outline-none ed-focus-ring"
                  style={{ background: "var(--ed-bg)" }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Grade / Specification
                  </label>
                  <input
                    type="text"
                    value={editingProduct.tea_grade || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, tea_grade: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] focus:outline-none ed-focus-ring"
                    style={{ background: "var(--ed-bg)" }}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    MOQ (Units)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.min_order_quantity_kg}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        min_order_quantity_kg: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-data focus:outline-none ed-focus-ring"
                    style={{ background: "var(--ed-bg)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] focus:outline-none ed-focus-ring"
                  style={{ background: "var(--ed-bg)" }}
                />
              </div>

              <div className="flex justify-end items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="ed-press ed-focus-ring px-4 py-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] text-xs font-medium hover:bg-[var(--ed-bg)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ed-interactive ed-press ed-focus-ring inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-lg transition-all hover:opacity-90"
                  style={{ background: "var(--ed-accent)", minHeight: "44px" }}
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
