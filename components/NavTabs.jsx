import Link from "next/link";
import styles from "./NavTabs.module.css";

const ADMIN_TABS = [
  { key: "all", en: "Application Review Queue", hi: "समीक्षा कतार", href: "/" },
  { key: "Pending", en: "Pending Scrutiny", hi: "लंबित आवेदन", href: "/?status=Pending" },
  { key: "Accepted", en: "Accepted & Dispatched", hi: "स्वीकृत", href: "/?status=Accepted" },
  { key: "Rejected", en: "Declined & Rejected", hi: "अस्वीकृत", href: "/?status=Rejected" },
  { key: "analytics", en: "Casework Analytics", hi: "प्रशासनिक रिपोर्ट", href: "/?view=analytics" },
];

export default function NavTabs({ active, badge, counts }) {
  return (
    <div className={styles.bar}>
      <nav className={styles.tabs}>
        {ADMIN_TABS.map((tab) => {
          const count = counts ? counts[tab.key] : null;
          const isActive = active === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
            >
              {tab.en} <span className="hi">/ {tab.hi}</span>
              {typeof count === "number" && (
                <span
                  style={{
                    marginLeft: "6px",
                    padding: "2px 7px",
                    borderRadius: "10px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: isActive ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.08)",
                    color: isActive ? "#ffffff" : "inherit",
                  }}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      {badge ? (
        <span className={`${styles.badge} ${badge.variant === "solid" ? styles.badgeSolid : styles.badgeOutline}`}>
          {badge.text}
        </span>
      ) : null}
    </div>
  );
}
