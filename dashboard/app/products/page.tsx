"use client";

import React, { useState, useEffect } from "react";
import { Coffee, Tag, CheckCircle2, Package, Layers } from "lucide-react";

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

  useEffect(() => {
    fetch("/api/v1/products")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) setProducts(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Wholesale Tea Catalog</h2>
        <p className="text-sm text-slate-500 mt-1">
          Estate direct tea grades, certified regional origins, packaging variants, and Minimum Order Quantities (MOQ).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <div key={p.id} className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  {p.category}
                </span>
                <span className="text-xs font-semibold text-slate-400">Grade: {p.tea_grade}</span>
              </div>

              <h3 className="font-bold text-base text-slate-900 mt-3">{p.name}</h3>
              <div className="text-xs text-slate-400 mt-0.5">SKU: {p.sku} • {p.origin}</div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed">{p.description}</p>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Packaging & Base Rates
                </div>
                <div className="space-y-1.5">
                  {p.variants &&
                    p.variants.map((v) => (
                      <div key={v.id} className="flex justify-between items-center text-xs p-2 rounded bg-slate-50 border border-slate-100">
                        <span className="font-medium text-slate-700">{v.name} ({v.weight_kg}kg)</span>
                        <span className="font-bold text-slate-900">₹{v.base_price_per_kg}/kg</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">MOQ: <strong>{p.min_order_quantity_kg} kg</strong></span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> In Stock
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
