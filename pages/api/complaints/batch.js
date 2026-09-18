const { getDb } = require("../../../lib/db");
const { complaintEvents } = require("../../../lib/events");

export default function handler(req, res) {
  if (req.method !== "POST" && req.method !== "PATCH") {
    res.setHeader("Allow", "POST, PATCH");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { complaint_ids, action, override_reason } = req.body || {};

    if (!Array.isArray(complaint_ids) || complaint_ids.length === 0) {
      return res.status(400).json({ error: "No complaint IDs provided for batch action." });
    }

    const validStatuses = ["Pending", "Accepted", "Rejected", "In Progress", "Resolved"];
    if (!validStatuses.includes(action)) {
      return res.status(400).json({ error: `Invalid action. Must be one of: ${validStatuses.join(", ")}` });
    }

    if (action === "Rejected" && (!override_reason || override_reason.trim().length < 5)) {
      return res.status(400).json({ error: "A valid decline/rejection reason (minimum 5 characters) is required." });
    }

    const db = getDb();
    const now = new Date().toISOString();

    const updateStmt = db.prepare(`
      UPDATE complaints 
      SET status = ?, 
          officer_override = 1, 
          override_reason = ?, 
          updated_at = ? 
      WHERE complaint_id = ?
    `);

    let updatedCount = 0;
    const reasonText = override_reason ? override_reason.trim() : (action === "Accepted" ? "Batch approved by Administrator" : `Batch marked as ${action}`);

    for (const id of complaint_ids) {
      const result = updateStmt.run(action, reasonText, now, id);
      if (result.changes > 0) {
        updatedCount++;
        const updatedRow = db.prepare("SELECT * FROM complaints WHERE complaint_id = ?").get(id);
        if (updatedRow) {
          complaintEvents.emit("update", updatedRow);
        }
      }
    }

    return res.status(200).json({
      success: true,
      updatedCount,
      action,
      message: `Successfully updated ${updatedCount} applications to "${action}".`,
    });
  } catch (err) {
    console.error("[API] Batch action error:", err);
    return res.status(500).json({ error: "Failed to perform batch update." });
  }
}
