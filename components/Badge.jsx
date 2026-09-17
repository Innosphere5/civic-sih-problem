import styles from "./Badge.module.css";

/**
 * variant: "red" | "green" | "blue" | "amber" | "gray" | "amberOutline"
 */
export default function Badge({ variant = "gray", children, icon }) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {icon ? <span className={styles.icon}>{icon}</span> : null}
      {children}
    </span>
  );
}
