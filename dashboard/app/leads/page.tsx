"use client";

import React, { useState, useEffect } from "react";
import {
  Upload,
  Search,
  Users,
  Phone,
  Building,
  CheckCircle2,
  XCircle,
  Send,
  Sparkles,
} from "lucide-react";

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
  const [sendingLeadId, setSendingLeadId] = useState<string | null>(null);
  const [sentLeadIds, setSentLeadIds] = useState<Record<string, boolean>>({});

  const loadLeads = () => {
    fetch("/api/v1/leads")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data && data.items && data.items.length > 0) {
          setLeads(data.items);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/v1/leads/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadResult(`Successfully ingested ${data.leads_created} leads from CSV.`);
        loadLeads();
      } else {
        setUploadResult(`Upload failed: ${data.detail || "Invalid format"}`);
      }
    } catch (e) {
      setUploadResult("Network error during file upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleSendProposal = async (leadId: string) => {
    setSendingLeadId(leadId);
    try {
      const res = await fetch(`/api/v1/proposals/send/${leadId}`, {
        method: "POST",
      });
      if (res.ok) {
        setSentLeadIds((prev) => ({ ...prev, [leadId]: true }));
        loadLeads();
      } else {
        alert("Failed to send proposal. Check server logs.");
      }
    } catch (e) {
      alert("Network error sending proposal.");
    } finally {
      setSendingLeadId(null);
    }
  };

  const filtered = leads.filter((l) => {
    const matchSearch =
      (l.name && l.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.company_name && l.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      l.phone.includes(searchTerm);
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Lead Intake & Custom Proposals
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Strictly human-provided CSV ingestion. EDITH tailors unique B2B proposals and polite zero-cost check-ins.
        </p>
      </div>

      {/* CSV Ingestion Box */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white">
          <Upload className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          Upload Leads via CSV
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Upload commercial lead lists (columns: phone, name, company_name, company_type, city, product_interest).
        </p>

        <div className="flex items-center gap-4 pt-1">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-amber-600 hover:bg-slate-800 dark:hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors">
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Processing CSV..." : "Select CSV File"}
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>

          {uploadResult && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {uploadResult}
            </span>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search leads by name, company, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {["all", "new", "contacted", "qualified", "converted"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors ${
                statusFilter === st
                  ? "bg-amber-600 text-white"
                  : "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3">Lead Contact</th>
              <th className="px-5 py-3">Company</th>
              <th className="px-5 py-3">Product Interest</th>
              <th className="px-5 py-3">Score</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {lead.name || "Anonymous Lead"}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">{lead.phone}</div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {lead.company_name || "—"}
                  </div>
                  <div className="text-[11px] text-slate-400">{lead.company_type || "Business"}</div>
                </td>
                <td className="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-300">
                  {lead.product_interest || "General Wholesale Inquiry"}
                </td>
                <td className="px-5 py-3.5">
                  <span className="font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono">
                    {lead.score}/100
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      lead.status === "qualified" || lead.status === "converted"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {lead.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  {sentLeadIds[lead.id] ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Proposal Sent
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSendProposal(lead.id)}
                      disabled={sendingLeadId === lead.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition-colors disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      {sendingLeadId === lead.id ? "Sending..." : "Send Custom Proposal"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
