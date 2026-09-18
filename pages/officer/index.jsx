import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import TopUtilityBar from "../../components/TopUtilityBar";
import PortalHeader from "../../components/PortalHeader";
import NavTabs from "../../components/NavTabs";
import OfficerSidebar from "../../components/OfficerSidebar";
import Badge from "../../components/Badge";
import InfoCard from "../../components/InfoCard";
import FilePreviewModal from "../../components/FilePreviewModal";
import FullApplicationModal from "../../components/FullApplicationModal";
import styles from "../../styles/Officer.module.css";
import listStyles from "../../styles/OfficerList.module.css";

const STATUS_BADGE = {
  Pending: "amber",
  Accepted: "green",
  Rejected: "red",
  Open: "blue",
  "In Progress": "amber",
  Resolved: "green",
  Escalated: "red",
};

export default function OfficerListView() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [previewTarget, setPreviewTarget] = useState(null);
  const [selectedDossier, setSelectedDossier] = useState(null);

  useEffect(() => {
    fetchComplaints();
  }, [filterStatus, filterCategory]);

  function fetchComplaints() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterCategory) params.set("category", filterCategory);

    fetch(`/api/complaints?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setComplaints(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setComplaints([]);
        setLoading(false);
      });
  }

  async function handleQuickAction(complaintId, newStatus) {
    try {
      const body = { status: newStatus };
      if (newStatus === "Rejected") {
        body.override_reason = "Rejected from officer queue review.";
      }
      const res = await fetch(`/api/complaints/${encodeURIComponent(complaintId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        // Broadcast across open browser tabs for instantaneous sync
        if (typeof window !== "undefined" && window.BroadcastChannel) {
          try {
            const bc = new BroadcastChannel("civic_complaints_realtime");
            bc.postMessage({ type: "STATUS_UPDATE", complaint: updated });
            bc.close();
          } catch (e) {}
        }
        fetchComplaints();
      }
    } catch (err) {
      // silently fail, user can retry
    }
  }

  const stats = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "Pending").length,
    accepted: complaints.filter((c) => c.status === "Accepted").length,
    rejected: complaints.filter((c) => c.status === "Rejected").length,
    inProgress: complaints.filter((c) => c.status === "In Progress").length,
  };

  return (
    <>
      <Head>
        <title>Officer Dashboard — National Civic Grievance Portal</title>
      </Head>

      <TopUtilityBar rightLabel="Administrative Casework Hub" />
      <PortalHeader />
      <NavTabs active="officer" badge={{ text: "CASEWORK LEVEL: NODAL TIER-1", variant: "outline" }} />

      <div className={styles.officerBody}>
        <OfficerSidebar />

        <main className={styles.main}>
          <div className={styles.breadcrumb}>
            <span>🏠 Officer Dashboard</span>
            <span>›</span>
            <strong>Active Casework Queue</strong>
          </div>

          <h1 className={styles.title}>
            Grievance Queue <span className="hi">/ शिकायत कतार</span>
          </h1>

          {/* Stats row */}
          <div className={listStyles.statsRow}>
            <InfoCard>
              <div className={listStyles.statValue}>{stats.total}</div>
              <div className={listStyles.statLabel}>Total Complaints</div>
            </InfoCard>
            <InfoCard>
              <div className={listStyles.statValue}>{stats.pending}</div>
              <div className={listStyles.statLabel}>Pending</div>
            </InfoCard>
            <InfoCard>
              <div className={listStyles.statValue}>{stats.accepted}</div>
              <div className={listStyles.statLabel}>Accepted</div>
            </InfoCard>
            <InfoCard>
              <div className={listStyles.statValue}>{stats.rejected}</div>
              <div className={listStyles.statLabel}>Rejected</div>
            </InfoCard>
            <InfoCard>
              <div className={listStyles.statValue}>{stats.inProgress}</div>
              <div className={listStyles.statLabel}>In Progress</div>
            </InfoCard>
          </div>

          <InfoCard className={listStyles.listCard}>
            <div className={listStyles.listHeader}>
              <h2 className={listStyles.listTitle}>
                All Complaints <span className="hi">(सभी शिकायतें)</span>
              </h2>
              <div className={listStyles.filterRow}>
                <select
                  className={listStyles.filterSelect}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Escalated">Escalated</option>
                </select>
                <select
                  className={listStyles.filterSelect}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  <option value="Water Supply">Water Supply</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Roads">Roads</option>
                  <option value="Waste Management">Waste Management</option>
                  <option value="Street Lighting">Street Lighting</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className={listStyles.loadingState}>Loading complaints...</div>
            ) : complaints.length === 0 ? (
              <div className={listStyles.emptyState}>
                No complaints found. Citizens can file complaints from the{" "}
                <Link href="/" style={{ color: "var(--blue-700)", fontWeight: 700 }}>
                  Citizen Filing Flow
                </Link>.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className={listStyles.table}>
                  <thead>
                    <tr>
                      <th>Complaint ID</th>
                      <th>Category</th>
                      <th>Confidence</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Evidence</th>
                      <th>Filed</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr key={c.complaint_id}>
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
                            title="Click to open full application dossier"
                          >
                            #{c.complaint_id}
                          </button>
                        </td>
                        <td>{c.category}</td>
                        <td className={listStyles.confidenceCell}>
                          {Math.round((c.confidence || 0) * 100)}%
                        </td>
                        <td className={listStyles.truncateText}>{c.department}</td>
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
                              title="Click to open attached file"
                            >
                              📷 View File
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
                              title="Open full application details and review"
                            >
                              📄 Open Application
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
                                onClick={() => handleQuickAction(c.complaint_id, "Rejected")}
                                title="Reject this application"
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </InfoCard>
        </main>
      </div>

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
