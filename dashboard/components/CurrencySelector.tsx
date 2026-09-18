"use client";

import React, { useState, useEffect } from "react";
import { Globe } from "lucide-react";

interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

const CURRENCIES: CurrencyOption[] = [
  { code: "INR", symbol: "₹", name: "INR (₹)" },
  { code: "USD", symbol: "$", name: "USD ($)" },
  { code: "EUR", symbol: "€", name: "EUR (€)" },
  { code: "GBP", symbol: "£", name: "GBP (£)" },
  { code: "AED", symbol: "AED", name: "AED (د.إ)" },
  { code: "SGD", symbol: "S$", name: "SGD (S$)" },
];

interface CurrencySelectorProps {
  onCurrencyChange?: (currency: string) => void;
  className?: string;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  onCurrencyChange,
  className = "",
}) => {
  const [selected, setSelected] = useState<string>("INR");

  useEffect(() => {
    const saved = localStorage.getItem("wb_preferred_currency");
    if (saved && CURRENCIES.some((c) => c.code === saved)) {
      setSelected(saved);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setSelected(next);
    localStorage.setItem("wb_preferred_currency", next);
    if (onCurrencyChange) {
      onCurrencyChange(next);
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 ${className}`}>
      <Globe className="w-3.5 h-3.5 text-slate-400" />
      <select
        value={selected}
        onChange={handleChange}
        className="bg-transparent font-medium focus:outline-none cursor-pointer pr-1 text-xs"
        aria-label="Select display currency"
      >
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code} className="dark:bg-slate-900 dark:text-white">
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
};
