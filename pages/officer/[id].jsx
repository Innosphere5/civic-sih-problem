import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import TopUtilityBar from "../../components/TopUtilityBar";
import PortalHeader from "../../components/PortalHeader";
import NavTabs from "../../components/NavTabs";
import OfficerSidebar from "../../components/OfficerSidebar";
import Badge from "../../components/Badge";
import InfoCard from "../../components/InfoCard";
import FilePreviewModal from "../../components/FilePreviewModal";
import styles from "../../styles/Officer.module.css";

const CATEGORIES = [
  { value: "Roads", label: "Roads & Highways (PWD - Bitumen)" },
  { value: "Water Supply", label: "Water Supply (Jal Board)" },
  { value: "Electricity", label: "Electricity (State DISCOM)" },
  { value: "Waste Management", label: "Waste Management (Sanitation)" },
  { value: "Street Lighting", label: "Street Lighting (Electrical Maint.)" },
];

const DEPARTMENTS = [
  { value: "Public Works Department (PWD)", label: "Public Works Department - Sub-Division 3" },
  { value: "Jal Board / Water Department", label: "Jal Board / Water Department" },
  { value: "State DISCOM / Power Department", label: "State DISCOM / Power Department" },
  { value: "Municipal Sanitation Wing", label: "Municipal Sanitation Wing" },
  { value: "Electrical Maintenance Division", label: "Electrical Maintenance Division" },
];

const STATUS_BADGE = {
  Pending: "amber",
  Accepted: "green",
  Rejected: "red",
  Open: "blue",
  "In Progress": "blue",
  Resolved: "green",
  Escalated: "red",
};

export default function OfficerDetailView() {
  const router = useRouter();
  const { id } = router.query;

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Override form state
  const [overrideCategory, setOverrideCategory] = useState("");
  const [overrideDepartment, setOverrideDepartment] = useState("");
  const [status, setStatus] = useState("Open");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchComplaint();
  }, [id]);

  function fetchComplaint() {
    setLoading(true);
    fetch(`/api/complaints/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Complaint not found");
        return res.json();
      })
      .then((data) => {
        setComplaint(data);
        setOverrideCategory(data.category);
        setOverrideDepartment(data.department);
        setStatus(data.status);
        setReason(data.override_reason || "");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }

  async function handleSaveOverride() {
    setSaveMsg("");
    setSaveError("");

    const isCategoryChanged = overrideCategory !== complaint.category;
    const isDeptChanged = overrideDepartment !== complaint.department;
    const isStatusChanged = status !== complaint.status;

    if ((isCategoryChanged || isDeptChanged) && reason.trim().length < 20) {
      setSaveError("Override reason must be at least 20 characters when changing category or department.");
      return;
    }

    setSaving(true);
    try {
      const body = {};

      if (reason.trim()) {
        body.override_reason = reason.trim();
      }
      if (isCategoryChanged) {
        body.category = overrideCategory;
      }
      if (isDeptChanged && !isCategoryChanged) {
        body.department = overrideDepartment;
      }
      if (isStatusChanged) {
        body.status = status;
      }

      if (Object.keys(body).length === 0) {
        setSaveError("No changes were made.");
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/complaints/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setSaveError(data.error || "Failed to save updates.");
        setSaving(false);
        return;
      }

      setComplaint(data);
      setOverrideCategory(data.category);
      setOverrideDepartment(data.department);
      setStatus(data.status);
      setReason(data.override_reason || "");
      setSaveMsg("Casework updates saved successfully.");
      setSaving(false);

      if (typeof window !== "undefined" && window.BroadcastChannel) {
        try {
          const bc = new BroadcastChannel("civic_complaints_realtime");
          bc.postMessage({ type: "STATUS_UPDATE", complaint: data });
          bc.close();
        } catch (e) {}
      }
    } catch (err) {
      setSaveError("Network error — please try again.");
      setSaving(false);
    }
  }

  async function handleQuickStatus(newStatus) {
    setSaveMsg("");
    setSaveError("");

    if (newStatus === "Rejected" && (!reason || reason.trim().length < 5)) {
      setStatus("Rejected");
      setSaveError("Please provide a rejection reason below (minimum 5 characters) before marking as Rejected.");
      return;
    }

    setSaving(true);
    try {
      const body = { status: newStatus };
      if (reason.trim()) body.override_reason = reason.trim();
      if (overrideCategory !== complaint.category) body.category = overrideCategory;
      if (overrideDepartment !== complaint.department && !body.category) body.department = overrideDepartment;

      const res = await fetch(`/api/complaints/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Failed to update status.");
        setSaving(false);
        return;
      }

      setComplaint(data);
      setStatus(data.status);
      setOverrideCategory(data.category);
      setOverrideDepartment(data.department);
      setSaveMsg(`Application successfully marked as ${newStatus}.`);
      setSaving(false);

      if (typeof window !== "undefined" && window.BroadcastChannel) {
        try {
          const bc = new BroadcastChannel("civic_complaints_realtime");
          bc.postMessage({ type: "STATUS_UPDATE", complaint: data });
          bc.close();
        } catch (e) {}
      }
    } catch (err) {
      setSaveError("Network error — please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Head><title>Loading... — Officer Console</title></Head>
        <TopUtilityBar rightLabel="Administrative Casework Hub" />
        <PortalHeader />
        <NavTabs active="officer" badge={{ text: "CASEWORK LEVEL: NODAL TIER-1", variant: "outline" }} />
        <div className={styles.officerBody}>
          <OfficerSidebar />
          <main className={styles.main}>
            <p style={{ textAlign: "center", padding: 40, color: "var(--ink-500)" }}>Loading complaint...</p>
          </main>
        </div>
      </>
    );
  }

  if (error || !complaint) {
    return (
      <>
        <Head><title>Error — Officer Console</title></Head>
        <TopUtilityBar rightLabel="Administrative Casework Hub" />
        <PortalHeader />
        <NavTabs active="officer" badge={{ text: "CASEWORK LEVEL: NODAL TIER-1", variant: "outline" }} />
        <div className={styles.officerBody}>
          <OfficerSidebar />
          <main className={styles.main}>
            <p style={{ textAlign: "center", padding: 40, color: "var(--red-700)" }}>
              {error || "Complaint not found."}
            </p>
            <p style={{ textAlign: "center" }}>
              <Link href="/officer" style={{ color: "var(--blue-700)", fontWeight: 700 }}>← Back to Queue</Link>
            </p>
          </main>
        </div>
      </>
    );
  }

  const confidencePercent = Math.round((complaint.confidence || 0) * 100);
  const confidenceBadge = confidencePercent >= 80 ? "green" : confidencePercent >= 50 ? "amber" : "red";

  return (
    <>
      <Head>
        <title>Grievance #{complaint.complaint_id} — Officer Console</title>
      </Head>

      <TopUtilityBar rightLabel="Administrative Casework Hub" />
      <PortalHeader />
      <NavTabs active="officer" badge={{ text: "CASEWORK LEVEL: NODAL TIER-1", variant: "outline" }} />

      <div className={styles.officerBody}>
        <OfficerSidebar />

        <main className={styles.main}>
          <div className={styles.breadcrumb}>
            <Link href="/officer" style={{ color: "var(--ink-500)" }}>🏠 Officer Dashboard</Link>
            <span>›</span>
            <span>{complaint.department} <span className="hi">/ विभाग</span></span>
            <span>›</span>
            <strong>Grievance #{complaint.complaint_id}</strong>
          </div>

          <div className={styles.titleRow}>
            <Badge variant="amberOutline">#{complaint.complaint_id}</Badge>
            <Badge variant={STATUS_BADGE[complaint.status] || "gray"}>
              STATUS: {complaint.status.toUpperCase()}
            </Badge>
            {complaint.officer_override === 1 && (
              <Badge variant="amber">OFFICER OVERRIDE</Badge>
            )}
          </div>

          <h1 className={styles.title}>
            {complaint.complaint_text.length > 80
              ? complaint.complaint_text.substring(0, 80) + "..."
              : complaint.complaint_text}
          </h1>

          <div className={styles.summaryGrid}>
            <InfoCard title="Assigned Department">
              <div className={styles.summaryMain}>{complaint.department}</div>
              <div className={styles.summarySub}>Rules Engine Assignment</div>
            </InfoCard>
            <InfoCard title="AI Classification">
              <div className={styles.confidenceRow}>
                <span className={styles.confidenceValue}>{confidencePercent}%</span>
                <Badge variant={confidenceBadge}>
                  {confidencePercent >= 80 ? "HIGH" : confidencePercent >= 50 ? "MEDIUM" : "LOW"}
                </Badge>
              </div>
              <div className={styles.summarySub}>Category: {complaint.category}</div>
            </InfoCard>
            <InfoCard title={`SLA Target: ${complaint.sla_hours} hrs`}>
              <div className={styles.summaryMain}>{complaint.sla_hours} Hours</div>
              <div className={styles.summarySub}>Citizens' Charter Mandated</div>
            </InfoCard>
          </div>

          <div className={styles.twoCol}>
            <InfoCard
              icon="👤"
              title="Citizen Informant Profile"
              corner={<Badge variant="green">✓ VERIFIED</Badge>}
            >
              <div className={styles.fieldGrid2}>
                <div>
                  <div className={styles.fieldLabel}>Verified Contact</div>
                  <div className={styles.fieldValue}>{complaint.contact || "—"}</div>
                </div>
                <div>
                  <div className={styles.fieldLabel}>Locality</div>
                  <div className={styles.fieldValue}>{complaint.locality || "—"}</div>
                </div>
              </div>
              <div className={styles.fieldFull}>
                <div className={styles.fieldLabel}>Filed At</div>
                <div className={styles.fieldValue}>
                  {new Date(complaint.created_at).toLocaleString("en-IN", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </div>
              </div>
            </InfoCard>

            <InfoCard
              icon="🤖"
              title="Automated AI Triage & Predictive Assessment"
              corner={<Badge variant="blue">NLP ENGINE</Badge>}
            >
              <div className={styles.fieldGrid3}>
                <div>
                  <div className={styles.fieldLabel}>Primary Classification</div>
                  <div className={styles.fieldValue}>{complaint.category}</div>
                </div>
                <div>
                  <div className={styles.fieldLabel}>Confidence Score</div>
                  <div className={styles.confidenceRow}>
                    <span className={styles.confidenceValue}>{confidencePercent}%</span>
                    <Badge variant={confidenceBadge}>
                      {confidencePercent >= 80 ? "HIGH" : confidencePercent >= 50 ? "MEDIUM" : "LOW"}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className={styles.fieldLabel}>Mandated SLA Rule</div>
                  <div className={styles.fieldValue}>{complaint.sla_hours} Hours Max</div>
                </div>
              </div>
            </InfoCard>
          </div>

          <div className={styles.twoCol}>
            <InfoCard
              icon="📝"
              title="Original Complaint Filing"
              titleHi="(प्रस्तुत शिकायत)"
              corner={<Badge variant="gray">Portal Form</Badge>}
            >
              <div className={styles.quoteLabel}>Verbatim Citizen Submission</div>
              <blockquote className={styles.quote}>
                "{complaint.complaint_text}"
              </blockquote>

              {/* Citizen Attached Evidence */}
              {complaint.image_path ? (
                <div style={{
                  marginTop: 16,
                  padding: "12px 14px",
                  background: "var(--line-100)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line-200)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ink-900)" }}>
                      📷 Citizen Attached Evidence <span className="hi">(संलग्न प्रमाण)</span>
                    </span>
                    <Badge variant="green">VERIFIED UPLOAD</Badge>
                  </div>

                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <div
                      style={{
                        width: 80,
                        height: 60,
                        borderRadius: "var(--radius-sm)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundColor: "#17434f",
                        backgroundImage: !complaint.image_path.toLowerCase().endsWith(".pdf")
                          ? `url(${complaint.image_path})`
                          : "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: 22,
                        border: "1px solid var(--line-200)",
                      }}
                      onClick={() => setShowEvidenceModal(true)}
                      title="Click to open full file inspection"
                    >
                      {complaint.image_path.toLowerCase().endsWith(".pdf") ? "📄" : ""}
                    </div>
                    <div>
                      <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ink-900)" }}>
                        {complaint.image_path.split("/").pop()}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--ink-500)", marginTop: 2 }}>
                        Uploaded during initial grievance intake
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <button
                          type="button"
                          onClick={() => setShowEvidenceModal(true)}
                          style={{
                            background: "var(--paper)",
                            border: "1px solid var(--line-200)",
                            padding: "4px 10px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "11.5px",
                            fontWeight: 700,
                            color: "var(--blue-700)",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          🔍 Open &amp; Inspect File <span className="hi">(फ़ाइल खोलें)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  marginTop: 14,
                  padding: "8px 12px",
                  background: "var(--line-100)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                  color: "var(--ink-500)",
                }}>
                  📎 No photo or document attached by citizen.
                </div>
              )}
            </InfoCard>

            <InfoCard
              icon="🧭"
              title="Officer Verification & Action Desk"
              titleHi="(कार्यवाही एवं सुधार)"
              corner={<Badge variant="amber">OFFICER GATEKEEPER</Badge>}
            >
              <p className={styles.overrideDesc}>
                Update casework status or re-route misclassified jurisdictions.
              </p>

              {/* Quick Decision Action Bar */}
              <div style={{ marginBottom: 16 }}>
                <label className={styles.fieldLabel} style={{ marginBottom: 8 }}>
                  ⚡ Quick Decision Actions <span className="hi">(त्वरित प्रशासनिक निर्णय)</span>:
                </label>
                <div className={styles.actionButtonGroup}>
                  <button
                    type="button"
                    className={`${styles.btnDecision} ${styles.btnAccept}`}
                    onClick={() => handleQuickStatus("Accepted")}
                    disabled={saving}
                    title="Accept grievance and initiate statutory charter dispatch"
                  >
                    ✓ Accept Application <span className="hi">(स्वीकार)</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnDecision} ${styles.btnReject}`}
                    onClick={() => handleQuickStatus("Rejected")}
                    disabled={saving}
                    title="Reject grievance (requires reason below)"
                  >
                    ✕ Reject Application <span className="hi">(अस्वीकार)</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnDecision} ${styles.btnPending}`}
                    onClick={() => handleQuickStatus("Pending")}
                    disabled={saving}
                    title="Keep case under preliminary pending review"
                  >
                    ⏳ Mark as Pending <span className="hi">(लंबित)</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnDecision} ${styles.btnNeutral}`}
                    onClick={() => handleQuickStatus("In Progress")}
                    disabled={saving}
                    title="Mark field team active on ground"
                  >
                    ⚙ In Progress
                  </button>
                  <button
                    type="button"
                    className={`${styles.btnDecision} ${styles.btnNeutral}`}
                    onClick={() => handleQuickStatus("Resolved")}
                    disabled={saving}
                    title="Mark resolved and close case"
                  >
                    🎉 Mark Resolved
                  </button>
                </div>
              </div>

              {/* Status Selector */}
              <div style={{ marginBottom: 14 }}>
                <label className={styles.fieldLabel}>
                  Current Application Status <span className="hi">(वर्तमान स्थिति)</span>
                  <span className={styles.required}>*</span>
                </label>
                <select
                  className={styles.select}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ fontWeight: 700 }}
                >
                  <option value="Pending">Pending — Under Preliminary Triage / Review</option>
                  <option value="Accepted">Accepted — Approved &amp; Dispatched to Department</option>
                  <option value="Rejected">Rejected — Ineligible / Duplicate / Insufficient Details</option>
                  <option value="In Progress">In Progress — Field Team Deployed on Ground</option>
                  <option value="Resolved">Resolved — Redressal Completed &amp; Verified</option>
                  <option value="Escalated">Escalated — SLA Breached / Zonal Review</option>
                </select>
              </div>

              <div className={styles.fieldGrid2}>
                <div>
                  <label className={styles.fieldLabel}>
                    Correct Category <span className="hi">(सुधारित श्रेणी)</span>
                  </label>
                  <select
                    className={styles.select}
                    value={overrideCategory}
                    onChange={(e) => setOverrideCategory(e.target.value)}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={styles.fieldLabel}>
                    Re-assignment Department <span className="hi">(संबंधित विभाग)</span>
                  </label>
                  <select
                    className={styles.select}
                    value={overrideDepartment}
                    onChange={(e) => setOverrideDepartment(e.target.value)}
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.value} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className={styles.fieldLabel}>
                Reason for Category / Department Re-Assignment{" "}
                <span className="hi">(विभागीय औचित्य विवरण)</span>
                <span className={styles.required}>*</span>
              </label>
              <textarea
                className={styles.textarea}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className={styles.textareaFooter}>
                <span>Minimum 20 characters required. Logged with Digital Token ID.</span>
                <span>{reason.length} / 500 chars</span>
              </div>

              {saveError && (
                <div style={{
                  background: "var(--red-100)",
                  border: "1px solid var(--red-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 12px",
                  fontSize: "12.5px",
                  color: "var(--red-700)",
                  fontWeight: 600,
                  marginBottom: 12,
                }}>
                  ⚠ {saveError}
                </div>
              )}

              {saveMsg && (
                <div style={{
                  background: "var(--green-100)",
                  border: "1px solid var(--green-600)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 12px",
                  fontSize: "12.5px",
                  color: "var(--green-700)",
                  fontWeight: 600,
                  marginBottom: 12,
                }}>
                  ✓ {saveMsg}
                </div>
              )}

              <div className={styles.signOffRow}>
                <span className={styles.signOffOk}>✓ Authorized Officer: Rajesh Sharma, IAS (GOV-DL-8821)</span>
                <button
                  className={styles.saveButton}
                  onClick={handleSaveOverride}
                  disabled={saving}
                  style={saving ? { opacity: 0.7, cursor: "not-allowed" } : {}}
                >
                  {saving ? "Saving..." : "Save Override"}
                </button>
              </div>
            </InfoCard>
          </div>
        </main>
      </div>

      {complaint && complaint.image_path && (
        <FilePreviewModal
          isOpen={showEvidenceModal}
          onClose={() => setShowEvidenceModal(false)}
          fileUrl={complaint.image_path}
          fileName={complaint.image_path.split("/").pop()}
          title={`Citizen Attached Evidence — Case #${complaint.complaint_id}`}
        />
      )}
    </>
  );
}
