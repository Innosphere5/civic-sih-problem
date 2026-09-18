import { getSessionFromRequest } from "../../../lib/adminAuth";
import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ authenticated: false, admin: null });
  }

  // Check Supabase connectivity status
  let supabaseStatus = "connected";
  try {
    const { error } = await supabase.from("admins").select("count", { count: "exact", head: true });
    if (error && error.code === "PGRST205") {
      supabaseStatus = "pending_schema";
    }
  } catch (e) {
    supabaseStatus = "offline";
  }

  return res.status(200).json({
    authenticated: true,
    admin: {
      username: session.sub,
      full_name: session.name,
      role: session.role,
      designation: session.designation,
      badge_number: session.badge,
      avatar_initials: session.avatar,
      department: session.dept,
      node_id: session.node,
      supabase_status: supabaseStatus,
    },
  });
}
