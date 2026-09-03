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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Wholesale Catalog & Stock Management
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Live catalog customization, 1-click in-stock toggling, pricing variants, and Minimum Order Quantities (MOQ).
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add New Tea
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search teas, grades, origins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {["ALL", "Darjeeling", "Assam CTC", "Dooars", "Green Tea"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
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
            className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between transition-all duration-200 ${
              p.in_stock
                ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                : "bg-slate-50/70 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800/60 opacity-80"
            }`}
          >
            <div>
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                  {p.category}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Grade: {p.tea_grade || "Estate"}
                  </span>
                  <button
                    onClick={() => setEditingProduct(p)}
                    title="Edit Product"
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p.id)}
                    title="Delete Product"
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-base text-slate-900 dark:text-white mt-3">{p.name}</h3>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                SKU: {p.sku} • {p.origin}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
                {p.description}
              </p>

              {/* Packaging Variants & Rates */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Packaging & Base Rates
                </div>
                <div className="space-y-1.5">
                  {p.variants && p.variants.length > 0 ? (
                    p.variants.map((v) => (
                      <div
                        key={v.id}
                        className="flex justify-between items-center text-xs p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        <span className="font-medium">
                          {v.name} ({v.weight_kg}kg)
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          ₹{v.base_price_per_kg}/kg
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic">No packaging variants configured</div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer with 1-Click In Stock Toggle */}
            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                MOQ: <strong className="text-slate-800 dark:text-slate-200">{p.min_order_quantity_kg} kg</strong>
              </span>

              {/* Toggle Button */}
              <button
                onClick={() => handleToggleStock(p)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold transition-colors ${
                  p.in_stock
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20"
                }`}
              >
                {p.in_stock ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>In Stock</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Out of Stock</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ADD PRODUCT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-600" />
                Add New Wholesale Tea to Catalog
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tea Blend / Product Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kurseong Muscatel Second Flush"
                    value={newProd.name}
                    onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={newProd.category}
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Assam CTC">Assam CTC</option>
                    <option value="Darjeeling">Darjeeling</option>
                    <option value="Dooars">Dooars</option>
                    <option value="Green Tea">Green Tea</option>
                    <option value="Specialty">Specialty</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tea Grade
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FTGFOP1 / BP / BOP"
                    value={newProd.tea_grade}
                    onChange={(e) => setNewProd({ ...newProd, tea_grade: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Base Rate (₹/kg)
                  </label>
                  <input
                    type="number"
                    required
                    min="50"
                    value={newProd.base_price_per_kg}
                    onChange={(e) => setNewProd({ ...newProd, base_price_per_kg: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    MOQ (kg)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newProd.min_order_quantity_kg}
                    onChange={(e) => setNewProd({ ...newProd, min_order_quantity_kg: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Description & Flavor Profile
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe aroma, liquor strength, estate garden, recommended beverage type..."
                  value={newProd.description}
                  onChange={(e) => setNewProd({ ...newProd, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newProd.in_stock}
                    onChange={(e) => setNewProd({ ...newProd, in_stock: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Immediately Available In Stock
                  </span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Edit Product: {editingProduct.name}
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tea Grade
                  </label>
                  <input
                    type="text"
                    value={editingProduct.tea_grade || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, tea_grade: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editingProduct.description || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5"
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
