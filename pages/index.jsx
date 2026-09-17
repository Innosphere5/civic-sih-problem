import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";
import TopUtilityBar from "../components/TopUtilityBar";
import PortalHeader from "../components/PortalHeader";
import NavTabs from "../components/NavTabs";
import Badge from "../components/Badge";
import InfoCard from "../components/InfoCard";
import Stepper from "../components/Stepper";
import styles from "../styles/Citizen.module.css";

const CHARTER = [
  { icon: "🗑", en: "Garbage & Dead Animals", hrs: "24 Hours" },
  { icon: "💧", en: "Water Contamination / Burst", hrs: "12 Hours" },
  { icon: "💡", en: "Streetlight Failure", hrs: "48 Hours" },
  { icon: "🛣", en: "Pothole Emergency Fill", hrs: "72 Hours" },
];

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function CitizenFilingFlow() {
  const router = useRouter();
  const [complaintText, setComplaintText] = useState("");
  const [locality, setLocality] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const wordCount = countWords(complaintText);
  const isWordCountOk = wordCount >= 15;

  async function handleSubmit() {
    setError("");

    if (!complaintText.trim()) {
      setError("Please describe your complaint.");
      return;
    }
    if (!isWordCountOk) {
      setError("Complaint must be at least 15 words for proper triage.");
      return;
    }
    if (!locality.trim()) {
      setError("Please enter your locality / landmark.");
      return;
    }
    if (!contact.trim()) {
      setError("Please enter your contact number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint_text: complaintText,
          locality: locality,
          contact: contact,
          language: "en",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Navigate to acknowledgement page
      router.push(`/acknowledgement/${encodeURIComponent(data.complaint_id)}`);
    } catch (err) {
      setError("Couldn't process your complaint — please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Citizen Filing Flow — National Civic Grievance Redressal Portal</title>
      </Head>

      <TopUtilityBar rightLabel="State Municipal Administration" />
      <PortalHeader />
      <NavTabs active="citizen" badge={{ text: "LIVE CASEWORK ACTIVE", variant: "solid" }} />

      <div className={styles.infoStrip}>
        <span className={styles.infoIcon}>ⓘ</span>
        <span>
          Official Citizen Service of Municipal Administration &amp; Public Grievance
          Directorate&nbsp;•&nbsp;Zero filing fee&nbsp;•&nbsp;No middlemen required{" "}
          <span className="hi">(निःशुल्क नागरिक सेवा)</span>
        </span>
        <span className={styles.infoSpacer} />
        <span className={styles.langToggleLabel}>Portal Language:</span>
        <div className={styles.langToggle}>
          <button className={styles.langActive}>English</button>
          <button className="hi">हिन्दी</button>
          <button>தமிழ்</button>
          <button>বাংলা</button>
        </div>
      </div>

      <div className={styles.pageBody}>
        <main className={styles.main}>
          <Badge variant="blue">PUBLIC GRIEVANCE REDRESSAL MECHANISM • WARD 14</Badge>

          <h1 className={styles.heading}>Citizen Grievance Filing &amp; Live Tracking Suite</h1>
          <p className={`hi ${styles.subheading}`}>
            नागरिक शिकायत निवारण मंच • Simple, transparent civic casework escalation under
            statutory Citizen Charter SLAs.
          </p>

          <Stepper current={1} />

          <InfoCard className={styles.formCard}>
            <div className={styles.stepLabel}>
              STEP 1 OF 4 • CITIZEN INGESTION
            </div>
            <h2 className={styles.formTitle}>
              Submit a Civic Grievance <span className="hi">(नागरिक समस्या दर्ज करें)</span>
            </h2>
            <p className={styles.formDesc}>
              Describe your issue in plain words in any language. Our automated triage will
              route it to the responsible municipal department immediately.
            </p>

            <label className={styles.fieldLabel}>
              Describe the issue in your own words{" "}
              <span className="hi">(कम से कम 15 शब्द)</span>:
              <span className={styles.required}>*</span>
            </label>
            <div className={styles.textareaWrap}>
              <button className={styles.micButton} type="button">
                🎙 Speak in Hindi or English <span className="hi">(बोलकर लिखें)</span>
              </button>
              <textarea
                className={styles.textarea}
                rows={4}
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                placeholder="e.g. Garbage has not been collected for five days in Sector 12. Overflowing community bins are causing foul smell..."
              />
              <div className={styles.wordCountRow}>
                <span>Minimum 15 words required for natural language triage</span>
                <span className={isWordCountOk ? styles.wordCountGood : undefined}>
                  {wordCount} words {isWordCountOk ? "(Good clarity)" : ""}
                </span>
              </div>
            </div>

            <div className={styles.fieldGrid}>
              <div>
                <label className={styles.fieldLabel}>
                  Locality / Landmark <span className="hi">(इलाका / सीमा चिन्ह)</span>
                  <span className={styles.required}>*</span>
                </label>
                <div className={styles.inputWithIcon}>
                  <span>📍</span>
                  <input
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    placeholder="e.g. Sector 12, Near Community Center, Ward 14"
                  />
                </div>
                <div className={styles.helperText}>Automatic GIS Ward 14 Mapping Enabled</div>
              </div>

              <div>
                <label className={styles.fieldLabel}>
                  Citizen Contact <span className="hi">(सत्यापित संपर्क सूत्र)</span>
                  <span className={styles.required}>*</span>
                </label>
                <div className={styles.inputWithIcon}>
                  <span>📱</span>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="e.g. 98765-43210"
                  />
                </div>
                <div className={styles.helperOk}>✓ SMS &amp; WhatsApp Notifications Linked</div>
              </div>
            </div>

            <label className={styles.fieldLabel}>
              Upload Photo of Problem{" "}
              <span className="hi">(वैकल्पिक फोटो संलग्न करें)</span> — Max 5MB
            </label>
            <div className={styles.uploadRow}>
              <div className={styles.uploadTile}>
                <span className={styles.uploadIcon}>📷</span>
                <div>
                  <div className={styles.uploadTitle}>Tap to snap or choose from gallery</div>
                  <div className={styles.uploadHint}>
                    JPEG, PNG, HEIC formats. Geotagging extracted automatically.
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div style={{
                background: "var(--red-100)",
                border: "1px solid var(--red-border)",
                borderRadius: "var(--radius-sm)",
                padding: "10px 14px",
                fontSize: "13px",
                color: "var(--red-700)",
                fontWeight: 600,
                marginBottom: 16,
              }}>
                ⚠ {error}
              </div>
            )}

            <div className={styles.submitRow}>
              <div className={styles.aiNote}>
                ⚡ Automated Natural Language AI Triage processes complaints in &lt; 2 seconds.
              </div>
              <button
                className={styles.submitButton}
                onClick={handleSubmit}
                disabled={loading}
                style={loading ? { opacity: 0.7, cursor: "not-allowed" } : {}}
              >
                {loading
                  ? "Processing..."
                  : <>Proceed to Review <span className="hi">(आगे बढ़ें)</span> →</>
                }
              </button>
            </div>
          </InfoCard>
        </main>

        <aside className={styles.side}>
          <InfoCard icon="🛡" title="Citizen Session Verified" className={styles.sessionCard}>
            <div className={styles.sessionName}>Meera Sharma</div>
            <div className={styles.sessionMobile}>Mobile +91 98765-XXXXX</div>
          </InfoCard>

          <InfoCard icon="🏛" title="Ward Authority Desk" corner={<Badge variant="gray">WARD 14</Badge>}>
            <div className={styles.officerRow}>
              <span className={styles.officerAvatar}>RS</span>
              <div>
                <div className={styles.officerName}>Rajesh Sharma, IAS</div>
                <div className={styles.officerTitle}>Zonal Municipal Commissioner</div>
              </div>
            </div>
            <dl className={styles.deskList}>
              <div>
                <dt>Office Location:</dt>
                <dd>Civic Centre, Zone 4 HQ</dd>
              </div>
              <div>
                <dt>Public Hearing Hours:</dt>
                <dd>10 AM – 1 PM</dd>
              </div>
              <div>
                <dt>Escalation Threshold:</dt>
                <dd className={styles.escalationLink}>Tier 2 Supervisor</dd>
              </div>
            </dl>
          </InfoCard>

          <InfoCard icon="⚖" title="Citizens' Charter SLAs">
            <p className={styles.charterIntro}>
              Guaranteed administrative timelines prescribed under the Public Service
              Guarantee Act:
            </p>
            <ul className={styles.charterList}>
              {CHARTER.map((item) => (
                <li key={item.en}>
                  <span>
                    <span className={styles.charterIcon}>{item.icon}</span> {item.en}
                  </span>
                  <strong>{item.hrs}</strong>
                </li>
              ))}
            </ul>
            <a href="#" className={styles.charterLink}>
              View Full Citizens' Charter Gazette (PDF) ↗
            </a>
          </InfoCard>

          <div className={styles.emergencyCard}>
            <div className={styles.emergencyLabel}>EMERGENCY ESCALATION NOTICE</div>
            <div className={styles.emergencyTitle}>Life or Hazard Hazards?</div>
            <p className={styles.emergencyText}>
              For active sewer collapses, live electrical wires, or road cave-ins, do not
              wait for standard ticketing. Contact the 24×7 Quick Response Team.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
