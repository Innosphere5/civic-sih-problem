const fs = require("fs");
const path = require("path");
const { CANDIDATE_CATEGORIES } = require("./rules");

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Ordered priority list of fast Gemini models to fallback through if one is deprecated/offline
const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-flash-latest",
];

/**
 * Robust heuristic keyword-based classifier that handles typos, Hinglish, and civic vocabulary.
 * Used alongside AI and as an intelligent fallback to prevent misrouting.
 */
function classifyByKeywords(text, imagePath = "") {
  const t = (text || "").toLowerCase();
  const img = (imagePath || "").toLowerCase();

  const scores = {
    "Street Lighting": 0,
    "Waste Management": 0,
    "Water Supply": 0,
    "Electricity": 0,
    "Roads": 0,
  };

  // Street Lighting keywords & typos
  const lightingKeywords = [
    "light", "lighting", "ligthing", "litghing", "lite", "streetlight", "street light",
    "street lighting", "dark", "darkness", "lamp", "lamps", "lamppost", "lamp post",
    "bulb", "pole", "pole light", "batti", "roshni", "tube light", "halogen", "led light"
  ];
  for (const kw of lightingKeywords) {
    if (t.includes(kw)) scores["Street Lighting"] += 2.5;
    if (img.includes(kw)) scores["Street Lighting"] += 2.0;
  }

  // Waste Management keywords & typos
  const wasteKeywords = [
    "garbage", "garbapge", "garbeg", "waste", "trash", "kachra", "kooda", "kuda",
    "dustbin", "container", "overflowing", "dump", "dumping", "litter", "sanitation",
    "safai", "debris", "malba", "cleaning", "dead animal", "smell", "rotten", "refuse"
  ];
  for (const kw of wasteKeywords) {
    if (t.includes(kw)) scores["Waste Management"] += 2.5;
    if (img.includes(kw)) scores["Waste Management"] += 2.0;
  }

  // Water Supply keywords & typos
  const waterKeywords = [
    "water", "tap", "pipeline", "pipe leak", "leakage", "drinking water", "tanker",
    "paani", "pani", "jal", "boring", "motor", "water cut", "contamination", "dirty water",
    "low pressure", "supply line", "sewer line"
  ];
  for (const kw of waterKeywords) {
    if (t.includes(kw)) scores["Water Supply"] += 2.5;
    if (img.includes(kw)) scores["Water Supply"] += 2.0;
  }

  // Electricity keywords & typos
  const electricityKeywords = [
    "electricity", "power", "power cut", "bijli", "voltage", "fluctuation", "transformer",
    "meter", "short circuit", "sparking", "high voltage", "low voltage", "electric wire",
    "wire hanging", "blackout", "load shedding"
  ];
  for (const kw of electricityKeywords) {
    if (t.includes(kw)) scores["Electricity"] += 2.5;
    if (img.includes(kw)) scores["Electricity"] += 2.0;
  }

  // Roads keywords & potholes
  const roadKeywords = [
    "pothole", "potholes", "gaddha", "gaddhe", "crater", "broken road", "damaged road",
    "road repair", "road cave", "asphalt", "bitumen", "tar road", "highway", "speed breaker",
    "footpath", "divider", "pavement"
  ];
  for (const kw of roadKeywords) {
    if (t.includes(kw)) scores["Roads"] += 2.5;
    if (img.includes(kw)) scores["Roads"] += 2.0;
  }

  // If text mentions "street" or "colony" or "road" generically, don't over-weight Roads if specific issue is mentioned
  if (t.includes("road") && scores["Street Lighting"] > 0) scores["Roads"] -= 1.0;
  if (t.includes("street") && scores["Waste Management"] > 0) scores["Roads"] -= 1.0;

  let bestCat = null;
  let maxScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCat = cat;
    }
  }

  if (bestCat && maxScore >= 2.0) {
    const confidence = Math.min(0.95, 0.70 + (maxScore * 0.05));
    return { category: bestCat, confidence, method: "keyword_heuristics" };
  }

  return null;
}

/**
 * Calls Gemini API with model fallback and multimodal support.
 */
async function callGemini(parts, timeoutMs = 9000) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();

  if (!apiKey || apiKey === "your_key_from_aistudio.google.com") {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const modelsToTry = [...new Set(CANDIDATE_MODELS)];
  let lastError = null;

  for (const model of modelsToTry) {
    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
          },
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemini ${model} error ${res.status}: ${errBody}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) {
        return text;
      }
      throw new Error(`Empty response from ${model}`);
    } catch (err) {
      lastError = err;
      console.warn(`[AI] Model ${model} failed: ${err.message}. Trying next available model...`);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error("All Gemini models failed.");
}

/**
 * Parses a JSON response from Gemini, stripping markdown code fences.
 */
function parseJsonResponse(raw) {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return JSON.parse(cleaned);
}

/**
 * Classifies a complaint using Gemini multimodal analysis (text + attached image evidence),
 * with instant keyword heuristic fallback so no complaint is ever misrouted.
 */
async function classifyComplaint(text, imagePath = null) {
  // First check our keyword heuristics to understand strong domain signals
  const heuristic = classifyByKeywords(text, imagePath);

  const categoryDescriptions = [
    `"Water Supply" — issues about water pressure, water cuts, pipe leaks, contamination, tanker, boring, tap water, drinking water`,
    `"Electricity" — issues about power cuts, voltage fluctuation, transformer failure, electric supply, meter problems, hanging wires`,
    `"Roads" — issues about potholes, road damage, road repair, broken roads, craters, highway damage, asphalt, bitumen`,
    `"Waste Management" — issues about garbage collection, waste dumping, overflowing bins, dustbins, trash, sanitation, animal carcass, drain blockage`,
    `"Street Lighting" — issues about streetlight failure, dark streets, broken lamp, non-working lights, pole lights, street lamp, dark areas`,
  ];

  const promptText = `You are an expert civic grievance triage classifier for an Indian municipal corporation.
Citizen statement:
"${text}"
${imagePath ? `Attached evidence image path: ${imagePath}` : ""}

Analyze the citizen statement (and any attached image evidence) and classify it into EXACTLY ONE of the following 5 municipal categories:
${categoryDescriptions.join("\n")}

CRITICAL INSTRUCTIONS:
- If the complaint mentions lights, dark streets, streetlights, or poles (even with typos like "ligthing"), classify as "Street Lighting".
- If the complaint mentions garbage, trash, filth, dustbins, waste (even with typos like "garbapge"), classify as "Waste Management".
- Do NOT classify a complaint as "Roads" simply because the word "street" or "road" appears in the location (e.g. "lighting problem at the street" is Street Lighting, NOT Roads).

Respond ONLY with valid JSON in this exact structure:
{"category": "<one of the five candidate categories>", "confidence": <number between 0.0 and 1.0>}`;

  const parts = [{ text: promptText }];

  // If citizen uploaded an image, attach it as inline multimodal data
  if (imagePath && typeof imagePath === "string") {
    try {
      const cleanPath = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
      const fullPath = path.join(process.cwd(), "public", cleanPath);
      if (fs.existsSync(fullPath)) {
        const ext = path.extname(fullPath).toLowerCase().replace(".", "");
        if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
          const mimeType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
          const imgBuffer = fs.readFileSync(fullPath);
          parts.push({
            inline_data: {
              mime_type: mimeType,
              data: imgBuffer.toString("base64"),
            },
          });
          console.log(`[AI] Attached image evidence to multimodal classification: ${path.basename(fullPath)}`);
        }
      }
    } catch (imgErr) {
      console.warn(`[AI] Could not load image for multimodal triage:`, imgErr.message);
    }
  }

  // Attempt AI classification
  try {
    const raw = await callGemini(parts);
    console.log(`[AI] Classification raw response:`, raw);
    const parsed = parseJsonResponse(raw);

    if (CANDIDATE_CATEGORIES.includes(parsed.category)) {
      const confidence = typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.95;

      console.log(`[AI] Successfully resolved category: "${parsed.category}" (confidence: ${confidence})`);
      return { category: parsed.category, confidence };
    }
  } catch (err) {
    console.error(`[AI] Gemini classification encountered error:`, err.message);
  }

  // If AI API failed or returned unknown format, use keyword heuristics
  if (heuristic) {
    console.log(`[AI] Fallback to keyword heuristics: "${heuristic.category}" (confidence: ${heuristic.confidence})`);
    return { category: heuristic.category, confidence: heuristic.confidence };
  }

  // Default fallback if completely ambiguous
  console.warn("[AI] No specific category detected. Defaulting to Roads for manual triage.");
  return { category: "Roads", confidence: 0.35, needs_manual_review: true };
}

/**
 * Generates an official citizen acknowledgement for the classified complaint.
 */
async function generateAcknowledgement({ category, complaint_id, department, sla_hours, language = "en" }) {
  const langName = language === "hi" ? "Hindi" : "English";

  const prompt = `You are an official administrative grievance assistant for an Indian Municipal Corporation.
Generate a polite, formal acknowledgement letter/message in ${langName} for a ${category} grievance.

Citizen Case Details:
- Complaint ID: ${complaint_id}
- Forwarded Department: ${department}
- Statutory SLA Resolution Target: ${sla_hours} hours

Requirements:
1. Thank the citizen for reporting the municipal grievance.
2. Confirm the official Complaint ID for tracking.
3. State the assigned department and official statutory resolution window.
4. Keep it professional, empathetic, and 3-4 sentences.

Respond with ONLY the acknowledgement message text.`;

  try {
    const raw = await callGemini([{ text: prompt }]);
    const ack = raw.trim();
    console.log(`[AI] Official acknowledgement generated (${ack.length} chars)`);
    return ack;
  } catch (err) {
    console.warn("[AI] Using template acknowledgement due to:", err.message);
    return language === "hi"
      ? `आपकी शिकायत (${complaint_id}) सफलतापूर्वक दर्ज कर ली गई है और इसे संबंधित ${department} को प्रेषित किया गया है। नागरिकों के अधिकार पत्र के अनुसार अपेक्षित समाधान समय ${sla_hours} घंटे है। कृपया अपने शिकायत क्रमांक से प्रगति ट्रैक करें।`
      : `Your complaint (${complaint_id}) has been successfully registered and dispatched to ${department}. Under the Citizens' Charter, the statutory resolution window is ${sla_hours} hours. Please track live updates using your complaint ID.`;
  }
}

module.exports = {
  classifyComplaint,
  generateAcknowledgement,
  classifyByKeywords,
};
