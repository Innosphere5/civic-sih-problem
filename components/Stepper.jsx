import styles from "./Stepper.module.css";

const STEPS = [
  { n: 1, en: "Submit Complaint", hi: "शिकायत दर्ज करें" },
  { n: 2, en: "AI Classification Review", hi: "एआई वर्गीकरण समीक्षा" },
  { n: 3, en: "Acknowledgement Slip", hi: "प्राप्ति रसीद" },
  { n: 4, en: "Track Live Status", hi: "शिकायत की स्थिति" },
];

export default function Stepper({ current = 1 }) {
  return (
    <div className={styles.stepper}>
      {STEPS.map((step) => (
        <div
          key={step.n}
          className={`${styles.step} ${step.n === current ? styles.stepActive : ""}`}
        >
          <span className={styles.stepNum}>{step.n}</span>
          <span className={styles.stepText}>
            <span className={styles.stepEn}>
              {step.n}. {step.en}
            </span>
            <span className={`hi ${styles.stepHi}`}>{step.hi}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
