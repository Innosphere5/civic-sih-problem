import Head from "next/head";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import TopUtilityBar from "../components/TopUtilityBar";
import PortalHeader from "../components/PortalHeader";
import NavTabs from "../components/NavTabs";
import OfficerSidebar from "../components/OfficerSidebar";
import Badge from "../components/Badge";
import InfoCard from "../components/InfoCard";
import FilePreviewModal from "../components/FilePreviewModal";
import FullApplicationModal from "../components/FullApplicationModal";
import DeclineReasonModal from "../components/DeclineReasonModal";
import useAdminAuth from "../lib/useAdminAuth";
import styles from "../styles/Officer.module.css";
import listStyles from "../styles/OfficerList.module.css";

const STATUS_BADGE = {
  Pending: "amber",
  Accepted: "green",
  Rejected: "red",
  Open: "blue",
  "In Progress": "amber",
  Resolved: "green",
  Escalated: "red",
};

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "Pending", label: "Pending" },
  { key: "Accepted", label: "Accepted" },
  { key: "Rejected", label: "Declined" },
  { key: "In Progress", label: "In Progress" },
  { key: "Resolved", label: "Resolved" },
];

const CATEGORY_OPTIONS = [
  "Water Supply",
  "Electricity",
  "Roads",
  "Waste Management",
  "Street Lighting",
];

function getSlaStatus(complaint) {
  if (!complaint.created_at || !complaint.sla_hours) return { label: "—", cls: "" };
  if (complaint.status === "Resolved" || complaint.status === "Rejected") {
    return { label: "Closed", cls: listStyles.slaNormal };
  }
  const created = new Date(complaint.created_at).getTime();
  const deadline = created + complaint.sla_hours * 3600000;
  const now = Date.now();
  const remaining = deadline - now;
  const hoursLeft = Math.round(remaining / 3600000);

  if (remaining <= 0) return { label: `Breached (${Math.abs(hoursLeft)}h over)`, cls: listStyles.slaBreached };
  if (hoursLeft <= 6) return { label: `${hoursLeft}h left`, cls: listStyles.slaWarning };
  return { label: `${hoursLeft}h left`, cls: listStyles.slaNormal };
}

export default function AdminPortal() {
  const router = useRouter();
  const { admin, loading: authLoading, logout } = useAdminAuth({ required: true });
  const [allComplaints, setAllComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewTarget, setPreviewTarget] = useState(null);
  const [selectedDossier, setSelectedDossier] = useState(null);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [currentView, setCurrentView] = useState("table");
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef(null);
  const searchTimer = useRef(null);

  // Read query params on mount
  useEffect(() => {
    const { status, view } = router.query;
    if (status) setFilterStatus(status);
    if (view === "analytics") setCurrentView("analytics");
  }, [router.query]);

  const fetchComplaints = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterCategory) params.set("category", filterCategory);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());

    fetch(`/api/complaints?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setAllComplaints(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setAllComplaints([]);
        setLoading(false);
      });
  }, [filterStatus, filterCategory, searchQuery]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Debounced search
  function handleSearchInput(val) {
    setSearchQuery(val);
  }

  function showToast(msg) {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 4000);
  }

  // ── Quick Actions ──
  async function handleQuickAction(complaintId, newStatus) {
    try {
      const body = { status: newStatus };
      if (newStatus === "Rejected") {
        body.override_reason = "Quick declined from admin queue review.";
      }
      const res = await fetch(`/api/complaints/${encodeURIComponent(complaintId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        broadcastUpdate(updated);
        fetchComplaints();
        showToast(`Application #${complaintId} updated to "${newStatus}"`);
      }
    } catch (err) {
      // silently fail
    }
  }

  function broadcastUpdate(data) {
    if (typeof window !== "undefined" && window.BroadcastChannel) {
      try {
        const bc = new BroadcastChannel("civic_complaints_realtime");
        bc.postMessage({ type: "STATUS_UPDATE", complaint: data });
        bc.close();
      } catch (e) {}
    }
  }

  // ── Selection ──
  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === allComplaints.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allComplaints.map((c) => c.complaint_id)));
    }
  }

  // ── Batch Actions ──
  async function handleBatchAction(action, reason = null) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      const body = { complaint_ids: ids, action };
      if (reason) body.override_reason = reason;
      const res = await fetch("/api/complaints/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedIds(new Set());
        fetchComplaints();
        showToast(data.message || `Batch updated ${data.updatedCount} applications.`);
      }
    } catch (err) {
      showToast("Batch action failed.");
    }
  }

  // ── Seed demo data ──
  async function handleSeedData() {
    try {
      const res = await fetch("/api/complaints/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        fetchComplaints();
        showToast(data.message || "Sample cases added!");
      }
    } catch {
      showToast("Failed to seed data.");
    }
  }

  // ── CSV Export ──
  function handleExportCSV() {
    if (allComplaints.length === 0) {
      showToast("No data to export.");
      return;
    }
    const headers = ["complaint_id", "category", "department", "status", "confidence", "locality", "contact", "sla_hours", "created_at"];
    const rows = allComplaints.map((c) =>
      headers.map((h) => `"${String(c[h] || "").replace(/"/g, '""')}"`).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `casework_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${allComplaints.length} records to CSV.`);
  }

  // ── Stats ──
  const stats = {
    total: allComplaints.length,
    pending: allComplaints.filter((c) => c.status === "Pending").length,
    accepted: allComplaints.filter((c) => c.status === "Accepted").length,
    rejected: allComplaints.filter((c) => c.status === "Rejected").length,
    inProgress: allComplaints.filter((c) => c.status === "In Progress").length,
    resolved: allComplaints.filter((c) => c.status === "Resolved").length,
  };

  const avgConfidence = allComplaints.length > 0
    ? Math.round((allComplaints.reduce((s, c) => s + (c.confidence || 0), 0) / allComplaints.length) * 100)
    : 0;

  // ── Analytics data ──
  function getCategoryBreakdown() {
    const map = {};
    allComplaints.forEach((c) => {
      map[c.category] = (map[c.category] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }

  function getDepartmentBreakdown() {
    const map = {};
    allComplaints.forEach((c) => {
      map[c.department] = (map[c.department] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }

  const navActive = currentView === "analytics" ? "analytics" : (filterStatus || "all");

  if (authLoading || !admin) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0b1f28", color: "#f2f5f6", fontFamily: "var(--font-body)" }}>
        <div style={{ width: "42px", height: "42px", border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#d98a1d", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <div style={{ marginTop: "18px", fontSize: "14px", fontWeight: 700, letterSpacing: "0.5px" }}>
          Verifying Officer Security Clearance...
        </div>
        <div style={{ marginTop: "5px", fontSize: "11px", color: "#8da4ae" }}>
          Central Public Grievance Command Gateway • National Informatics Centre
        </div>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const clearanceBadgeText = admin?.role === "superadmin"
    ? "ADMIN CLEARANCE: CHIEF APEX"
    : "ADMIN CLEARANCE: NODAL TIER-1";

  return (
    <>
      <Head>
        <title>Admin Command Center — National Civic Grievance Portal</title>
        <meta name="description" content="Central administrative console for reviewing, accepting, declining, and managing civic grievance applications." />
      </Head>

      <TopUtilityBar rightLabel="Central Administrative Command Console" />
      <PortalHeader admin={admin} />
      <NavTabs
        active={navActive}
        badge={{ text: clearanceBadgeText, variant: "outline" }}
        counts={{
          all: stats.total,
          Pending: stats.pending,
          Accepted: stats.accepted,
          Rejected: stats.rejected,
        }}
      />

      <div className={styles.officerBody}>
        <OfficerSidebar
          currentStatus={filterStatus}
          onSelectStatus={(s) => {
            setFilterStatus(s);
            setCurrentView("table");
            setSelectedIds(new Set());
          }}
          counts={stats}
          onExportCSV={handleExportCSV}
          onSeedData={handleSeedData}
          currentView={currentView}
          onSelectView={setCurrentView}
          admin={admin}
          onLogout={logout}
        />


        <main className={styles.main}>
          <div className={styles.breadcrumb}>
            <span>🏛️ Admin Portal</span>
            <span>›</span>
            <strong>{currentView === "analytics" ? "Casework Analytics" : "Application Review Queue"}</strong>
          </div>

          <h1 className={styles.title}>
            {currentView === "analytics"
              ? <>Casework Analytics <span className="hi">/ प्रशासनिक रिपोर्ट</span></>
              : <>Application Review Queue <span className="hi">/ आवेदन समीक्षा कतार</span></>
            }
          </h1>

          {/* KPI Stats Row */}
          <div className={listStyles.statsRow}>
            <InfoCard>
              <div className={listStyles.statValue}>{stats.total}</div>
              <div className={listStyles.statLabel}>Total Filed</div>
            </InfoCard>
            <InfoCard>
              <div className={listStyles.statValue} style={{ color: "#b45309" }}>{stats.pending}</div>
              <div className={listStyles.statLabel}>Pending Scrutiny</div>
            </InfoCard>
            <InfoCard>
              <div className={listStyles.statValue} style={{ color: "#15803d" }}>{stats.accepted}</div>
              <div className={listStyles.statLabel}>Accepted</div>
            </InfoCard>
            <InfoCard>
              <div className={listStyles.statValue} style={{ color: "#b91c1c" }}>{stats.rejected}</div>
              <div className={listStyles.statLabel}>Declined</div>
            </InfoCard>
            <InfoCard>
              <div className={listStyles.statValue} style={{ color: "#1e40af" }}>{avgConfidence}%</div>
              <div className={listStyles.statLabel}>Avg AI Confidence</div>
            </InfoCard>
          </div>

          {/* ── Analytics View ── */}
          {currentView === "analytics" && (
            <div className={listStyles.analyticsGrid}>
              {/* Status Distribution */}
              <div className={listStyles.analyticsCard}>
                <div className={listStyles.analyticsTitle}>📊 Status Distribution</div>
                {[
                  { label: "Pending", count: stats.pending, color: "#d97706" },
                  { label: "Accepted", count: stats.accepted, color: "#16a34a" },
                  { label: "Declined", count: stats.rejected, color: "#dc2626" },
                  { label: "In Progress", count: stats.inProgress, color: "#2563eb" },
                  { label: "Resolved", count: stats.resolved, color: "#059669" },
                ].map((item) => (
                  <div key={item.label} className={listStyles.barRow}>
                    <span className={listStyles.barLabel}>{item.label}</span>
                    <div className={listStyles.barTrack}>
                      <div
                        className={listStyles.barFill}
                        style={{
                          width: stats.total > 0 ? `${(item.count / stats.total) * 100}%` : "0%",
                          background: item.color,
                        }}
                      />
                    </div>
                    <span className={listStyles.barCount}>{item.count}</span>
                  </div>
                ))}
              </div>

              {/* Category Breakdown */}
              <div className={listStyles.analyticsCard}>
                <div className={listStyles.analyticsTitle}>📂 Category Breakdown</div>
                {getCategoryBreakdown().map(([cat, count]) => (
                  <div key={cat} className={listStyles.barRow}>
                    <span className={listStyles.barLabel}>{cat}</span>
                    <div className={listStyles.barTrack}>
                      <div
                        className={listStyles.barFill}
                        style={{
                          width: stats.total > 0 ? `${(count / stats.total) * 100}%` : "0%",
                          background: "#6366f1",
                        }}
                      />
                    </div>
                    <span className={listStyles.barCount}>{count}</span>
                  </div>
                ))}
                {getCategoryBreakdown().length === 0 && (
                  <div style={{ color: "#94a3b8", fontSize: "13px" }}>No data yet.</div>
                )}
              </div>

              {/* Department Breakdown */}
              <div className={listStyles.analyticsCard}>
                <div className={listStyles.analyticsTitle}>🏢 Department Routing</div>
                {getDepartmentBreakdown().map(([dept, count]) => (
                  <div key={dept} className={listStyles.barRow}>
                    <span className={listStyles.barLabel}>{dept}</span>
                    <div className={listStyles.barTrack}>
                      <div
                        className={listStyles.barFill}
                        style={{
                          width: stats.total > 0 ? `${(count / stats.total) * 100}%` : "0%",
                          background: "#0891b2",
                        }}
                      />
                    </div>
                    <span className={listStyles.barCount}>{count}</span>
                  </div>
                ))}
                {getDepartmentBreakdown().length === 0 && (
                  <div style={{ color: "#94a3b8", fontSize: "13px" }}>No data yet.</div>
                )}
              </div>

              {/* Accept/Reject Ratio */}
              <div className={listStyles.analyticsCard}>
                <div className={listStyles.analyticsTitle}>⚖️ Approval vs Rejection</div>
                <div style={{ display: "flex", gap: "24px", alignItems: "center", marginTop: "8px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "28px", fontWeight: 800, color: "#16a34a" }}>
                      {stats.accepted}
                    </div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      Accepted
                    </div>
                  </div>
                  <div style={{ fontSize: "20px", color: "#94a3b8" }}>vs</div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "28px", fontWeight: 800, color: "#dc2626" }}>
                      {stats.rejected}
                    </div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      Declined
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", height: "12px", borderRadius: "6px", overflow: "hidden", background: "#f1f5f9" }}>
                      {stats.accepted + stats.rejected > 0 && (
                        <>
                          <div style={{ width: `${(stats.accepted / (stats.accepted + stats.rejected)) * 100}%`, background: "#16a34a", transition: "width 0.3s" }} />
                          <div style={{ width: `${(stats.rejected / (stats.accepted + stats.rejected)) * 100}%`, background: "#dc2626", transition: "width 0.3s" }} />
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", textAlign: "center" }}>
                      {stats.accepted + stats.rejected > 0
                        ? `${Math.round((stats.accepted / (stats.accepted + stats.rejected)) * 100)}% acceptance rate`
                        : "No decisions yet"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Table View ── */}
          {currentView === "table" && (
            <InfoCard className={listStyles.listCard}>
              {/* Search & Filter Toolbar */}
              <div className={listStyles.toolbarContainer}>
                <div className={listStyles.searchBarRow}>
                  <div className={listStyles.searchInputWrapper}>
                    <span className={listStyles.searchIcon}>🔍</span>
                    <input
                      type="text"
                      className={listStyles.searchInput}
                      placeholder="Search by Application ID, grievance text, locality, contact..."
                      value={searchQuery}
                      onChange={(e) => handleSearchInput(e.target.value)}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className={listStyles.clearSearchBtn}
                        onClick={() => setSearchQuery("")}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <select
                    className={listStyles.filterSelect}
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Status quick-filter tabs */}
                <div className={listStyles.statusTabsRow}>
                  {STATUS_TABS.map((tab) => {
                    const count = tab.key === "" ? stats.total : (stats[tab.key.toLowerCase()] || allComplaints.filter(c => c.status === tab.key).length);
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        className={`${listStyles.statusTab} ${filterStatus === tab.key ? listStyles.statusTabActive : ""}`}
                        onClick={() => {
                          setFilterStatus(tab.key);
                          setSelectedIds(new Set());
                        }}
                      >
                        {tab.label}
                        <span className={listStyles.statusTabCount}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Batch Action Bar */}
              {selectedIds.size > 0 && (
                <div className={listStyles.batchBar}>
                  <div className={listStyles.batchInfo}>
                    ☑️ {selectedIds.size} application{selectedIds.size > 1 ? "s" : ""} selected
                  </div>
                  <div className={listStyles.batchActions}>
                    <button
                      type="button"
                      className={listStyles.batchBtnAccept}
                      onClick={() => handleBatchAction("Accepted")}
                    >
                      ✓ Batch Accept
                    </button>
                    <button
                      type="button"
                      className={listStyles.batchBtnReject}
                      onClick={() =>
                        setDeclineTarget({
                          count: selectedIds.size,
                          ids: Array.from(selectedIds),
                        })
                      }
                    >
                      ✕ Batch Decline
                    </button>
                    <button
                      type="button"
                      className={listStyles.batchBtnPending}
                      onClick={() => handleBatchAction("Pending")}
                    >
                      ⏳ Batch Pending
                    </button>
                    <button
                      type="button"
                      className={listStyles.batchBtnClear}
                      onClick={() => setSelectedIds(new Set())}
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
              )}

              {/* Table */}
              {loading ? (
                <div className={listStyles.loadingState}>Loading applications...</div>
              ) : allComplaints.length === 0 ? (
                <div className={listStyles.emptyState}>
                  <div style={{ fontSize: "32px", marginBottom: "12px" }}>📭</div>
                  No applications found matching your filters.
                  <div style={{ marginTop: "12px" }}>
                    <button
                      type="button"
                      onClick={handleSeedData}
                      style={{
                        background: "#1e40af",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        padding: "8px 16px",
                        fontSize: "13px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ⚡ Populate Sample Applications
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className={listStyles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: "36px" }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.size === allComplaints.length && allComplaints.length > 0}
                            onChange={toggleSelectAll}
                            title="Select all"
                          />
                        </th>
                        <th>Application ID</th>
                        <th>Grievance</th>
                        <th>Category</th>
                        <th>Confidence</th>
                        <th>Department</th>
                        <th>SLA Status</th>
                        <th>Status</th>
                        <th>Evidence</th>
                        <th>Filed</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allComplaints.map((c) => {
                        const sla = getSlaStatus(c);
                        const wordCount = c.complaint_text ? c.complaint_text.split(/\s+/).filter(Boolean).length : 0;
                        return (
                          <tr key={c.complaint_id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedIds.has(c.complaint_id)}
                                onChange={() => toggleSelect(c.complaint_id)}
                              />
                            </td>
                            <td className={listStyles.idCell}>
                              <button
                                type="button"
                                onClick={() => setSelectedDossier(c)}
                                className={listStyles.idLink}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: 0,
                                  font: "inherit",
                                  textAlign: "left",
                                }}
                                title="Open full application dossier"
                              >
                                #{c.complaint_id}
                              </button>
                            </td>
                            <td>
                              <div className={listStyles.complaintSnippet}>
                                {c.complaint_text}
                              </div>
                              <div className={listStyles.wordCountBadge}>{wordCount} words</div>
                            </td>
                            <td>{c.category}</td>
                            <td className={listStyles.confidenceCell}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <div style={{
                                  width: "32px", height: "4px", borderRadius: "2px",
                                  background: "#e2e8f0", overflow: "hidden"
                                }}>
                                  <div style={{
                                    width: `${Math.round((c.confidence || 0) * 100)}%`,
                                    height: "100%",
                                    background: (c.confidence || 0) >= 0.9 ? "#16a34a" : (c.confidence || 0) >= 0.7 ? "#d97706" : "#dc2626",
                                    borderRadius: "2px",
                                  }} />
                                </div>
                                {Math.round((c.confidence || 0) * 100)}%
                              </div>
                            </td>
                            <td className={listStyles.truncateText}>{c.department}</td>
                            <td>
                              {sla.cls ? (
                                <span className={`${listStyles.slaPill} ${sla.cls}`}>{sla.label}</span>
                              ) : (
                                <span style={{ color: "#94a3b8", fontSize: "12px" }}>—</span>
                              )}
                            </td>
                            <td>
                              <Badge variant={STATUS_BADGE[c.status] || "gray"}>
                                {c.status}
                              </Badge>
                            </td>
                            <td>
                              {c.image_path ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewTarget({ url: c.image_path, id: c.complaint_id })}
                                  style={{
                                    background: "var(--blue-100)",
                                    color: "var(--blue-700)",
                                    border: "1px solid var(--blue-600)",
                                    borderRadius: "var(--radius-sm)",
                                    padding: "3px 8px",
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                  title="View attached evidence"
                                >
                                  📷 View
                                </button>
                              ) : (
                                <span style={{ color: "var(--ink-300)", fontSize: "12px" }}>—</span>
                              )}
                            </td>
                            <td className={listStyles.dateCell}>
                              {new Date(c.created_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td>
                              <div className={listStyles.inlineActions}>
                                <button
                                  type="button"
                                  className={listStyles.openDossierBtn}
                                  onClick={() => setSelectedDossier(c)}
                                  title="Open full application dossier"
                                >
                                  📄 Review
                                </button>
                                {c.status !== "Accepted" && (
                                  <button
                                    type="button"
                                    className={listStyles.inlineAccept}
                                    onClick={() => handleQuickAction(c.complaint_id, "Accepted")}
                                    title="Accept this application"
                                  >
                                    ✓
                                  </button>
                                )}
                                {c.status !== "Rejected" && (
                                  <button
                                    type="button"
                                    className={listStyles.inlineReject}
                                    onClick={() =>
                                      setDeclineTarget({ id: c.complaint_id, count: 1 })
                                    }
                                    title="Decline this application"
                                  >
                                    ✕
                                  </button>
                                )}
                                {c.status !== "Pending" && (
                                  <button
                                    type="button"
                                    className={listStyles.inlinePending}
                                    onClick={() => handleQuickAction(c.complaint_id, "Pending")}
                                    title="Mark as Pending"
                                  >
                                    ⏳
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Results summary */}
              {!loading && allComplaints.length > 0 && (
                <div style={{
                  marginTop: "14px",
                  fontSize: "12px",
                  color: "#64748b",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <span>Showing {allComplaints.length} application{allComplaints.length !== 1 ? "s" : ""}</span>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    style={{
                      background: "none",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#475569",
                      cursor: "pointer",
                    }}
                  >
                    📥 Export CSV
                  </button>
                </div>
              )}
            </InfoCard>
          )}
        </main>
      </div>

      {/* ── Toast notification ── */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#0f172a",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            zIndex: 10000,
            animation: "fadeIn 0.2s ease-out",
            maxWidth: "380px",
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* ── Full Application Modal ── */}
      {selectedDossier && (
        <FullApplicationModal
          isOpen={true}
          complaint={selectedDossier}
          onClose={() => setSelectedDossier(null)}
          onStatusChange={(updated) => {
            setSelectedDossier(updated);
            fetchComplaints();
          }}
          onViewEvidence={(url, id) => setPreviewTarget({ url, id })}
        />
      )}

      {/* ── Decline Reason Modal ── */}
      {declineTarget && (
        <DeclineReasonModal
          isOpen={true}
          target={declineTarget}
          onClose={() => setDeclineTarget(null)}
          onConfirm={async (reason) => {
            if (declineTarget.ids) {
              // Batch decline
              await handleBatchAction("Rejected", reason);
            } else {
              // Single decline
              const body = { status: "Rejected", override_reason: reason };
              const res = await fetch(
                `/api/complaints/${encodeURIComponent(declineTarget.id)}`,
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                }
              );
              if (res.ok) {
                const updated = await res.json();
                broadcastUpdate(updated);
                fetchComplaints();
                showToast(`Application #${declineTarget.id} declined.`);
              } else {
                const err = await res.json();
                throw new Error(err.error || "Failed to decline.");
              }
            }
          }}
        />
      )}

      {/* ── File Preview Modal ── */}
      {previewTarget && (
        <FilePreviewModal
          isOpen={true}
          onClose={() => setPreviewTarget(null)}
          fileUrl={previewTarget.url}
          fileName={previewTarget.url.split("/").pop()}
          title={`Evidence Inspection — Case #${previewTarget.id}`}
        />
      )}
    </>
  );
}
