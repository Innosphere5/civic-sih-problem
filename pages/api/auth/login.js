import { verifyAdminCredentials, createSessionToken } from "../../../lib/adminAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: "Officer username and password are required." });
    }

    const authResult = await verifyAdminCredentials(username, password);

    if (!authResult.success) {
      return res.status(401).json({ error: authResult.error || "Authentication failed." });
    }

    const admin = authResult.admin;
    const token = createSessionToken(admin);

    // Set secure HTTP-only cookie
    const isProd = process.env.NODE_ENV === "production";
    const cookieOptions = [
      `admin_session=${encodeURIComponent(token)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${60 * 60 * 24 * 7}`, // 7 days
    ];
    if (isProd) {
      cookieOptions.push("Secure");
    }

    res.setHeader("Set-Cookie", cookieOptions.join("; "));

    return res.status(200).json({
      success: true,
      message: `Officer ${admin.full_name} authenticated successfully.`,
      admin,
    });
  } catch (error) {
    console.error("Login API error:", error);
    return res.status(500).json({ error: "Internal authentication gateway error." });
  }
}
