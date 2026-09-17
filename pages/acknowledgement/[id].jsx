import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import TopUtilityBar from "../../components/TopUtilityBar";
import PortalHeader from "../../components/PortalHeader";
import NavTabs from "../../components/NavTabs";
import Badge from "../../components/Badge";
import InfoCard from "../../components/InfoCard";
import Stepper from "../../components/Stepper";
import styles from "../../styles/Acknowledgement.module.css";

export default function AcknowledgementPage() {
  const router = useRouter();
  const { id } = router.query;
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/complaints/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Complaint not found");
        return res.json();
      })
      .then((data) => {
        setComplaint(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  return (
    <>
      <Head>
        <title>
          {complaint ? `Acknowledgement #${complaint.complaint_id}` : "Acknowledgement"} — National Civic Grievance Portal
        </title>
      </Head>

      <TopUtilityBar rightLabel="State Municipal Administration" />
      <PortalHeader />
      <NavTabs active="citizen" badge={{ text: "COMPLAINT REGISTERED", variant: "solid" }} />

      <div className={styles.pageBody}>
        <main className={styles.main}>
          <Badge variant="green">✓ COMPLAINT SUCCESSFULLY FILED</Badge>

          <h1 className={styles.heading}>Acknowledgement Slip</h1>
          <p className={`hi ${styles.subheading}`}>
            प्राप्ति रसीद • Your complaint has been registered and routed to the responsible department.
          </p>

          <Stepper current={3} />

          {loading && (
            <InfoCard className={styles.slipCard}>
              <div className={styles.loadingWrap}>
                <div className={styles.loadingText}>Loading complaint details...</div>
              </div>
            </InfoCard>
          )}

          {error && (
            <InfoCard className={styles.slipCard}>
              <div className={styles.errorWrap}>
                <div className={styles.errorText}>{error}</div>
                <Link href="/" className={styles.retryLink}>← Return to Filing Form</Link>
              </div>
            </InfoCard>
          )}

          {complaint && (
            <InfoCard className={styles.slipCard}>
              <div className={styles.stepLabel}>
                STEP 3 OF 4 • ACKNOWLEDGEMENT SLIP
              </div>
              <h2 className={styles.slipTitle}>
                Complaint Registered <span className="hi">(शिकायत दर्ज)</span>
              </h2>
              <p className={styles.slipDesc}>
                Your complaint has been classified by our AI triage engine and assigned to the
                responsible municipal department.
              </p>

              <div className={styles.fieldGrid3}>
                <div>
                  <div className={styles.fieldLabel}>Complaint ID</div>
                  <div className={styles.complaintId}>#{complaint.complaint_id}</div>
                  <div className={styles.fieldNote}>Use this ID to track status</div>
                </div>
                <div>
                  <div className={styles.fieldLabel}>AI Classification</div>
                  <div className={styles.categoryBadge}>
                    <span className={styles.fieldValue}>{complaint.category}</span>
                    <Badge variant="green">
                      {Math.round((complaint.confidence || 0) * 100)}%
                    </Badge>
                  </div>
                  <div className={styles.fieldNote}>Automated NLP Triage</div>
                </div>
                <div>
                  <div className={styles.fieldLabel}>Status</div>
                  <Badge variant="blue">{complaint.status}</Badge>
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <div>
                  <div className={styles.fieldLabel}>Assigned Department</div>
                  <div className={styles.fieldValue}>{complaint.department}</div>
                  <div className={styles.fieldNote}>Routed via deterministic rules engine</div>
                </div>
                <div>
                  <div className={styles.fieldLabel}>SLA Target</div>
                  <div className={styles.slaValue}>{complaint.sla_hours} Hours</div>
                  <div className={styles.fieldNote}>Citizens' Charter guaranteed timeline</div>
                </div>
              </div>

              {complaint.acknowledgement && (
                <>
                  <div className={styles.fieldLabel}>Official Acknowledgement</div>
                  <div className={styles.ackBlock}>{complaint.acknowledgement}</div>
                </>
              )}

              <div className={styles.fieldGrid}>
                <div>
                  <div className={styles.fieldLabel}>Locality</div>
                  <div className={styles.fieldValue}>{complaint.locality || "—"}</div>
                </div>
                <div>
                  <div className={styles.fieldLabel}>Filed At</div>
                  <div className={styles.fieldValue}>
                    {new Date(complaint.created_at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              </div>

              <div className={styles.actionRow}>
                <div className={styles.trackNote}>
                  📋 Save your Complaint ID for future reference and tracking.
                </div>
                <Link href="/" className={styles.newButton}>
                  File Another Complaint <span className="hi">(नई शिकायत)</span> →
                </Link>
              </div>
            </InfoCard>
          )}
        </main>

        <aside className={styles.side}>
          <InfoCard icon="🛡" title="What Happens Next?">
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: "13px", color: "var(--ink-700)", lineHeight: 1.7 }}>
              <li>Your complaint is queued for the assigned department</li>
              <li>A nodal officer will review and take action within the SLA period</li>
              <li>You can track status using your complaint ID</li>
              <li>SMS / WhatsApp updates will be sent on status changes</li>
            </ul>
          </InfoCard>

          <InfoCard icon="⚖" title="Citizens' Charter SLAs">
            <p style={{ fontSize: "12.5px", color: "var(--ink-500)", margin: "0 0 8px" }}>
              Resolution timelines guaranteed under the Public Service Guarantee Act:
            </p>
            <div style={{ fontSize: "12.5px", color: "var(--ink-700)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line-200)" }}>
                <span>🗑 Waste Management</span><strong style={{ color: "var(--green-600)" }}>24 Hours</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line-200)" }}>
                <span>⚡ Electricity</span><strong style={{ color: "var(--green-600)" }}>24 Hours</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line-200)" }}>
                <span>💧 Water Supply</span><strong style={{ color: "var(--green-600)" }}>48 Hours</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line-200)" }}>
                <span>💡 Street Lighting</span><strong style={{ color: "var(--green-600)" }}>48 Hours</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                <span>🛣 Roads</span><strong style={{ color: "var(--green-600)" }}>72 Hours</strong>
              </div>
            </div>
          </InfoCard>
        </aside>
      </div>
    </>
  );
}
