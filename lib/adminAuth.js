const crypto = require("crypto");
const { supabase } = require("./supabase");
const { getDb } = require("./db");

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "civic_nic_gov_portal_secret_key_2026_secur3";

// Default pre-seeded admin accounts matching the exact user specification
const DEFAULT_ADMINS = [
  {
    username: "sohel",
    password_hash: "94b813c87c050853dda20c3c43b85ab70401752f7caac5e1155db9e16a74c3742cdec02d79f3171436a8da2a7ac2d78add24cac3510342f3dc4dcb4a66c306b6",
    salt: "salt_sohel_2026_nic",
    full_name: "Sohel Khan, IAS",
    email: "sohel.khan@nic.in",
    role: "admin",
    designation: "Senior Nodal Casework Officer",
    department: "Department of Administrative Reforms & Public Grievances",
    badge_number: "GOV-DL-8821",
    avatar_initials: "SK",
    phone: "+91 98101 23456",
    node_id: "DL-CENTRAL-01",
    is_active: 1,
  },
  {
    username: "shahzeb",
    password_hash: "b3a68fd48920dfb69b9ec339a7590feb5e856bb7b547ec5d7df5f47625185aff38ab3f719425b5662267cd9729aedadf27620b3cd325273dd3c38983bacc9c18",
    salt: "salt_shahzeb_2026_nic",
    full_name: "Shahzeb Ahmed, IAS",
    email: "shahzeb.ahmed@nic.in",
    role: "superadmin",
    designation: "Chief Administrative Officer & Grievance Commissioner",
    department: "Cabinet Secretariat • Public Grievance Directorate",
    badge_number: "GOV-HQ-9901",
    avatar_initials: "SA",
    phone: "+91 98102 34567",
    node_id: "DL-APEX-01",
    is_active: 1,
  },
];

/**
 * Initializes local SQLite admins table for fault-tolerant operation
 */
function ensureLocalAdminsTable() {
  try {
    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS admins (
        id              TEXT PRIMARY KEY,
        username        TEXT UNIQUE NOT NULL,
        password_hash   TEXT NOT NULL,
        salt            TEXT NOT NULL,
        full_name       TEXT NOT NULL,
        email           TEXT UNIQUE NOT NULL,
        role            TEXT NOT NULL DEFAULT 'admin',
        designation     TEXT NOT NULL,
        department      TEXT NOT NULL,
        badge_number    TEXT NOT NULL,
        avatar_initials TEXT NOT NULL,
        phone           TEXT,
        node_id         TEXT DEFAULT 'DL-CENTRAL-01',
        is_active       INTEGER DEFAULT 1,
        last_login      TEXT,
        created_at      TEXT NOT NULL,
        updated_at      TEXT NOT NULL
      )
    `);

    // Check if sohel and shahzeb exist, if not seed them
    for (const a of DEFAULT_ADMINS) {
      const existing = db.prepare("SELECT username FROM admins WHERE username = ?").get(a.username);
      if (!existing) {
        db.prepare(`
          INSERT INTO admins (
            id, username, password_hash, salt, full_name, email, role,
            designation, department, badge_number, avatar_initials, phone, node_id, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID ? crypto.randomUUID() : `adm_${Date.now()}_${a.username}`,
          a.username,
          a.password_hash,
          a.salt,
          a.full_name,
          a.email,
          a.role,
          a.designation,
          a.department,
          a.badge_number,
          a.avatar_initials,
          a.phone,
          a.node_id,
          1,
          new Date().toISOString(),
          new Date().toISOString()
        );
      }
    }
  } catch (err) {
    console.error("ensureLocalAdminsTable error:", err.message);
  }
}

/**
 * Computes PBKDF2 hash using SHA-256
 */
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha256").toString("hex");
}

/**
 * Verifies a plain password against a stored PBKDF2 hash
 */
function verifyPassword(password, storedHash, salt) {
  const hash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
}

/**
 * Authenticates an admin against Supabase (with fallback to synchronized local store)
 */
async function verifyAdminCredentials(username, password) {
  if (!username || !password) {
    return { success: false, error: "Username and password are required." };
  }

  const cleanUsername = String(username).toLowerCase().trim();
  let adminRecord = null;
  let dataSource = "supabase";

  // 1. First attempt verification against Supabase database
  try {
    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (data && !error) {
      adminRecord = data;
    }
  } catch (err) {
    console.warn("Supabase query warning:", err.message);
  }

  // 2. If Supabase table is not yet created in Supabase dashboard, use synchronized store
  if (!adminRecord) {
    try {
      ensureLocalAdminsTable();
      const db = getDb();
      adminRecord = db.prepare("SELECT * FROM admins WHERE username = ?").get(cleanUsername);
      if (adminRecord) {
        dataSource = "local_sync";
      }
    } catch (err) {
      console.warn("Local DB lookup warning:", err.message);
    }
  }

  // Fallback to in-memory definition if database is initializing
  if (!adminRecord) {
    const defaultMatch = DEFAULT_ADMINS.find((a) => a.username === cleanUsername);
    if (defaultMatch) {
      adminRecord = defaultMatch;
      dataSource = "memory_seed";
    }
  }

  if (!adminRecord) {
    return { success: false, error: "Officer credentials not recognized in Central Registry." };
  }

  // Verify password using PBKDF2-SHA256
  const isMatch = verifyPassword(password, adminRecord.password_hash, adminRecord.salt);
  if (!isMatch) {
    return { success: false, error: "Authentication failed: Invalid security key / password." };
  }

  // Update last_login timestamp in Supabase and local DB
  const now = new Date().toISOString();
  try {
    if (dataSource === "supabase") {
      await supabase.from("admins").update({ last_login: now }).eq("username", cleanUsername);
    } else {
      const db = getDb();
      db.prepare("UPDATE admins SET last_login = ? WHERE username = ?").run(now, cleanUsername);
    }
  } catch (e) {
    // Non-blocking update failure
  }

  // Return clean admin user object (excluding secret hash and salt)
  const profile = {
    id: adminRecord.id || cleanUsername,
    username: adminRecord.username,
    full_name: adminRecord.full_name,
    email: adminRecord.email,
    role: adminRecord.role,
    designation: adminRecord.designation,
    department: adminRecord.department,
    badge_number: adminRecord.badge_number,
    avatar_initials: adminRecord.avatar_initials,
    phone: adminRecord.phone,
    node_id: adminRecord.node_id || "DL-CENTRAL-01",
    last_login: now,
    data_source: dataSource,
  };

  return {
    success: true,
    admin: profile,
  };
}

/**
 * Creates an HMAC-signed session token
 */
function createSessionToken(admin) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: admin.username,
      name: admin.full_name,
      role: admin.role,
      designation: admin.designation,
      badge: admin.badge_number,
      avatar: admin.avatar_initials,
      dept: admin.department,
      node: admin.node_id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days session
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

/**
 * Validates session token
 */
function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Helper to parse cookie from HTTP Request
 */
function getSessionFromRequest(req) {
  const cookieHeader = req.headers.cookie || "";
  const match = cookieHeader.match(/(?:^|;\s*)admin_session=([^;]+)/);
  if (!match) return null;
  return verifySessionToken(decodeURIComponent(match[1]));
}

module.exports = {
  DEFAULT_ADMINS,
  hashPassword,
  verifyPassword,
  verifyAdminCredentials,
  createSessionToken,
  verifySessionToken,
  getSessionFromRequest,
  ensureLocalAdminsTable,
};
