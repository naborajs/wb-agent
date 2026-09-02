"use client";

import React, { useState, useEffect } from "react";
import { Upload, Search, Users, Phone, Building, CheckCircle2, XCircle } from "lucide-react";

interface Lead {
  id: string;
  phone: string;
  name: string | null;
  company_name: string | null;
  company_type: string | null;
  status: string;
  score: number;
  product_interest: string | null;
  created_at: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([
    {
      id: "lead_1",
      phone: "+918900653250",
      name: "Rahul Sharma",
      company_name: "Heritage Cafe",
      company_type: "Cafe",
      status: "qualified",
      score: 85,
      product_interest: "Darjeeling First Flush",
      created_at: new Date().toISOString(),
    },
    {
      id: "lead_2",
      phone: "+919832012345",
      name: "Anita Paul",
      company_name: "Paul Sweets & Tea",
      company_type: "Restaurant",
      status: "converted",
      score: 95,
      product_interest: "Assam Kadak CTC",
      created_at: new Date().toISOString(),
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/leads")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data && data.items && data.items.length > 0) {
          setLeads(data.items);
        }
      })
      .catch(() => {});
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/v1/leads/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadResult(`Successfully imported ${data.imported} leads (${data.duplicate} duplicates skipped).`);
        // reload leads
        const r = await fetch("/api/v1/leads");
        if (r.ok) {
          const fresh = await r.json();
          if (fresh.items) setLeads(fresh.items);
        }
      } else {
        setUploadResult(`Import failed: ${data.detail || "Error"}`);
      }
    } catch (err: any) {
      setUploadResult(`Error uploading: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const filtered = leads.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = (l.name || "").toLowerCase().includes(q);
      const matchCompany = (l.company_name || "").toLowerCase().includes(q);
      const matchPhone = l.phone.includes(q);
      if (!matchName && !matchCompany && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Leads Directory</h2>
          <p className="text-sm text-slate-500 mt-1">
            Canonical B2B prospect database with validation, E.164 phone normalization, and WhatsApp opt-in status.
          </p>
        </div>

        <div>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            {uploading ? "Importing CSV..." : "Import Leads CSV"}
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {uploadResult && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 rounded-lg">
          {uploadResult}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search leads by name, company, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
          />
        </div>

        <div className="flex gap-2">
          {["all", "new", "contacted", "qualified", "converted"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg uppercase tracking-wider ${
                statusFilter === st ? "bg-slate-900 text-white" : "text-slate-600 bg-slate-100 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3">Lead Contact</th>
              <th className="px-5 py-3">Company</th>
              <th className="px-5 py-3">Product Interest</th>
              <th className="px-5 py-3">Score</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-slate-900">{lead.name || "Anonymous Lead"}</div>
                  <div className="text-[11px] text-slate-400">{lead.phone}</div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="font-medium text-slate-800">{lead.company_name || "—"}</div>
                  <div className="text-[11px] text-slate-400">{lead.company_type || "Business"}</div>
                </td>
                <td className="px-5 py-3.5 font-medium text-slate-700">
                  {lead.product_interest || "General Wholesale Inquiry"}
                </td>
                <td className="px-5 py-3.5">
                  <span className="font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                    {lead.score}/100
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      lead.status === "qualified" || lead.status === "converted"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {lead.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-400">
                  {new Date(lead.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
