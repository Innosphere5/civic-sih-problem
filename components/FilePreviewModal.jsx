import { useState, useEffect } from "react";
import styles from "./FilePreviewModal.module.css";

export default function FilePreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  title = "Citizen Evidence Submission",
}) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    // Reset zoom when fileUrl changes
    setZoom(1);
  }, [fileUrl]);

  if (!isOpen || !fileUrl) return null;

  const isPdf = fileUrl.toLowerCase().endsWith(".pdf");
  const displayName = fileName || fileUrl.split("/").pop() || "evidence-attachment";

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <span className={styles.headerIcon}>{isPdf ? "📄" : "📷"}</span>
            <h3 className={styles.title}>{title}</h3>
            <span className={styles.badge}>{isPdf ? "PDF Document" : "Image Evidence"}</span>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close Preview"
          >
            ✕
          </button>
        </div>

        <div className={styles.toolbar}>
          <span className={styles.fileName} title={displayName}>
            📎 {displayName}
          </span>
          <div className={styles.toolActions}>
            {!isPdf && (
              <>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  title="Zoom Out"
                >
                  🔍−
                </button>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={() => setZoom(1)}
                  title="Reset Zoom"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                  title="Zoom In"
                >
                  🔍+
                </button>
              </>
            )}
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.toolBtn}
              title="Open raw file in a new browser tab"
            >
              ↗ Open in New Window
            </a>
            <a
              href={fileUrl}
              download={displayName}
              className={styles.toolBtn}
              title="Download file to device"
            >
              ⬇ Download
            </a>
          </div>
        </div>

        <div className={styles.content}>
          {isPdf ? (
            <iframe
              src={fileUrl}
              title="PDF Evidence Viewer"
              className={styles.pdfFrame}
            />
          ) : (
            <img
              src={fileUrl}
              alt={displayName}
              className={styles.previewImage}
              style={{ transform: `scale(${zoom})` }}
            />
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.footerNote}>
            <span className={styles.footerOk}>✓ Geotag &amp; File Authenticated</span>
            <span>• Preserved under Civic Redressal Archive Rules</span>
          </div>
          <div>Press <kbd style={{ background: "var(--line-200)", padding: "2px 5px", borderRadius: 3 }}>ESC</kbd> to exit</div>
        </div>
      </div>
    </div>
  );
}
