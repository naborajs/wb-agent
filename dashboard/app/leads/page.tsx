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
        const count = data.imported ?? data.leads_created ?? 0;
        setUploadResult(`Successfully ingested ${count} leads from CSV (Total: ${data.total_rows || count}).`);
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
        <h2 className="text-2xl font-bold tracking-tight text-[var(--ed-text-primary)]">
          Lead Intake & Custom Proposals
        </h2>
        <p className="text-sm text-[var(--ed-text-muted)] mt-1">
          Strictly human-provided CSV ingestion. EDITH tailors unique B2B proposals and polite zero-cost check-ins.
        </p>
      </div>

      {/* CSV Ingestion Box */}
      <div className="p-6 ed-panel rounded-xl space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-[var(--ed-text-primary)]">
          <Upload className="w-4 h-4 text-[var(--ed-accent)]" />
          Upload Leads via CSV
        </div>
        <p className="text-xs text-[var(--ed-text-muted)]">
          Upload commercial lead lists (columns: phone, name, company_name, company_type, city, product_interest).
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <label
            className="ed-press ed-focus-ring cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-xs font-semibold shadow-sm transition-colors hover:opacity-90"
            style={{ background: "var(--ed-accent)" }}
          >
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
            <span className="text-xs font-medium text-[var(--ed-success)] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {uploadResult}
            </span>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 ed-panel rounded-xl flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--ed-text-muted)] absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search leads by name, company, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-[var(--ed-border)] rounded-lg text-[var(--ed-text-primary)] placeholder:text-[var(--ed-text-muted)] focus:outline-none ed-focus-ring"
            style={{ background: "var(--ed-bg)" }}
          />
        </div>

        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
          {["all", "new", "contacted", "qualified", "converted"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`ed-press ed-focus-ring px-3 py-1.5 text-xs font-semibold rounded-lg uppercase tracking-wider transition-colors shrink-0 ${
                statusFilter === st
                  ? "text-white shadow-sm"
                  : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] border border-[var(--ed-border)]"
              }`}
              style={
                statusFilter === st
                  ? { background: "var(--ed-accent)" }
                  : { background: "var(--ed-bg)" }
              }
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="ed-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--ed-text-primary)] min-w-[640px]">
            <thead
              className="text-[var(--ed-text-muted)] font-semibold border-b border-[var(--ed-border)] uppercase tracking-wider"
              style={{ background: "var(--ed-bg)" }}
            >
              <tr>
                <th className="px-5 py-3">Lead Contact</th>
                <th className="px-5 py-3">Company</th>
                <th className="px-5 py-3">Product Interest</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-[var(--ed-border)]">
            {filtered.map((lead) => (
              <tr key={lead.id} className="hover:bg-[var(--ed-bg)] transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-[var(--ed-text-primary)]">
                    {lead.name || "Anonymous Lead"}
                  </div>
                  <div className="text-[11px] text-[var(--ed-text-muted)] font-data">{lead.phone}</div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="font-medium text-[var(--ed-text-primary)]">
                    {lead.company_name || "—"}
                  </div>
                  <div className="text-[11px] text-[var(--ed-text-muted)]">{lead.company_type || "Business"}</div>
                </td>
                <td className="px-5 py-3.5 font-medium text-[var(--ed-text-primary)]">
                  {lead.product_interest || "General Wholesale Inquiry"}
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className="font-bold px-2 py-0.5 rounded text-[var(--ed-text-primary)] font-data border border-[var(--ed-border)]"
                    style={{ background: "var(--ed-bg)" }}
                  >
                    {lead.score}/100
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      lead.status === "qualified" || lead.status === "converted"
                        ? "text-[var(--ed-success)] border border-[var(--ed-success)]/20"
                        : "text-[var(--ed-text-muted)] border border-[var(--ed-border)]"
                    }`}
                    style={{
                      background:
                        lead.status === "qualified" || lead.status === "converted"
                          ? "color-mix(in srgb, var(--ed-success) 10%, transparent)"
                          : "var(--ed-bg)",
                    }}
                  >
                    {lead.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  {sentLeadIds[lead.id] ? (
                    <span className="inline-flex items-center gap-1 text-[var(--ed-success)] font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Proposal Sent
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSendProposal(lead.id)}
                      disabled={sendingLeadId === lead.id}
                      className="ed-press ed-focus-ring inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white font-semibold text-[11px] transition-colors disabled:opacity-50 hover:opacity-90"
                      style={{ background: "var(--ed-accent)" }}
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
    </div>
  );
}
