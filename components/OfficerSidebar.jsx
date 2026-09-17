import styles from "./OfficerSidebar.module.css";

export default function OfficerSidebar() {
  return (
    <aside className={styles.sidebar}>
      <div>
        <div className={styles.sectionLabel}>Jurisdiction Queue</div>
        <nav className={styles.nav}>
          <a href="#" className={`${styles.navItem} ${styles.navItemActive}`}>
            <span className={styles.navIcon}>▤</span> Active Casework
          </a>
          <a href="#" className={styles.navItem}>
            <span className={styles.navIcon}>≣</span> Department Queues
          </a>
          <a href="#" className={`${styles.navItem} ${styles.navItemAlert}`}>
            <span className={styles.navIcon}>⚠</span> Escalated (Red Flag)
          </a>
          <a href="#" className={styles.navItem}>
            <span className={styles.navIcon}>▦</span> SLA &amp; Compliance
          </a>
        </nav>
      </div>

      <div>
        <div className={styles.sectionLabel}>Municipal Actions</div>
        <nav className={styles.nav}>
          <a href="#" className={styles.navItem}>
            <span className={styles.navIcon}>☑</span> Field Orders
          </a>
          <a href="#" className={styles.navItem}>
            <span className={styles.navIcon}>✉</span> Inter-Dept Notices
          </a>
        </nav>
      </div>

      <div className={styles.nodeBox}>
        <div className={styles.nodeTitle}>NIC Casework Node</div>
        <div className={styles.nodeLine}>Server: DL-NIC-04</div>
        <div className={styles.nodeSecure}>Encrypted e-Office v4.8</div>
      </div>
    </aside>
  );
}
