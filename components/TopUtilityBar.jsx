import styles from "./TopUtilityBar.module.css";

export default function TopUtilityBar({ rightLabel }) {
  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.emblemDot} aria-hidden="true" />
        <span>
          GOVERNMENT OF INDIA <span className="hi">/ भारत सरकार</span>
        </span>
        <span className={styles.divider}>|</span>
        <span className={styles.subLabel}>{rightLabel}</span>
      </div>
      <div className={styles.right}>
        <span className={styles.textSize}>A-</span>
        <span className={`${styles.textSize} ${styles.textSizeActive}`}>A</span>
        <span className={styles.textSize}>A+</span>
        <span className={styles.screenReader}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 3" />
          </svg>
          Screen Reader
        </span>
        <nav className={styles.langs} aria-label="Portal language">
          <a href="#" className={styles.langActive}>English</a>
          <span>|</span>
          <a href="#" className="hi">हिन्दी</a>
          <span>|</span>
          <a href="#">தமிழ்</a>
          <span>|</span>
          <a href="#">বাংলা</a>
        </nav>
      </div>
    </div>
  );
}
