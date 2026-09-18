import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const EXTENSION_MAP = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { dataUrl, filename } = req.body || {};

    if (!dataUrl || typeof dataUrl !== "string") {
      return res.status(400).json({ error: "Missing dataUrl in request body." });
    }

    // Parse Data URL format: "data:<mime-type>;base64,<data>"
    const match = dataUrl.match(/^data:([a-zA-Z0-9\/\+.-]+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: "Invalid Data URL format. Expected base64 encoded data." });
    }

    const mimeType = match[1].toLowerCase();
    const base64Data = match[2];

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({
        error: `Unsupported file type: ${mimeType}. Allowed formats: JPG, PNG, WEBP, GIF, PDF.`,
      });
    }

    const buffer = Buffer.from(base64Data, "base64");

    // Max 5MB file check (5 * 1024 * 1024 bytes)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return res.status(400).json({ error: "File exceeds maximum permitted size of 5MB." });
    }

    // Ensure public/uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Determine safe extension and filename
    const ext = EXTENSION_MAP[mimeType] || "jpg";
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const safeBase = (filename || "evidence")
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 30);
    const savedFileName = `${safeBase}-${timestamp}-${randomSuffix}.${ext}`;
    const destinationPath = path.join(uploadsDir, savedFileName);

    fs.writeFileSync(destinationPath, buffer);

    const fileUrl = `/uploads/${savedFileName}`;

    return res.status(200).json({
      success: true,
      fileUrl,
      fileName: filename || savedFileName,
      size: buffer.length,
      mimeType,
    });
  } catch (err) {
    console.error("[API] POST /api/upload error:", err);
    return res.status(500).json({ error: "Failed to upload file. Please try again." });
  }
}
