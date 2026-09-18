import { useState, useEffect } from "react";
import Link from "next/link";
import Badge from "./Badge";
import styles from "../styles/FullApplicationModal.module.css";

const STATUS_BADGE = {
  Pending: "amber",
  Accepted: "green",
  Rejected: "red",
  Open: "blue",
  "In Progress": "amber",
  Resolved: "green",
  Escalated: "red",
};

export default function FullApplicationModal({
  complaint,
  isOpen,
  onClose,
  onStatusChange,
  onViewEvidence,
}) {
  const [localComplaint, setLocalComplaint] = useState(complaint);
  const [rejectionMode, setRejectionMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    setLocalComplaint(complaint);
    setRejectionMode(false);
    setRejectionReason("");
    setFeedback(null);
  }, [complaint]);

  if (!isOpen || !localComplaint) return null;

  async function handleAction(newStatus, explicitReason = null) {
    setSaving(true);
    setFeedback(null);

    const reasonToSend = explicitReason !== null ? explicitReason : rejectionReason;

    try {
      const res = await fetch(`/api/complaints/${encodeURIComponent(localComplaint.complaint_id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(reasonToSend ? { override_reason: reasonToSend.trim() } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update status.");
      }

      setLocalComplaint(data);
      setRejectionMode(false);
      setFeedback({
        type: "success",
        message: `Application status successfully updated to "${newStatus}". Live tracker notified!`,
      });

      // Broadcast update across browser tabs for 0ms same-browser sync
      if (typeof window !== "undefined" && window.BroadcastChannel) {
        try {
          const bc = new BroadcastChannel("civic_complaints_realtime");
          bc.postMessage({ type: "STATUS_UPDATE", complaint: data });
          bc.close();
        } catch (e) {}
      }

      if (onStatusChange) {
        onStatusChange(data);
      }
    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  const confidencePct = Math.round((localComplaint.confidence || 0) * 100);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <span style={{ fontSize: "1.3rem" }}>📋</span>
            <div>
              <h2 className={styles.title}>
                Citizen Grievance Dossier
                <span className={styles.idBadge}>#{localComplaint.complaint_id}</span>
              </h2>
            </div>
            <Badge variant={STATUS_BADGE[localComplaint.status] || "gray"}>
              {localComplaint.status}
            </Badge>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.headerBtn}
              onClick={handlePrint}
              title="Print Application Record"
            >
              🖨️ Print
            </button>
            <Link
              href={`/officer/${encodeURIComponent(localComplaint.complaint_id)}`}
              target="_blank"
              className={styles.headerBtn}
              title="Open full dedicated page"
            >
              ↗ Dedicated Page
            </Link>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              title="Close Application Modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className={styles.body}>
          {feedback && (
            <div
              className={`${styles.statusFeedback} ${
                feedback.type === "success" ? styles.statusSuccess : styles.statusError
              }`}
            >
              {feedback.message}
            </div>
          )}

          {/* Section 1: Citizen & Application Overview */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionHeading}>
              <span>Citizen & Submission Overview</span>
              <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: "0.75rem" }}>
                Metadata Verified
              </span>
            </h3>
            <div className={styles.gridThree}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Citizen Contact</span>
                <span className={styles.infoValue}>{localComplaint.contact || "Confidential / Masked"}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Locality / Jurisdiction</span>
                <span className={styles.infoValue}>{localComplaint.locality || "Unspecified Ward"}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Language Code</span>
                <span className={styles.infoValue}>
                  {localComplaint.language ? localComplaint.language.toUpperCase() : "EN"}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Filing Date & Time</span>
                <span className={styles.infoValue}>
                  {new Date(localComplaint.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Target SLA</span>
                <span className={styles.infoValue}>{localComplaint.sla_hours || 24} Hours</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Current Status</span>
                <span className={styles.infoValue}>
                  <Badge variant={STATUS_BADGE[localComplaint.status] || "gray"}>
                    {localComplaint.status}
                  </Badge>
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Full Citizen Grievance Statement */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionHeading}>
              <span>Full Grievance Statement (Unabridged)</span>
              <span style={{ fontWeight: 400, color: "#64748b", fontSize: "0.75rem" }}>
                {localComplaint.complaint_text ? localComplaint.complaint_text.split(/\s+/).length : 0} words
              </span>
            </h3>
            <div className={styles.statementBox}>
              {localComplaint.complaint_text}
            </div>
          </div>

          {/* Section 3: AI Classification & Routing Engine */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionHeading}>
              <span>AI Triage & Department Routing</span>
              <span style={{ fontWeight: 600, color: "#16a34a", fontSize: "0.75rem" }}>
                Automatic Routing Verified
              </span>
            </h3>
            <div className={styles.gridTwo}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Categorized Subject</span>
                <span className={styles.infoValue}>{localComplaint.category}</span>
                <div className={styles.confidenceMeter}>
                  <div className={styles.confidenceTrack}>
                    <div
                      className={styles.confidenceFill}
                      style={{ width: `${confidencePct}%` }}
                    />
                  </div>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#15803d" }}>
                    {confidencePct}% Confidence
                  </span>
                </div>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Assigned Department</span>
                <span className={styles.infoValue}>{localComplaint.department}</span>
              </div>
            </div>
          </div>

          {/* Section 4: Attached Evidence */}
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionHeading}>
              <span>Citizen Evidence / Attached Documents</span>
            </h3>
            {localComplaint.image_path ? (
              <div className={styles.evidenceRow}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>📎</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {localComplaint.image_path.split("/").pop()}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      Attached Evidence File (Photo/PDF)
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.evidencePreviewBtn}
                  onClick={() =>
                    onViewEvidence &&
                    onViewEvidence(localComplaint.image_path, localComplaint.complaint_id)
                  }
                >
                  📷 Inspect File Fullscreen
                </button>
              </div>
            ) : (
              <div style={{ color: "#94a3b8", fontSize: "0.875rem", fontStyle: "italic" }}>
                No evidence photos or documents were attached with this grievance.
              </div>
            )}
          </div>

          {/* Section 5: Officer Casework & Rejection Notes (if any) */}
          {(localComplaint.override_reason || localComplaint.status === "Rejected") && (
            <div className={styles.sectionCard}>
              <h3 className={styles.sectionHeading}>
                <span>Officer Audit Notes / Justification</span>
              </h3>
              <div className={styles.rejectionNotice}>
                <strong>Casework Remarks:</strong>{" "}
                {localComplaint.override_reason || "No explicit reason recorded."}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Officer Action Controls */}
        <div className={styles.footer}>
          {rejectionMode && (
            <div className={styles.rejectionInputArea}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#991b1b" }}>
                Specify Rejection Reason (Mandatory for citizen transparency, min 5 chars):
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                {[
                  "Jurisdiction Mismatch (Transferred to State Authority)",
                  "Incomplete Address or Unverifiable Location",
                  "Duplicate Grievance Previously Registered",
                  "Private Property Dispute Outside Municipal Charter",
                  "Insufficient Evidence to Substantiate Claim",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    style={{
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      background: rejectionReason === preset ? "#fee2e2" : "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      color: rejectionReason === preset ? "#991b1b" : "#334155",
                      cursor: "pointer",
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <textarea
                className={styles.rejectionTextarea}
                rows={3}
                placeholder="e.g., Incomplete address provided, issue pertains to private housing society, or duplicate complaint..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setRejectionMode(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.btnReject}
                  disabled={saving || rejectionReason.trim().length < 5}
                  onClick={() => handleAction("Rejected", rejectionReason)}
                >
                  {saving ? "Rejecting..." : "Confirm & Decline Application"}
                </button>
              </div>
            </div>
          )}

          <div className={styles.actionsBar}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#475569" }}>
                Officer Decision Rights:
              </span>
            </div>

            <div className={styles.actionGroup}>
              {localComplaint.status !== "Accepted" && (
                <button
                  type="button"
                  className={styles.btnApprove}
                  disabled={saving}
                  onClick={() => handleAction("Accepted")}
                  title="Approve and accept this application"
                >
                  ✓ Approve / Accept
                </button>
              )}

              {localComplaint.status !== "Rejected" && !rejectionMode && (
                <button
                  type="button"
                  className={styles.btnReject}
                  disabled={saving}
                  onClick={() => setRejectionMode(true)}
                  title="Decline and reject this application"
                >
                  ✕ Decline / Reject
                </button>
              )}

              {localComplaint.status !== "Pending" && (
                <button
                  type="button"
                  className={styles.btnPending}
                  disabled={saving}
                  onClick={() => handleAction("Pending")}
                  title="Mark as Pending further scrutiny"
                >
                  ⏳ Mark Pending
                </button>
              )}

              {localComplaint.status !== "In Progress" && (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  disabled={saving}
                  onClick={() => handleAction("In Progress")}
                  title="Set status to In Progress"
                >
                  ⚙️ In Progress
                </button>
              )}

              {localComplaint.status !== "Resolved" && (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  disabled={saving}
                  onClick={() => handleAction("Resolved")}
                  title="Mark grievance as Resolved"
                >
                  ✅ Resolve
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
