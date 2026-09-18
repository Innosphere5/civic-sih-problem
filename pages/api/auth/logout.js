export default async function handler(req, res) {
  // Clear the admin_session cookie
  res.setHeader(
    "Set-Cookie",
    "admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
  );

  return res.status(200).json({
    success: true,
    message: "Admin session cleared successfully.",
  });
}
