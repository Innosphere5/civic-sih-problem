const { getDb } = require("../../../lib/db");
const { classifyComplaint, generateAcknowledgement } = require("../../../lib/ai");
const { resolveDepartment, generateComplaintId } = require("../../../lib/rules");

// ── Rate limiter (in-memory token bucket, 5 req/min per IP) ──
const rateBuckets = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip) {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    bucket = { windowStart: now, count: 0 };
    rateBuckets.set(ip, bucket);
  }
  bucket.count++;
  return bucket.count <= RATE_LIMIT;
}

// ── Input sanitization ──
function sanitizeText(text) {
  if (typeof text !== "string") return "";
  return text
    // Strip script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Strip any remaining HTML tags
    .replace(/<[^>]*>/g, "")
    // Strip control characters (keep newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
}

function maskContact(contact) {
  if (!contact || typeof contact !== "string") return "";
  // Mask all but last 4 characters: "98765-12345" → "XXXXX-X2345"
  const digits = contact.replace(/\D/g, "");
  if (digits.length <= 4) return contact;
  const visible = digits.slice(-4);
  return "XXXXX-X" + visible;
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    return handlePost(req, res);
  }
  if (req.method === "GET") {
    return handleGet(req, res);
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}

// ── POST /api/complaints ──
async function handlePost(req, res) {
  try {
    // Rate limit
    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: "Too many requests. Please wait a minute before submitting again." });
    }

    const { complaint_text, locality, contact, language, image_path } = req.body || {};

    // Validate & sanitize
    const cleanText = sanitizeText(complaint_text);
    if (!cleanText) {
      return res.status(400).json({ error: "Complaint text is required." });
    }
    if (countWords(cleanText) < 15) {
      return res.status(400).json({ error: "Complaint text must be at least 15 words for proper triage." });
    }

    const cleanLocality = sanitizeText(locality || "");
    const cleanContact = sanitizeText(contact || "");
    const lang = (language || "en").substring(0, 5);

    // 1. Classify with AI
    console.log(`[API] Classifying complaint (${countWords(cleanText)} words)...`);
    const { category, confidence, needs_manual_review } = await classifyComplaint(cleanText);

    // 2. Resolve department + SLA via rules engine
    const { department, sla_hours } = resolveDepartment(category);
    console.log(`[API] Resolved: ${category} → ${department} (SLA: ${sla_hours}h)`);

    // 3. Generate unique complaint ID
    const db = getDb();
    const complaint_id = generateComplaintId(db);

    // 4. Generate acknowledgement text
    const acknowledgement = await generateAcknowledgement({
      category,
      complaint_id,
      department,
      sla_hours,
      language: lang,
    });

    // 5. Insert into database
    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO complaints (
        complaint_id, complaint_text, locality, contact, language,
        category, confidence, department, sla_hours, status,
        acknowledgement, officer_override, image_path,
        created_at, updated_at
      ) VALUES (
        @complaint_id, @complaint_text, @locality, @contact, @language,
        @category, @confidence, @department, @sla_hours, @status,
        @acknowledgement, @officer_override, @image_path,
        @created_at, @updated_at
      )
    `);

    insertStmt.run({
      complaint_id,
      complaint_text: cleanText,
      locality: cleanLocality,
      contact: cleanContact,
      language: lang,
      category,
      confidence,
      department,
      sla_hours,
      status: "Open",
      acknowledgement,
      officer_override: 0,
      image_path: sanitizeText(image_path || "") || null,
      created_at: now,
      updated_at: now,
    });

    // Log without full contact info
    console.log(`[API] Complaint ${complaint_id} created: ${category} → ${department} (confidence: ${confidence})`);

    // 6. Return the full record (mask contact)
    return res.status(201).json({
      complaint_id,
      complaint_text: cleanText,
      locality: cleanLocality,
      contact: maskContact(cleanContact),
      language: lang,
      category,
      confidence,
      department,
      sla_hours,
      status: "Open",
      acknowledgement,
      needs_manual_review: needs_manual_review || false,
      created_at: now,
      updated_at: now,
    });
  } catch (err) {
    console.error("[API] POST /api/complaints error:", err);
    return res.status(500).json({ error: "Failed to process complaint. Please try again." });
  }
}

// ── GET /api/complaints ──
function handleGet(req, res) {
  try {
    const db = getDb();
    const { status, category, department } = req.query;

    let sql = "SELECT * FROM complaints WHERE 1=1";
    const params = [];

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }
    if (category) {
      sql += " AND category = ?";
      params.push(category);
    }
    if (department) {
      sql += " AND department = ?";
      params.push(department);
    }

    sql += " ORDER BY created_at DESC";

    const rows = db.prepare(sql).all(...params);

    // Mask contact info in all returned rows
    const masked = rows.map((row) => ({
      ...row,
      contact: maskContact(row.contact),
    }));

    return res.status(200).json(masked);
  } catch (err) {
    console.error("[API] GET /api/complaints error:", err);
    return res.status(500).json({ error: "Failed to fetch complaints." });
  }
}
