const { getDb } = require("../../../lib/db");
const { complaintEvents } = require("../../../lib/events");

function maskContact(contact) {
  if (!contact || typeof contact !== "string") return "";
  const digits = contact.replace(/\D/g, "");
  if (digits.length <= 4) return contact;
  const visible = digits.slice(-4);
  return "XXXXX-X" + visible;
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  // Set headers for Server-Sent Events (SSE)
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Initial connection notification
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", timestamp: Date.now() })}\n\n`);

  // If a specific ID is tracked, push its current database state immediately
  if (id) {
    try {
      const db = getDb();
      const row = db.prepare("SELECT * FROM complaints WHERE complaint_id = ?").get(id);
      if (row) {
        res.write(
          `data: ${JSON.stringify({
            type: "INITIAL",
            complaint: {
              ...row,
              contact: maskContact(row.contact),
            },
          })}\n\n`
        );
      }
    } catch (err) {
      console.error("[SSE] Error fetching initial complaint:", err);
    }
  }

  // Listener for real-time status updates broadcast by officer actions
  const onUpdate = (complaint) => {
    if (!id || complaint.complaint_id === id) {
      res.write(
        `data: ${JSON.stringify({
          type: "STATUS_UPDATE",
          complaint: {
            ...complaint,
            contact: maskContact(complaint.contact),
          },
        })}\n\n`
      );
    }
  };

  complaintEvents.on("update", onUpdate);

  // Send keepalive comment ping every 15 seconds
  const pingInterval = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch (e) {
      clearInterval(pingInterval);
    }
  }, 15000);

  // Clean up on disconnect
  req.on("close", () => {
    clearInterval(pingInterval);
    complaintEvents.off("update", onUpdate);
  });
}
