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
  packaging_type: string;
  weight_kg: number;
  base_price_per_kg: number;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  tea_grade: string;
  origin: string;
  min_order_quantity_kg: number;
  in_stock: boolean;
  variants: Variant[];
}

export default function ProductsCatalogPage() {
  const [products, setProducts] = useState<Product[]>([
    {
      id: "prod_1",
      sku: "NBT-DARJ-FF",
      name: "Darjeeling Spring First Flush Special",
      category: "Darjeeling",
      description: "Hand-plucked high-altitude first flush from Kurseong & Mirik estates. Delicate floral aroma with crisp muscatel notes.",
      tea_grade: "FTGFOP1",
      origin: "Darjeeling, West Bengal",
      min_order_quantity_kg: 10,
      in_stock: true,
      variants: [
        { id: "v1", sku: "NBT-DARJ-FF-5KG", name: "5kg Foil Bag", packaging_type: "foil_bag", weight_kg: 5, base_price_per_kg: 1600 },
        { id: "v2", sku: "NBT-DARJ-FF-20KG", name: "20kg Wooden Chest", packaging_type: "chest", weight_kg: 20, base_price_per_kg: 1450 },
      ],
    },
    {
      id: "prod_2",
      sku: "NBT-ASSAM-CTC",
      name: "Assam Kadak CTC Granules",
      category: "Assam CTC",
      description: "Extra strong, malty CTC tea granules from Upper Assam. Thick, brisk liquor with high milk tolerance.",
      tea_grade: "BP",
      origin: "Upper Assam",
      min_order_quantity_kg: 25,
      in_stock: true,
      variants: [
        { id: "v3", sku: "NBT-ASSAM-CTC-10KG", name: "10kg Commercial Sack", packaging_type: "sack", weight_kg: 10, base_price_per_kg: 380 },
        { id: "v4", sku: "NBT-ASSAM-CTC-30KG", name: "30kg Master Bag", packaging_type: "sack", weight_kg: 30, base_price_per_kg: 340 },
      ],
    },
    {
      id: "prod_3",
      sku: "NBT-DOOARS-HB",
      name: "Dooars Terai Hotel Master Blend",
      category: "Dooars",
      description: "Specially formulated blend engineered for maximum cuppage and fast liquor release for commercial hospitality.",
      tea_grade: "BOP / OF",
      origin: "Dooars & Terai, West Bengal",
      min_order_quantity_kg: 20,
      in_stock: true,
      variants: [
        { id: "v5", sku: "NBT-DOOARS-HB-20KG", name: "20kg Poly Sack", packaging_type: "sack", weight_kg: 20, base_price_per_kg: 260 },
        { id: "v6", sku: "NBT-DOOARS-HB-50KG", name: "50kg Bulk Jute Sack", packaging_type: "sack", weight_kg: 50, base_price_per_kg: 230 },
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
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tea_grade?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
            Wholesale Catalog & Stock Management
          </h2>
          <p className="text-sm text-[var(--ed-text-muted)] mt-1">
            Live catalog customization, 1-click in-stock toggling, pricing variants, and Minimum Order Quantities (MOQ).
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="ed-interactive ed-press ed-focus-ring inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-lg transition-all hover:opacity-90"
          style={{ background: "var(--ed-accent)", minHeight: "44px" }}
        >
          <Plus className="w-4 h-4" />
          Add New Tea
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between ed-panel p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--ed-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search teas, grades, origins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] placeholder:text-[var(--ed-text-muted)] focus:outline-none ed-focus-ring"
            style={{ background: "var(--ed-bg)" }}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {["ALL", "Darjeeling", "Assam CTC", "Dooars", "Green Tea"].map((cat) => (
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
                    Grade: {p.tea_grade || "Estate"}
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
                SKU: {p.sku} • {p.origin}
              </div>
              <p className="text-xs text-[var(--ed-text-muted)] mt-3 leading-relaxed">
                {p.description}
              </p>

              {/* Packaging Variants & Rates */}
              <div className="mt-4 pt-4 border-t border-[var(--ed-border)]">
                <div className="text-[11px] font-semibold text-[var(--ed-text-muted)] uppercase tracking-wider mb-2">
                  Packaging & Base Rates
                </div>
                <div className="space-y-1.5">
                  {p.variants && p.variants.length > 0 ? (
                    p.variants.map((v) => (
                      <div
                        key={v.id}
                        className="flex justify-between items-center text-xs p-2 rounded border border-[var(--ed-border)] text-[var(--ed-text-primary)]"
                        style={{ background: "var(--ed-bg)" }}
                      >
                        <span className="font-medium">
                          {v.name} (<span className="font-data">{v.weight_kg}kg</span>)
                        </span>
                        <span className="font-bold font-data text-[var(--ed-text-primary)]">
                          ₹{v.base_price_per_kg}/kg
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-[var(--ed-text-muted)] italic">No packaging variants defined</div>
                  )}
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="mt-5 pt-4 border-t border-[var(--ed-border)] flex items-center justify-between">
              <span className="text-xs text-[var(--ed-text-muted)] font-semibold">
                MOQ: <span className="font-data font-bold text-[var(--ed-text-primary)]">{p.min_order_quantity_kg}kg</span>
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
                Add Wholesale Tea to Catalog
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
                    Tea Blend / Product Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kurseong Muscatel Second Flush"
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
                    <option value="Assam CTC">Assam CTC</option>
                    <option value="Darjeeling">Darjeeling</option>
                    <option value="Dooars">Dooars</option>
                    <option value="Green Tea">Green Tea</option>
                    <option value="Specialty">Specialty</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Tea Grade
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FTGFOP1 / BP / BOP"
                    value={newProd.tea_grade}
                    onChange={(e) => setNewProd({ ...newProd, tea_grade: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] placeholder:text-[var(--ed-text-muted)] focus:outline-none ed-focus-ring"
                    style={{ background: "var(--ed-bg)" }}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Base Rate (₹/kg)
                  </label>
                  <input
                    type="number"
                    required
                    min="50"
                    value={newProd.base_price_per_kg}
                    onChange={(e) => setNewProd({ ...newProd, base_price_per_kg: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-data font-bold focus:outline-none ed-focus-ring"
                    style={{ background: "var(--ed-bg)" }}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    MOQ (kg)
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
                  Product Description & Flavor Profile
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe aroma, liquor strength, estate garden, recommended beverage type..."
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
                    Save Tea
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
                Edit Tea: {editingProduct.name}
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
                    Tea Grade
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
                    MOQ (kg)
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
