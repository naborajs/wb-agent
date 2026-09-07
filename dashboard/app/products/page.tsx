"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function ProductsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/knowledge?tab=catalog_product");
    }, 600);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 shadow-xl shadow-cyan-500/5 animate-pulse">
        <Package className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-100 mb-3">
        Product Catalog has merged into Knowledge RAG Hub
      </h1>
      <p className="text-slate-400 max-w-lg mb-8 text-sm leading-relaxed">
        Product cards, SKUs, inventory status, and packaging variants are now unified inside the central Knowledge RAG Hub with real-time Dual-Brain update chat.
      </p>
      <Link
        href="/knowledge?tab=catalog_product"
        className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold rounded-xl transition shadow-lg shadow-cyan-500/20"
      >
        <ShieldCheck className="w-4 h-4" />
        Open Product Catalog in Knowledge Hub
        <ArrowRight className="w-4 h-4 ml-1" />
      </Link>
    </div>
  );
}
