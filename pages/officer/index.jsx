import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import TopUtilityBar from "../../components/TopUtilityBar";
import PortalHeader from "../../components/PortalHeader";
import NavTabs from "../../components/NavTabs";
import OfficerSidebar from "../../components/OfficerSidebar";
import Badge from "../../components/Badge";
import InfoCard from "../../components/InfoCard";
import styles from "../../styles/Officer.module.css";
import listStyles from "../../styles/OfficerList.module.css";

const STATUS_BADGE = {
  Open: "blue",
  "In Progress": "amber",
  Resolved: "green",
  Escalated: "red",
};

export default function OfficerListView() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => {
    fetchComplaints();
  }, [filterStatus, filterCategory]);

  function fetchComplaints() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterCategory) params.set("category", filterCategory);

    fetch(`/api/complaints?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setComplaints(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setComplaints([]);
        setLoading(false);
      });
  }

  const stats = {
    total: complaints.length,
    open: complaints.filter((c) => c.status === "Open").length,
    inProgress: complaints.filter((c) => c.status === "In Progress").length,
    escalated: complaints.filter((c) => c.status === "Escalated").length,
  };

  return (
    <>
      <Head>
        <title>Officer Dashboard — National Civic Grievance Portal</title>
      </Head>

      <TopUtilityBar rightLabel="Administrative Casework Hub" />
      <PortalHeader />
      <NavTabs active="officer" badge={{ text: "CASEWORK LEVEL: NODAL TIER-1", variant: "outline" }} />

      <div className={styles.officerBody}>
        <OfficerSidebar />

        <main className={styles.main}>
          <div className={styles.breadcrumb}>
            <span>🏠 Officer Dashboard</span>
            <span>›</span>
            <strong>Active Casework Queue</strong>
          </div>

          <h1 className={styles.title}>
            Grievance Queue <span className="hi">/ शिकायत कतार</span>
          </h1>

          {/* Stats row */}
          <div className={listStyles.statsRow}>
            <InfoCard>
              <div className={listStyles.statValue}>{stats.total}</div>
              <div className={listStyles.statLabel}>Total Complaints</div>
            </InfoCard>
            <InfoCard>
              <div className={listStyles.statValue}>{stats.open}</div>
              <div className={listStyles.statLabel}>Open</div>
            </InfoCard>
            <InfoCard>
              <div className={listStyles.statValue}>{stats.inProgress}</div>
              <div className={listStyles.statLabel}>In Progress</div>
            </InfoCard>
            <InfoCard>
              <div className={listStyles.statValue}>{stats.escalated}</div>
              <div className={listStyles.statLabel}>Escalated</div>
            </InfoCard>
          </div>

          <InfoCard className={listStyles.listCard}>
            <div className={listStyles.listHeader}>
              <h2 className={listStyles.listTitle}>
                All Complaints <span className="hi">(सभी शिकायतें)</span>
              </h2>
              <div className={listStyles.filterRow}>
                <select
                  className={listStyles.filterSelect}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Escalated">Escalated</option>
                </select>
                <select
                  className={listStyles.filterSelect}
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  <option value="Water Supply">Water Supply</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Roads">Roads</option>
                  <option value="Waste Management">Waste Management</option>
                  <option value="Street Lighting">Street Lighting</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className={listStyles.loadingState}>Loading complaints...</div>
            ) : complaints.length === 0 ? (
              <div className={listStyles.emptyState}>
                No complaints found. Citizens can file complaints from the{" "}
                <Link href="/" style={{ color: "var(--blue-700)", fontWeight: 700 }}>
                  Citizen Filing Flow
                </Link>.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className={listStyles.table}>
                  <thead>
                    <tr>
                      <th>Complaint ID</th>
                      <th>Category</th>
                      <th>Confidence</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Filed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr key={c.complaint_id}>
                        <td className={listStyles.idCell}>
                          <Link href={`/officer/${encodeURIComponent(c.complaint_id)}`} className={listStyles.idLink}>
                            #{c.complaint_id}
                          </Link>
                        </td>
                        <td>{c.category}</td>
                        <td className={listStyles.confidenceCell}>
                          {Math.round((c.confidence || 0) * 100)}%
                        </td>
                        <td className={listStyles.truncateText}>{c.department}</td>
                        <td>
                          <Badge variant={STATUS_BADGE[c.status] || "gray"}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className={listStyles.dateCell}>
                          {new Date(c.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </InfoCard>
        </main>
      </div>
    </>
  );
}
