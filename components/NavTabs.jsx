import Link from "next/link";
import styles from "./NavTabs.module.css";

const TABS = [
  { key: "officer", en: "Officer Console", hi: "डैशबोर्ड", href: "/officer" },
  { key: "citizen", en: "Citizen Filing Flow", hi: "नागरिक पोर्टल", href: "/" },
  { key: "queue", en: "Department Queue", hi: "विभाग ट्रैकर", href: "#" },
  { key: "audit", en: "Audit & SLA Reports", hi: "एसएलए रिपोर्ट", href: "#" },
];

export default function NavTabs({ active, badge }) {
  return (
    <div className={styles.bar}>
      <nav className={styles.tabs}>
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`${styles.tab} ${active === tab.key ? styles.tabActive : ""}`}
          >
            {tab.en} <span className="hi">/ {tab.hi}</span>
          </Link>
        ))}
      </nav>
      {badge ? (
        <span className={`${styles.badge} ${badge.variant === "solid" ? styles.badgeSolid : styles.badgeOutline}`}>
          {badge.text}
        </span>
      ) : null}
    </div>
  );
}
