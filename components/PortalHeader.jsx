import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "./PortalHeader.module.css";

export default function PortalHeader({ admin: initialAdmin }) {
  const router = useRouter();
  const [admin, setAdmin] = useState(initialAdmin || null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Fetch active admin if not provided via props
  useEffect(() => {
    if (initialAdmin) {
      setAdmin(initialAdmin);
      return;
    }

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.admin) {
          setAdmin(data.admin);
        }
      })
      .catch(() => {});
  }, [initialAdmin]);

  // Click outside to close menu
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}
    setAdmin(null);
    router.push("/admin/login");
  }

  // Default fallback details if viewing in public/unauthenticated mode
  const displayName = admin ? admin.full_name : "Dr. Rajesh Sharma, IAS";
  const displayRole = admin ? admin.designation : "Nodal Casework Officer";
  const displayBadge = admin ? admin.badge_number : "GOV-DL-8821";
  const displayInitials = admin ? admin.avatar_initials : "RS";

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.left} style={{ textDecoration: "none", color: "inherit" }}>
        <span className={styles.emblem} aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dfe9ec" strokeWidth="1.4">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" />
          </svg>
        </span>
        <div>
          <div className={styles.title}>
            National Civic Grievance Portal — Admin Command Center{" "}
            <span className={`hi ${styles.titleHi}`}>/ केंद्रीय प्रशासनिक कंसोल</span>
          </div>
          <div className={styles.subtitle}>
            DEPARTMENT OF ADMINISTRATIVE REFORMS &amp; PUBLIC GRIEVANCES • GOVT. OF INDIA
          </div>
        </div>
      </Link>

      <div className={styles.right}>
        {/* Supabase status badge */}
        <span className={styles.cloudSyncBadge} title="Authenticated with Supabase Cloud Service">
          <span style={{ color: "#2ed573" }}>●</span> Supabase Cloud
        </span>

        <span className={styles.wardBadge}>ALL WARDS</span>

        {/* Profile and interactive dropdown */}
        <div className={styles.accountMenuWrapper} ref={menuRef}>
          <button
            type="button"
            className={styles.profileTriggerBtn}
            onClick={() => setMenuOpen(!menuOpen)}
            title="Click to view officer credentials and session options"
          >
            <div className={styles.officerBlock}>
              <div className={styles.officerName}>{displayName}</div>
              <div className={styles.officerMeta}>
                <span className={styles.dot} /> {displayRole} • ID: {displayBadge}
              </div>
            </div>
            <span className={styles.avatar} aria-hidden="true">
              {displayInitials}
            </span>
          </button>

          {menuOpen && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownHeader}>
                <div className={styles.dropdownOfficerName}>{displayName}</div>
                <div className={styles.dropdownOfficerRole}>{displayRole}</div>
                <div className={styles.dropdownBadgeId}>
                  Badge: {displayBadge} • {admin?.node_id || "DL-CENTRAL-01"}
                </div>
              </div>

              <div className={styles.dropdownActions}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/admin/login");
                  }}
                >
                  <span>🔄</span>
                  <span>Switch Officer Account</span>
                </button>

                <button
                  type="button"
                  className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                  onClick={handleLogout}
                >
                  <span>🚪</span>
                  <span>Secure Officer Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
