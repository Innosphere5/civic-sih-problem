import { useState } from "react";
import styles from "./DeclineReasonModal.module.css";

const STANDARD_REASONS = [
  {
    label: "Jurisdiction Mismatch (Transferred to external agency)",
    template: "Outside Municipal Authority Jurisdiction: This grievance pertains to central/state highway authorities or private housing society and has been transferred/closed.",
  },
  {
    label: "Incomplete Address or Unverifiable Location",
    template: "Incomplete / Unverifiable Location: The site address provided lacks landmark details or specific ward coordinates. Please re-file with precise location details.",
  },
  {
    label: "Duplicate Grievance Previously Registered",
    template: "Duplicate Application: An identical grievance for this location is already registered and currently assigned to the zonal field engineer.",
  },
  {
    label: "Private Property / Commercial Dispute",
    template: "Private / Civil Dispute: Municipal service charter covers public municipal property only. Internal private property disputes cannot be redressed.",
  },
  {
    label: "Missing / Inconclusive Evidence",
    template: "Insufficient Evidence: The attached document/photo is inconclusive or absent to substantiate an emergency intervention.",
  },
  {
    label: "Other (Custom Officer Reason)",
    template: "",
  },
];

export default function DeclineReasonModal({
  isOpen,
  onClose,
  target, // either { id: string } or { count: number, ids: string[] }
  onConfirm,
}) {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customReason, setCustomReason] = useState(STANDARD_REASONS[0].template);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const isBatch = target && target.count > 1;
  const targetLabel = isBatch
    ? `Batch: ${target.count} Applications`
    : `Application #${target?.id || ""}`;

  function handlePresetChange(idx) {
    setSelectedPreset(idx);
    const chosen = STANDARD_REASONS[idx];
    if (chosen.template) {
      setCustomReason(chosen.template);
    } else {
      setCustomReason("");
    }
    setError("");
  }

  async function handleConfirm() {
    if (!customReason || customReason.trim().length < 5) {
      setError("Please provide a valid reason (minimum 5 characters).");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onConfirm(customReason.trim());
      onClose();
    } catch (err) {
      setError(err.message || "Failed to decline application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.dangerIcon}>✕</div>
            <div>
              <h3 className={styles.title}>Decline Application</h3>
              <div className={styles.targetBadge}>{targetLabel}</div>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.alertBox}>
            ⚠️ <strong>Administrative Transparency Rule:</strong> Declining an application terminates active casework. The justification recorded here will be logged in the public audit ledger and displayed to the applicant.
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Standard Adjudication Reason</label>
            <select
              className={styles.select}
              value={selectedPreset}
              onChange={(e) => handlePresetChange(Number(e.target.value))}
            >
              {STANDARD_REASONS.map((r, i) => (
                <option key={i} value={i}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Official Decline Reason / Audit Remarks</label>
            <textarea
              className={styles.textarea}
              value={customReason}
              onChange={(e) => {
                setCustomReason(e.target.value);
                if (error) setError("");
              }}
              placeholder="Provide clear rationale for why this application is being declined..."
              rows={4}
            />
            <div className={styles.charHelp}>
              <span>Min. 5 characters required</span>
              <span>{customReason.length} characters</span>
            </div>
          </div>

          {error && <div className={styles.errorMsg}>⚠️ {error}</div>}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnDecline}
            onClick={handleConfirm}
            disabled={submitting || customReason.trim().length < 5}
          >
            {submitting ? "Processing..." : "Confirm & Decline"}
          </button>
        </div>
      </div>
    </div>
  );
}
