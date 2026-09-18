import Head from "next/head";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import styles from "../../styles/AdminLogin.module.css";

const CAPTCHA_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateRandomCode(length = 5) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CAPTCHA_CHARS.charAt(Math.floor(Math.random() * CAPTCHA_CHARS.length));
  }
  return result;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [captchaCode, setCaptchaCode] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [sysStatus, setSysStatus] = useState({
    checked: false,
    supabaseConnected: true,
    node: "DL-CENTRAL-01",
  });

  const canvasRef = useRef(null);

  // Dynamic Canvas CAPTCHA drawing function
  const drawCaptcha = useCallback((code) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#f4f7f8");
    bgGrad.addColorStop(0.5, "#e7eef0");
    bgGrad.addColorStop(1, "#f4f7f8");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Random noise dots
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 1.5,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, 0.3)`;
      ctx.fill();
    }

    // Curved interference / security lines
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * width * 0.2, Math.random() * height);
      ctx.bezierCurveTo(
        Math.random() * width,
        Math.random() * height,
        Math.random() * width,
        Math.random() * height,
        width * 0.8 + Math.random() * width * 0.2,
        Math.random() * height
      );
      ctx.strokeStyle = i % 2 === 0 ? "rgba(23, 90, 114, 0.45)" : "rgba(217, 138, 29, 0.45)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // Draw individual characters with rotation and distortion
    const charList = code.split("");
    const charSpacing = width / (charList.length + 1);

    charList.forEach((char, index) => {
      ctx.save();
      const x = (index + 1) * charSpacing;
      const y = height / 2 + 5 + (Math.random() * 6 - 3);
      const angle = (Math.random() * 28 - 14) * (Math.PI / 180);

      ctx.translate(x, y);
      ctx.rotate(angle);

      // Color variation
      const colors = ["#0d2733", "#17434f", "#1c4f5e", "#1b3a4b", "#091a22"];
      ctx.fillStyle = colors[index % colors.length];
      ctx.font = "bold 20px 'Courier New', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Slight shadow for depth
      ctx.shadowColor = "rgba(0,0,0,0.15)";
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillText(char, 0, 0);
      ctx.restore();
    });
  }, []);

  // Generate new dynamic CAPTCHA
  const refreshCaptcha = useCallback(() => {
    const newCode = generateRandomCode(5);
    setCaptchaCode(newCode);
    setCaptchaInput("");
    setTimeout(() => drawCaptcha(newCode), 20);
  }, [drawCaptcha]);

  // Initialize on mount
  useEffect(() => {
    refreshCaptcha();

    // Check system status
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        setSysStatus({
          checked: true,
          supabaseConnected: data.supabaseConnected !== false,
          node: "DL-CENTRAL-01",
        });
      })
      .catch(() => {
        setSysStatus({ checked: true, supabaseConnected: true, node: "DL-CENTRAL-01" });
      });
  }, [refreshCaptcha]);

  // Audio CAPTCHA reader for accessibility
  function handleSpeakCaptcha() {
    if (typeof window !== "undefined" && "speechSynthesis" in window && captchaCode) {
      window.speechSynthesis.cancel();
      const spoken = captchaCode.split("").join(" . ");
      const utterance = new SpeechSynthesisUtterance(`Verification code is: ${spoken}`);
      utterance.rate = 0.75;
      window.speechSynthesis.speak(utterance);
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please enter both Officer Identity (Username) and Security Password.");
      return;
    }

    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setErrorMsg("Invalid Security Verification Code (CAPTCHA). Please enter the characters shown.");
      refreshCaptcha();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Authentication failed. Verify your credentials.");
        setLoading(false);
        refreshCaptcha();
        return;
      }

      // Successful login redirect
      const returnUrl = router.query.returnUrl || "/";
      router.push(returnUrl);
    } catch (err) {
      setErrorMsg("Network error communicating with authentication gateway. Please retry.");
      setLoading(false);
      refreshCaptcha();
    }
  }

  return (
    <>
      <Head>
        <title>Administrative Portal Login — Central Grievance Redressal Command</title>
        <meta name="description" content="Secure administrative access for Gazetted Officers and Nodal Casework Administrators." />
      </Head>

      <div className={styles.pageWrapper}>
        {/* Tricolor sovereign accent */}
        <div className={styles.tricolorRibbon} />

        {/* Official Gov Top Bar */}
        <div className={styles.govTopBar}>
          <div className={styles.govTopLeft}>
            <span className={styles.govTopBadge}>National Informatics Centre</span>
            <span>GOVERNMENT OF INDIA • भारत सरकार</span>
          </div>
          <div className={styles.govTopRight}>
            <div className={styles.systemStatusPill}>
              <span className={styles.statusDot} />
              <span>Supabase Cloud: {sysStatus.supabaseConnected ? "Synchronized" : "Local Standby"}</span>
            </div>
            <span>Node: {sysStatus.node}</span>
            <span>TLS 1.3 256-Bit</span>
          </div>
        </div>

        {/* Main Content Area */}
        <main className={styles.mainContainer}>
          {/* Official Ministry Header */}
          <div className={styles.officialHeader}>
            <div className={styles.emblemWrapper} aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#d98a1d" strokeWidth="1.6">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" />
                <circle cx="12" cy="12" r="3" fill="#d98a1d" />
              </svg>
            </div>
            <div className={styles.ministryTitle}>
              Department of Administrative Reforms &amp; Public Grievances
            </div>
            <h1 className={styles.portalMainHeading}>
              Central Grievance Redressal Command
            </h1>
            <div className={styles.portalSubHeadingHi}>
              केंद्रीय प्रशासनिक अधिकरण एवं लोक शिकायत समाधान पोर्टल • अधिकृत लॉगिन
            </div>
          </div>

          {/* Secure Login Card */}
          <div className={styles.authCard}>
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderTitle}>
                <span>🔐</span>
                <span>Administrative Casework Login</span>
              </div>
              <span className={styles.cardHeaderBadge}>LEVEL-3 CLEARANCE</span>
            </div>

            <div className={styles.securityBanner}>
              <span className={styles.securityBannerIcon}>🛡️</span>
              <span>Central Administrative System • Multi-Factor Session Verification</span>
            </div>

            <div className={styles.cardBody}>
              {errorMsg && (
                <div className={styles.errorBanner} role="alert">
                  <span style={{ fontSize: "16px", lineHeight: 1 }}>⚠️</span>
                  <div>{errorMsg}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Officer Username */}
                <div className={styles.formGroup}>
                  <label htmlFor="admin-username" className={styles.fieldLabel}>
                    Officer Identity / Username <span className={styles.fieldLabelHi}>(अधिकारी पहचान)</span>
                  </label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>👤</span>
                    <input
                      id="admin-username"
                      type="text"
                      className={styles.textInput}
                      placeholder="Enter assigned officer username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className={styles.formGroup}>
                  <label htmlFor="admin-password" className={styles.fieldLabel}>
                    Security Password <span className={styles.fieldLabelHi}>(गोपनीय पासवर्ड)</span>
                  </label>
                  <div className={styles.inputWrapper}>
                    <span className={styles.inputIcon}>🔑</span>
                    <input
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      className={styles.textInput}
                      placeholder="Enter assigned officer password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "HIDE" : "SHOW"}
                    </button>
                  </div>
                </div>

                {/* Dynamic Visual CAPTCHA */}
                <div className={styles.captchaGroup}>
                  <label htmlFor="captcha-input" className={styles.fieldLabel}>
                    Security Verification Code (CAPTCHA) <span className={styles.fieldLabelHi}>(सुरक्षा सत्यापन कोड)</span>
                  </label>

                  <div className={styles.captchaBox}>
                    <div className={styles.captchaCanvasWrapper}>
                      <canvas
                        ref={canvasRef}
                        width={140}
                        height={42}
                        className={styles.captchaCanvas}
                        onClick={refreshCaptcha}
                        title="Click on image to refresh security code"
                      />
                      <div className={styles.captchaActionBtns}>
                        <button
                          type="button"
                          onClick={refreshCaptcha}
                          className={styles.captchaActionBtn}
                          title="Generate new verification code"
                          aria-label="Refresh code"
                        >
                          🔄
                        </button>
                        <button
                          type="button"
                          onClick={handleSpeakCaptcha}
                          className={styles.captchaActionBtn}
                          title="Read verification code aloud"
                          aria-label="Read code"
                        >
                          🔊
                        </button>
                      </div>
                    </div>

                    <div className={styles.captchaInputWrapper}>
                      <input
                        id="captcha-input"
                        type="text"
                        className={styles.captchaInput}
                        placeholder="Type Code"
                        maxLength={5}
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value)}
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>
                  <div className={styles.captchaHint}>
                    Click image or refresh button if characters are unclear. Case-insensitive.
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={styles.submitBtn}
                >
                  {loading ? (
                    <>
                      <span className={styles.spinner} />
                      <span>Verifying Cryptographic Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Secure Officer Sign-In</span>
                      <span>→</span>
                    </>
                  )}
                </button>

                {/* Security warning notice */}
                <div className={styles.securityNotice}>
                  <span>ℹ️</span>
                  <div>
                    <strong>Confidential Gateway:</strong> Authorized administrative officers only. All authentication attempts are logged with client IP, timestamp, and nodal identity.
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Official Footer */}
          <footer className={styles.govFooter}>
            <div>
              Designed &amp; Maintained by <strong>National Informatics Centre (NIC)</strong>
            </div>
            <div>
              Ministry of Personnel, Public Grievances &amp; Pensions • Government of India
            </div>
            <div className={styles.legalNotice}>
              Unauthorized access to this portal is a punishable offence under Section 66 of the Information Technology Act, 2000.
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
