import styles from "./InfoCard.module.css";

export default function InfoCard({ icon, title, titleHi, corner, children, className = "" }) {
  return (
    <section className={`${styles.card} ${className}`}>
      {(title || corner) && (
        <header className={styles.cardHead}>
          <div className={styles.titleRow}>
            {icon ? <span className={styles.icon}>{icon}</span> : null}
            <h3 className={styles.title}>
              {title} {titleHi ? <span className="hi">{titleHi}</span> : null}
            </h3>
          </div>
          {corner}
        </header>
      )}
      <div className={styles.body}>{children}</div>
    </section>
  );
}
