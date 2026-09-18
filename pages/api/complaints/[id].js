const { getDb } = require("../../../lib/db");
const { complaintEvents } = require("../../../lib/events");
const { resolveDepartment, CANDIDATE_CATEGORIES } = require("../../../lib/rules");

function maskContact(contact) {
  if (!contact || typeof contact !== "string") return "";
  const digits = contact.replace(/\D/g, "");
  if (digits.length <= 4) return contact;
  const visible = digits.slice(-4);
  return "XXXXX-X" + visible;
}

export default function handler(req, res) {
  const { id } = req.query;

  if (req.method === "GET") {
    return handleGet(req, res, id);
  }
  if (req.method === "PATCH") {
    return handlePatch(req, res, id);
  }
  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}

// ── GET /api/complaints/:id ──
function handleGet(req, res, id) {
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM complaints WHERE complaint_id = ?").get(id);

    if (!row) {
      return res.status(404).json({ error: `Complaint ${id} not found.` });
    }

    return res.status(200).json({
      ...row,
      contact: maskContact(row.contact),
    });
  } catch (err) {
    console.error(`[API] GET /api/complaints/${id} error:`, err);
    return res.status(500).json({ error: "Failed to fetch complaint." });
  }
}

// ── PATCH /api/complaints/:id ──
function handlePatch(req, res, id) {
  try {
    const db = getDb();
    const existing = db.prepare("SELECT * FROM complaints WHERE complaint_id = ?").get(id);

    if (!existing) {
      return res.status(404).json({ error: `Complaint ${id} not found.` });
    }

    const { status, category, department, override_reason } = req.body || {};
    const updates = {};
    let requiresOverride = false;

    // Validate status if provided
    if (status !== undefined) {
      const validStatuses = ["Pending", "Accepted", "Rejected", "In Progress", "Resolved", "Open", "Escalated"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      }
      updates.status = status;

      // If rejected, ensure explanation reason is provided
      if (status === "Rejected") {
        if (!override_reason || typeof override_reason !== "string" || override_reason.trim().length < 5) {
          return res.status(400).json({
            error: "A valid rejection reason must be provided (minimum 5 characters) for citizen notice.",
          });
        }
      }
    }

    // Validate category if provided
    if (category !== undefined) {
      if (!CANDIDATE_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: `Invalid category. Must be one of: ${CANDIDATE_CATEGORIES.join(", ")}` });
      }
      updates.category = category;
      // Re-resolve department and SLA from rules engine
      const resolved = resolveDepartment(category);
      updates.department = resolved.department;
      updates.sla_hours = resolved.sla_hours;
      requiresOverride = true;
    }

    // Allow explicit department override (without category change)
    if (department !== undefined && category === undefined) {
      updates.department = department;
      requiresOverride = true;
    }

    // If category or department changed, require override_reason
    if (requiresOverride) {
      if (!override_reason || typeof override_reason !== "string" || override_reason.trim().length < 15) {
        return res.status(400).json({
          error: "Override reason is required and must be at least 15 characters when changing category or department.",
        });
      }
    }

    // Save override reason if provided
    if (override_reason && typeof override_reason === "string") {
      updates.officer_override = 1;
      updates.override_reason = override_reason.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update." });
    }

    // Build dynamic UPDATE
    updates.updated_at = new Date().toISOString();

    const setClauses = Object.keys(updates)
      .map((key) => `${key} = @${key}`)
      .join(", ");

    const stmt = db.prepare(`UPDATE complaints SET ${setClauses} WHERE complaint_id = @complaint_id`);
    stmt.run({ ...updates, complaint_id: id });

    // Fetch and return the updated record
    const updated = db.prepare("SELECT * FROM complaints WHERE complaint_id = ?").get(id);

    // Broadcast real-time update to all listeners (SSE streams)
    if (updated) {
      complaintEvents.emit("update", updated);
    }

    console.log(`[API] Complaint ${id} updated:`, Object.keys(updates).filter(k => k !== "updated_at").join(", "));

    return res.status(200).json({
      ...updated,
      contact: maskContact(updated.contact),
    });
  } catch (err) {
    console.error(`[API] PATCH /api/complaints/${id} error:`, err);
    return res.status(500).json({ error: "Failed to update complaint." });
  }
}
