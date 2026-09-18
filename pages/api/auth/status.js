import { supabase } from "../../../lib/supabase";
import { DEFAULT_ADMINS } from "../../../lib/adminAuth";

export default async function handler(req, res) {
  try {
    // Check if table exists in Supabase
    const { data, error } = await supabase.from("admins").select("id, username, full_name, role, designation").limit(5);

    if (error) {
      return res.status(200).json({
        supabaseConnected: true,
        projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        tableExists: false,
        errorCode: error.code,
        message: "Supabase connected. Run supabase/schema.sql in Supabase SQL editor to create the public.admins table.",
        localAdminsAvailable: ["sohel", "shahzeb"],
      });
    }

    // If table exists but is empty, seed it
    if (Array.isArray(data) && data.length === 0) {
      await supabase.from("admins").insert(
        DEFAULT_ADMINS.map((a) => ({
          username: a.username,
          password_hash: a.password_hash,
          salt: a.salt,
          full_name: a.full_name,
          email: a.email,
          role: a.role,
          designation: a.designation,
          department: a.department,
          badge_number: a.badge_number,
          avatar_initials: a.avatar_initials,
          phone: a.phone,
          node_id: a.node_id,
          is_active: true,
        }))
      );
    }

    return res.status(200).json({
      supabaseConnected: true,
      projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      tableExists: true,
      adminsInSupabase: data ? data.length : 0,
      activeOfficers: ["sohel", "shahzeb"],
    });
  } catch (err) {
    return res.status(200).json({
      supabaseConnected: false,
      error: err.message,
      localAdminsAvailable: ["sohel", "shahzeb"],
    });
  }
}
