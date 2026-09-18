import styles from "./OfficerSidebar.module.css";

export default function OfficerSidebar({
  currentStatus = "",
  onSelectStatus,
  counts = {},
  onExportCSV,
  onSeedData,
  currentView = "table",
  onSelectView,
  admin,
  onLogout,
}) {
  return (
    <aside className={styles.sidebar}>

      <div>
        <div className={styles.sectionLabel}>Administrative Queues</div>
        <nav className={styles.nav}>
          <button
            type="button"
            onClick={() => {
              if (onSelectView) onSelectView("table");
              if (onSelectStatus) onSelectStatus("");
            }}
            className={`${styles.navItem} ${currentView === "table" && currentStatus === "" ? styles.navItemActive : ""}`}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none" }}
          >
            <span className={styles.navIcon}>▤</span>
            <span style={{ flex: 1 }}>All Applications</span>
            {counts.total !== undefined && (
              <span className={styles.countBadge}>{counts.total}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (onSelectView) onSelectView("table");
              if (onSelectStatus) onSelectStatus("Pending");
            }}
            className={`${styles.navItem} ${currentView === "table" && currentStatus === "Pending" ? styles.navItemActive : ""}`}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none" }}
          >
            <span className={styles.navIcon}>⏳</span>
            <span style={{ flex: 1 }}>Pending Scrutiny</span>
            {counts.pending !== undefined && (
              <span className={`${styles.countBadge} ${counts.pending > 0 ? styles.countAmber : ""}`}>
                {counts.pending}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (onSelectView) onSelectView("table");
              if (onSelectStatus) onSelectStatus("Accepted");
            }}
            className={`${styles.navItem} ${currentView === "table" && currentStatus === "Accepted" ? styles.navItemActive : ""}`}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none" }}
          >
            <span className={styles.navIcon}>✓</span>
            <span style={{ flex: 1 }}>Accepted / Dispatched</span>
            {counts.accepted !== undefined && (
              <span className={`${styles.countBadge} ${styles.countGreen}`}>
                {counts.accepted}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (onSelectView) onSelectView("table");
              if (onSelectStatus) onSelectStatus("Rejected");
            }}
            className={`${styles.navItem} ${currentView === "table" && currentStatus === "Rejected" ? styles.navItemActive : ""}`}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none" }}
          >
            <span className={styles.navIcon}>✕</span>
            <span style={{ flex: 1 }}>Declined / Rejected</span>
            {counts.rejected !== undefined && (
              <span className={`${styles.countBadge} ${styles.countRed}`}>
                {counts.rejected}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (onSelectView) onSelectView("table");
              if (onSelectStatus) onSelectStatus("In Progress");
            }}
            className={`${styles.navItem} ${currentView === "table" && currentStatus === "In Progress" ? styles.navItemActive : ""}`}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none" }}
          >
            <span className={styles.navIcon}>⚙️</span>
            <span style={{ flex: 1 }}>In Progress</span>
            {counts.inProgress !== undefined && (
              <span className={styles.countBadge}>{counts.inProgress}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (onSelectView) onSelectView("analytics");
            }}
            className={`${styles.navItem} ${currentView === "analytics" ? styles.navItemActive : ""}`}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none" }}
          >
            <span className={styles.navIcon}>📊</span>
            <span style={{ flex: 1 }}>Casework Analytics</span>
          </button>
        </nav>
      </div>

      <div>
        <div className={styles.sectionLabel}>Admin Tools &amp; Actions</div>
        <nav className={styles.nav}>
          {onExportCSV && (
            <button
              type="button"
              onClick={onExportCSV}
              className={styles.navItem}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none" }}
              title="Download filtered casework as CSV spreadsheet"
            >
              <span className={styles.navIcon}>📥</span> Export CSV Ledger
            </button>
          )}
          {onSeedData && (
            <button
              type="button"
              onClick={onSeedData}
              className={styles.navItem}
              style={{ width: "100%", textAlign: "left", background: "none", border: "none" }}
              title="Add realistic demo complaints to test review workflows"
            >
              <span className={styles.navIcon}>⚡</span> Populate Sample Cases
            </button>
          )}
        </nav>
      </div>

      <div className={styles.nodeBox}>
        <div className={styles.nodeTitle}>NIC Casework Node</div>
        <div className={styles.nodeLine}>Node: {admin?.node_id || "DL-CENTRAL-01"}</div>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#17434f", margin: "4px 0 2px" }}>
          {admin?.full_name || "Dr. Rajesh Sharma, IAS"}
        </div>
        <div style={{ fontSize: "10px", color: "var(--ink-500)" }}>
          Badge: {admin?.badge_number || "GOV-DL-8821"}
        </div>
        <div className={styles.nodeSecure} style={{ marginTop: "6px" }}>
          <span style={{ color: "#256b3b" }}>●</span> Supabase Cloud: Sync
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            style={{
              marginTop: "8px",
              width: "100%",
              padding: "4px 8px",
              fontSize: "11px",
              fontWeight: 700,
              background: "#ffffff",
              color: "#b3412c",
              border: "1px solid #eec3ba",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            🚪 Sign Out Session
          </button>
        )}
      </div>
    </aside>
  );
}

