import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import TopUtilityBar from "../components/TopUtilityBar";
import PortalHeader from "../components/PortalHeader";
import NavTabs from "../components/NavTabs";
import Badge from "../components/Badge";
import InfoCard from "../components/InfoCard";
import FilePreviewModal from "../components/FilePreviewModal";
import styles from "../styles/Track.module.css";
import citizenStyles from "../styles/Citizen.module.css";

const STATUS_VARIANTS = {
  Pending: "amber",
  Accepted: "green",
  Rejected: "red",
  Open: "blue",
  "In Progress": "amber",
  Resolved: "green",
  Escalated: "red",
};

export default function LiveTrackPage() {
  const router = useRouter();
  const [searchId, setSearchId] = useState("");
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const timerRef = useRef(null);

  // Read ID from router query (?id=CG-...)
  useEffect(() => {
    if (router.isReady && router.query.id) {
      const id = String(router.query.id).trim();
      setSearchId(id);
      fetchComplaint(id);
    }
  }, [router.isReady, router.query.id]);

  // Load latest sample complaints for quick chips
  useEffect(() => {
    fetch("/api/complaints")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRecentComplaints(data.slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

  const [liveNotice, setLiveNotice] = useState(null);
  const [connectedRealtime, setConnectedRealtime] = useState(false);
  const complaintRef = useRef(complaint);

  useEffect(() => {
    complaintRef.current = complaint;
  }, [complaint]);

  // Real-time synchronization: SSE stream + BroadcastChannel + Snappy fallback poll
  useEffect(() => {
    if (!complaint?.complaint_id) return;
    const currentId = complaint.complaint_id;

    // Helper to process real-time update
    const handleIncomingUpdate = (updated) => {
      if (!updated || updated.complaint_id !== currentId) return;
      const prevStatus = complaintRef.current?.status;
      if (prevStatus && prevStatus !== updated.status) {
        setLiveNotice({
          status: updated.status,
          reason: updated.override_reason || "",
          time: new Date(),
        });
      }
      setComplaint(updated);
      setLastRefreshed(new Date());
    };

    // 1. Server-Sent Events (SSE) native connection
    let eventSource = null;
    try {
      eventSource = new EventSource(`/api/complaints/stream?id=${encodeURIComponent(currentId)}`);

      eventSource.onopen = () => {
        setConnectedRealtime(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "STATUS_UPDATE" && payload.complaint) {
            handleIncomingUpdate(payload.complaint);
          }
        } catch (e) {
          console.error("[SSE] Message parse error:", e);
        }
      };

      eventSource.onerror = () => {
        setConnectedRealtime(false);
      };
    } catch (err) {
      console.error("[SSE] Init error:", err);
    }

    // 2. BroadcastChannel for instant cross-tab sync in the same browser session
    let bc = null;
    if (typeof window !== "undefined" && window.BroadcastChannel) {
      try {
        bc = new BroadcastChannel("civic_complaints_realtime");
        bc.onmessage = (event) => {
          if (event.data?.type === "STATUS_UPDATE" && event.data?.complaint) {
            handleIncomingUpdate(event.data.complaint);
          }
        };
      } catch (err) {}
    }

    // 3. Fallback active polling every 4 seconds
    const pollInterval = setInterval(() => {
      fetchComplaint(currentId, true);
    }, 4000);

    return () => {
      if (eventSource) eventSource.close();
      if (bc) bc.close();
      clearInterval(pollInterval);
    };
  }, [complaint?.complaint_id]);

  function fetchComplaint(idToSearch, isSilent = false) {
    if (!idToSearch) return;
    if (!isSilent) {
      setLoading(true);
      setError("");
    }

    fetch(`/api/complaints/${encodeURIComponent(idToSearch)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Complaint #${idToSearch} not found. Please verify the ID.`);
        return res.json();
      })
      .then((data) => {
        setComplaint(data);
        setLastRefreshed(new Date());
        setLoading(false);
      })
      .catch((err) => {
        if (!isSilent) {
          setError(err.message);
          setComplaint(null);
          setLoading(false);
        }
      });
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!searchId.trim()) {
      setError("Please enter a Complaint ID to track.");
      return;
    }
    router.push(`/track?id=${encodeURIComponent(searchId.trim())}`, undefined, { shallow: true });
    fetchComplaint(searchId.trim());
  }

  // Calculate live SLA metrics
  function getSlaMetrics() {
    if (!complaint) return null;
    const createdAt = new Date(complaint.created_at).getTime();
    const totalSlaMs = (complaint.sla_hours || 24) * 3600 * 1000;
    const deadline = createdAt + totalSlaMs;
    const now = Date.now();

    const isResolved = complaint.status === "Resolved";
    const remainingMs = deadline - now;
    const elapsedMs = Math.max(0, now - createdAt);
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalSlaMs) * 100)));

    let statusText = "";
    let isOverdue = false;

    if (isResolved) {
      statusText = "Grievance Successfully Resolved";
    } else if (remainingMs > 0) {
      const hours = Math.floor(remainingMs / (3600 * 1000));
      const minutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
      statusText = `${hours}h ${minutes}m remaining`;
    } else {
      isOverdue = true;
      const overdueMs = Math.abs(remainingMs);
      const hours = Math.floor(overdueMs / (3600 * 1000));
      const minutes = Math.floor((overdueMs % (3600 * 1000)) / (60 * 1000));
      statusText = `Overdue by ${hours}h ${minutes}m (Escalation Active)`;
    }

    return {
      progressPercent,
      statusText,
      isOverdue,
      deadline: new Date(deadline).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    };
  }

  const sla = getSlaMetrics();

  return (
    <>
      <Head>
        <title>
          {complaint ? `Live Tracking #${complaint.complaint_id}` : "Live Grievance Tracking"} — National Civic Portal
        </title>
      </Head>

      <TopUtilityBar rightLabel="Official Citizen Service • Directorate of Public Grievances" />
      <PortalHeader />
      <NavTabs active="track" badge={{ text: "LIVE CASEWORK TRACKING", variant: "solid" }} />

      <div className={citizenStyles.infoStrip}>
        <span className={citizenStyles.infoIcon}>🛰</span>
        <span>
          Live Telemetry &amp; Statutory SLA Monitoring&nbsp;•&nbsp;Direct line to Municipal Field Engineering&nbsp;•&nbsp;
          <span className="hi">नागरिक शिकायत की लाइव स्थिति</span>
        </span>
        <span className={citizenStyles.infoSpacer} />
        {lastRefreshed && (
          <span style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.85)", fontFamily: "var(--font-mono-id)" }}>
            ⚡ Updated: {lastRefreshed.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="pageBody">
        <main style={{ minWidth: 0 }}>
          <Badge variant="blue">STATUTORY ESCALATION SUITE • CITIZEN SURVEILLANCE</Badge>

          <h1 className={citizenStyles.heading}>Live Grievance Redressal Tracking</h1>
          <p className={`hi ${citizenStyles.subheading}`}>
            शिकायत की वास्तविक स्थिति • Real-time status, field caseworker allocation, statutory SLA countdown, and attached evidence inspection.
          </p>

          {/* Search Box */}
          <InfoCard className={styles.searchCard}>
            <div className={styles.searchHeader}>
              <h2 className={styles.searchTitle}>Track Any Case by Complaint ID</h2>
              <p className={styles.searchSubtitle}>
                Enter the unique reference token generated upon submission (e.g., <code style={{ fontFamily: "var(--font-mono-id)" }}>CG-2026-XXXXX</code>)
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className={styles.searchBar}>
              <div className={styles.searchInputWrap}>
                <span className={styles.searchIcon}>🔍</span>
                <input
                  className={styles.searchInput}
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Enter Complaint ID (e.g. CG-2026-10492)..."
                />
              </div>
              <button type="submit" className={styles.searchBtn} disabled={loading}>
                {loading ? "Searching..." : "Track Case →"}
              </button>
            </form>

            {recentComplaints.length > 0 && (
              <div className={styles.recentChips}>
                <span>Quick check recent cases:</span>
                {recentComplaints.map((c) => (
                  <button
                    key={c.complaint_id}
                    type="button"
                    className={styles.chipBtn}
                    onClick={() => {
                      setSearchId(c.complaint_id);
                      router.push(`/track?id=${encodeURIComponent(c.complaint_id)}`, undefined, { shallow: true });
                      fetchComplaint(c.complaint_id);
                    }}
                  >
                    #{c.complaint_id} ({c.category})
                  </button>
                ))}
              </div>
            )}
          </InfoCard>

          {error && (
            <div style={{
              background: "var(--red-100)",
              border: "1px solid var(--red-border)",
              borderRadius: "var(--radius-sm)",
              padding: "14px 18px",
              fontSize: "13.5px",
              color: "var(--red-700)",
              fontWeight: 600,
              marginBottom: 20,
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Real-time Status Alert Banner */}
          {liveNotice && (
            <div className={styles.liveNoticeBanner} data-status={liveNotice.status}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "1.4rem" }}>
                  {liveNotice.status === "Accepted" ? "🎉" : liveNotice.status === "Rejected" ? "⚠️" : "⏳"}
                </span>
                <div>
                  <div style={{ fontWeight: 800, letterSpacing: "-0.01em" }}>
                    LIVE UPDATE: Application status updated to "{liveNotice.status}"
                  </div>
                  {liveNotice.reason ? (
                    <div style={{ marginTop: "3px", fontSize: "0.85rem", opacity: 0.9 }}>
                      Officer remarks: <em>"{liveNotice.reason}"</em>
                    </div>
                  ) : (
                    <div style={{ marginTop: "3px", fontSize: "0.85rem", opacity: 0.9 }}>
                      The reviewing officer has updated the status of your application in real-time.
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLiveNotice(null)}
                style={{
                  background: "rgba(0, 0, 0, 0.06)",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  color: "inherit",
                  fontWeight: 700,
                  fontSize: "12px",
                }}
                title="Dismiss notice"
              >
                Dismiss ✕
              </button>
            </div>
          )}

          {/* Live Complaint Details */}
          {complaint && (
            <InfoCard className={styles.trackingCard}>
              <div className={styles.liveHeader}>
                <div className={styles.liveTitleGroup}>
                  <span className={styles.complaintIdText}>#{complaint.complaint_id}</span>
                  <div className={styles.liveSyncTag}>
                    <span className={styles.liveSyncDot} />
                    <span>Real-Time Sync Active</span>
                  </div>
                  <Badge variant={STATUS_VARIANTS[complaint.status] || "blue"}>
                    {complaint.status.toUpperCase()}
                  </Badge>
                  {complaint.officer_override === 1 && (
                    <Badge variant="amber">OFFICER ROUTED</Badge>
                  )}
                </div>

                <button
                  type="button"
                  className={styles.refreshBtn}
                  onClick={() => fetchComplaint(complaint.complaint_id)}
                >
                  🔄 Refresh Status
                </button>
              </div>

              {/* Real-time SLA Countdown Widget */}
              {sla && (
                <div className={styles.slaWidget}>
                  <div className={styles.slaWidgetHeader}>
                    <div>
                      <div className={styles.slaWidgetTitle}>CITIZENS' CHARTER SLA GUARANTEE</div>
                      <div className={styles.slaClockText} style={sla.isOverdue ? { color: "#fca5a5" } : {}}>
                        ⏳ {sla.statusText}
                      </div>
                    </div>
                    <Badge variant={sla.isOverdue ? "red" : complaint.status === "Resolved" ? "green" : "amber"}>
                      TARGET: {complaint.sla_hours} HOURS
                    </Badge>
                  </div>

                  <div className={styles.slaBarContainer}>
                    <div
                      className={`${styles.slaBarFill} ${
                        sla.isOverdue
                          ? styles.slaBarFillRed
                          : sla.progressPercent > 75
                          ? styles.slaBarFillAmber
                          : ""
                      }`}
                      style={{ width: `${sla.progressPercent}%` }}
                    />
                  </div>

                  <div className={styles.slaWidgetFooter}>
                    <span>Filed: {new Date(complaint.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                    <span>Statutory Deadline: {sla.deadline}</span>
                  </div>
                </div>
              )}

              {/* Application Status Banner for Pending/Accepted/Rejected */}
              {(complaint.status === "Pending" || complaint.status === "Accepted" || complaint.status === "Rejected") && (
                <div style={{
                  padding: "16px 20px",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: 20,
                  border: "1px solid",
                  ...(complaint.status === "Pending" ? { background: "var(--amber-100)", borderColor: "var(--amber-border)", color: "var(--ink-900)" }
                    : complaint.status === "Accepted" ? { background: "var(--green-100)", borderColor: "var(--green-600)", color: "var(--green-700)" }
                    : { background: "var(--red-100)", borderColor: "var(--red-border)", color: "var(--red-700)" }),
                }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, marginBottom: 4 }}>
                    {complaint.status === "Pending" && "⏳ Application Under Review"}
                    {complaint.status === "Accepted" && "✓ Application Accepted"}
                    {complaint.status === "Rejected" && "✕ Application Rejected"}
                  </div>
                  <div style={{ fontSize: "13px", lineHeight: 1.5 }}>
                    {complaint.status === "Pending" && "Your grievance is currently under preliminary review by the Nodal Officer. You will be notified once a decision is made."}
                    {complaint.status === "Accepted" && "Your grievance has been accepted and dispatched to the responsible department for field action."}
                    {complaint.status === "Rejected" && (
                      <>
                        Your grievance application has been rejected by the reviewing officer.
                        {complaint.override_reason && (
                          <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(0,0,0,0.05)", borderRadius: 3, borderLeft: "3px solid var(--red-700)" }}>
                            <strong>Reason:</strong> {complaint.override_reason}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 5-Stage Interactive Milestone Stepper */}
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 16px" }}>
                Grievance Progression Timeline <span className="hi">(प्रगति विवरण)</span>
              </h3>

              <div className={styles.timeline}>
                {/* Stage 1: Filing & AI Intake */}
                <div className={`${styles.timelineItem} ${styles.timelineCompleted}`}>
                  <div className={styles.timelineMarker}>✓</div>
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineTitle}>1. Intake &amp; AI NLP Triage Completed</div>
                    <div className={styles.timelineDesc}>
                      Logged via public gateway. AI categorized issue as <strong>{complaint.category}</strong> with{" "}
                      <strong>{Math.round((complaint.confidence || 0) * 100)}%</strong> confidence.
                    </div>
                    <div className={styles.timelineMeta}>
                      Timestamp: {new Date(complaint.created_at).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                {/* Stage 2: Officer Review (Pending / Accepted / Rejected) */}
                <div className={`${styles.timelineItem} ${
                  complaint.status === "Pending" ? styles.timelineActive
                  : complaint.status === "Rejected" ? styles.timelineRejected
                  : ["Accepted", "In Progress", "Resolved", "Escalated", "Open"].includes(complaint.status) ? styles.timelineCompleted
                  : ""
                }`}>
                  <div className={styles.timelineMarker}>
                    {complaint.status === "Rejected" ? "✕"
                     : complaint.status === "Pending" ? "⏳"
                     : ["Accepted", "In Progress", "Resolved", "Escalated", "Open"].includes(complaint.status) ? "✓"
                     : "2"}
                  </div>
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineTitle}>2. Officer Review &amp; Verification</div>
                    <div className={styles.timelineDesc}>
                      {complaint.status === "Pending"
                        ? "Application is under preliminary review by the Nodal Officer. Awaiting administrative decision."
                        : complaint.status === "Accepted"
                        ? "Application verified and accepted by the Nodal Officer. Dispatched for department action."
                        : complaint.status === "Rejected"
                        ? "Application rejected by the reviewing officer. See reason below."
                        : "Officer review completed. Application forwarded to department."}
                    </div>
                    {complaint.status === "Rejected" && complaint.override_reason && (
                      <div style={{ marginTop: 6, padding: "8px 12px", background: "var(--red-100)", borderRadius: 3, borderLeft: "3px solid var(--red-700)", fontSize: "12px", color: "var(--red-700)" }}>
                        <strong>Rejection Reason:</strong> {complaint.override_reason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stage 3: Department Routing */}
                <div className={`${styles.timelineItem} ${
                  complaint.status === "Rejected" ? ""
                  : ["Accepted", "In Progress", "Resolved", "Escalated", "Open"].includes(complaint.status) ? styles.timelineCompleted
                  : ""
                }`}>
                  <div className={styles.timelineMarker}>
                    {complaint.status === "Rejected" ? "3" : ["Accepted", "In Progress", "Resolved", "Escalated", "Open"].includes(complaint.status) ? "✓" : "3"}
                  </div>
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineTitle}>3. Dispatched to Responsible Municipal Wing</div>
                    <div className={styles.timelineDesc}>
                      {complaint.status === "Rejected"
                        ? "Application was rejected — department dispatch skipped."
                        : <>Assigned to <strong>{complaint.department}</strong> under statutory Citizens' Charter SLA rules.</>}
                    </div>
                    {complaint.status !== "Rejected" && (
                      <div className={styles.timelineMeta}>
                        Mandated Resolution Window: {complaint.sla_hours} Hours Max
                      </div>
                    )}
                  </div>
                </div>

                {/* Stage 4: Casework & Field Inspection */}
                <div
                  className={`${styles.timelineItem} ${
                    complaint.status === "In Progress" || complaint.status === "Escalated"
                      ? styles.timelineActive
                      : complaint.status === "Resolved"
                      ? styles.timelineCompleted
                      : ""
                  }`}
                >
                  <div className={styles.timelineMarker}>
                    {complaint.status === "Resolved" ? "✓" : "4"}
                  </div>
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineTitle}>4. Nodal Officer Casework &amp; Field Inspection</div>
                    <div className={styles.timelineDesc}>
                      {complaint.status === "In Progress"
                        ? "Field engineering team has received the docket and is on-site or reviewing scheduled repairs."
                        : complaint.status === "Resolved"
                        ? "Field verification concluded. Redressal completed and signed off."
                        : complaint.status === "Escalated"
                        ? "Case escalated to Tier-2 Zonal Municipal Commissioner due to SLA threshold breach."
                        : complaint.status === "Rejected"
                        ? "Application was rejected — field inspection not applicable."
                        : "Queued at the Nodal Officer Desk for preliminary verification."}
                    </div>
                    {complaint.officer_override === 1 && complaint.status !== "Rejected" && (
                      <div style={{ marginTop: 6, padding: "8px 12px", background: "var(--amber-100)", borderRadius: 3, borderLeft: "3px solid var(--amber-600)", fontSize: "12px", color: "var(--ink-900)" }}>
                        <strong>Officer Note / Re-assignment:</strong> {complaint.override_reason || "Category reclassified by presiding officer."}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stage 5: Resolution & Redressal */}
                <div className={`${styles.timelineItem} ${complaint.status === "Resolved" ? styles.timelineCompleted : ""}`}>
                  <div className={styles.timelineMarker}>
                    {complaint.status === "Resolved" ? "✓" : "5"}
                  </div>
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineTitle}>5. Redressal Closure &amp; Verification</div>
                    <div className={styles.timelineDesc}>
                      {complaint.status === "Resolved"
                        ? "Issue resolved. Case closed in municipal database. Citizen feedback open."
                        : complaint.status === "Rejected"
                        ? "Application rejected — closure not applicable."
                        : "Awaiting final field closure report and citizen notification."}
                    </div>
                    {complaint.status === "Resolved" && (
                      <div className={styles.timelineMeta}>
                        Closed at: {new Date(complaint.updated_at).toLocaleString("en-IN")}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className={styles.detailGrid}>
                <div className={styles.detailTile}>
                  <div className={styles.detailLabel}>Assigned Department</div>
                  <div className={styles.detailVal}>{complaint.department}</div>
                </div>
                <div className={styles.detailTile}>
                  <div className={styles.detailLabel}>Classification</div>
                  <div className={styles.detailVal}>{complaint.category}</div>
                </div>
                <div className={styles.detailTile}>
                  <div className={styles.detailLabel}>Locality / Ward</div>
                  <div className={styles.detailVal}>{complaint.locality || "Ward 14"}</div>
                </div>
              </div>

              {/* Verbatim Citizen Complaint */}
              <div className={styles.quoteBlock}>
                <strong>Citizen Verbatim Submission:</strong> "{complaint.complaint_text}"
              </div>

              {/* Attached Evidence & "Open File" Feature */}
              {complaint.image_path ? (
                <div className={styles.evidenceCard}>
                  <div className={styles.evidenceHeader}>
                    <div className={styles.evidenceTitle}>
                      <span>📷</span>
                      <span>Attached Submission Evidence <span className="hi">(संलग्न प्रमाण)</span></span>
                    </div>
                    <button
                      type="button"
                      className={styles.openFileBtn}
                      onClick={() => setShowEvidenceModal(true)}
                    >
                      🔍 Open Attached File <span className="hi">(फ़ाइल खोलें)</span>
                    </button>
                  </div>

                  <div className={styles.evidenceBody}>
                    <div
                      className={styles.evidenceThumb}
                      style={
                        !complaint.image_path.toLowerCase().endsWith(".pdf")
                          ? { backgroundImage: `url(${complaint.image_path})` }
                          : { background: "#1c4f5e" }
                      }
                      onClick={() => setShowEvidenceModal(true)}
                      title="Click to expand file preview"
                    >
                      {complaint.image_path.toLowerCase().endsWith(".pdf") ? "📄" : ""}
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink-900)" }}>
                        {complaint.image_path.split("/").pop()}
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--ink-500)", marginTop: 2 }}>
                        Uploaded during grievance filing • Authenticated &amp; timestamped
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => setShowEvidenceModal(true)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--blue-700)",
                            fontSize: "12px",
                            fontWeight: 700,
                            padding: 0,
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          Click here to open and inspect evidence in full view →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: "12px 16px",
                  background: "var(--line-100)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px dashed var(--line-200)",
                  fontSize: "12.5px",
                  color: "var(--ink-500)",
                  marginBottom: 20,
                }}>
                  📎 No photo or evidence document was attached during filing.
                </div>
              )}

              {/* Action Toolbar */}
              <div className={styles.actionRow}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "12.5px", color: "var(--ink-500)" }}>
                  <input
                    type="checkbox"
                    id="autoRefreshCb"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                  <label htmlFor="autoRefreshCb" style={{ cursor: "pointer" }}>
                    Auto-refresh live status (every 15s)
                  </label>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className={styles.refreshBtn}
                    onClick={() => window.print()}
                  >
                    🖨 Print Grievance Slip
                  </button>
                  <Link href="/" className={citizenStyles.submitButton} style={{ textDecoration: "none" }}>
                    File New Grievance →
                  </Link>
                </div>
              </div>
            </InfoCard>
          )}

          {/* Modal to open the attached file */}
          {complaint && complaint.image_path && (
            <FilePreviewModal
              isOpen={showEvidenceModal}
              onClose={() => setShowEvidenceModal(false)}
              fileUrl={complaint.image_path}
              fileName={complaint.image_path.split("/").pop()}
              title={`Evidence Attachment — Grievance #${complaint.complaint_id}`}
            />
          )}
        </main>

        <aside className={citizenStyles.side}>
          <InfoCard icon="🛰" title="Live Telemetry Gateway">
            <p style={{ fontSize: "12.5px", color: "var(--ink-700)", lineHeight: 1.6, margin: "0 0 10px" }}>
              The portal communicates directly with municipal dispatch terminals across 5 core civic departments:
            </p>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: "12px", color: "var(--ink-500)", lineHeight: 1.7 }}>
              <li>Real-time timestamp synchronisation</li>
              <li>Direct push alerts to Field Inspectors</li>
              <li>Automated SLA countdown auditing</li>
            </ul>
          </InfoCard>

          <InfoCard icon="⚖" title="Statutory SLA Timelines">
            <div style={{ fontSize: "12px", color: "var(--ink-700)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line-200)" }}>
                <span>🗑 Waste Management</span><strong>24h</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line-200)" }}>
                <span>⚡ Electricity Outages</span><strong>24h</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line-200)" }}>
                <span>💧 Water Supply Leaks</span><strong>48h</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line-200)" }}>
                <span>💡 Street Lighting</span><strong>48h</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span>🛣 Potholes &amp; Roads</span><strong>72h</strong>
              </div>
            </div>
          </InfoCard>
        </aside>
      </div>
    </>
  );
}
