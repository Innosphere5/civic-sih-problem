import styles from "./PortalHeader.module.css";

export default function PortalHeader() {
  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <span className={styles.emblem} aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dfe9ec" strokeWidth="1.4">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" />
          </svg>
        </span>
        <div>
          <div className={styles.title}>
            National Civic Grievance Redressal Portal{" "}
            <span className={`hi ${styles.titleHi}`}>/ प्रशासनिक कंसोल</span>
          </div>
          <div className={styles.subtitle}>
            DEPARTMENT OF ADMINISTRATIVE REFORMS &amp; PUBLIC GRIEVANCES
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.officerBlock}>
          <div className={styles.officerName}>Rajesh Sharma, IAS</div>
          <div className={styles.officerMeta}>
            <span className={styles.dot} /> Active Officer ID: GOV-DL-8821
          </div>
        </div>
        <span className={styles.wardBadge}>WARD 14</span>
        <span className={styles.avatar} aria-hidden="true">RS</span>
      </div>
    </div>
  );
}
