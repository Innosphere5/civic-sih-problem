const { CANDIDATE_CATEGORIES } = require("./rules");

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Calls Gemini API with a timeout.
 * @param {string} prompt
 * @param {number} timeoutMs
 * @returns {Promise<string>} raw text response
 */
async function callGemini(prompt, timeoutMs = 8000) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";

  if (!apiKey || apiKey === "your_key_from_aistudio.google.com") {
    throw new Error("GEMINI_API_KEY is not configured. Get one at https://aistudio.google.com/apikey");
  }

  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parses a JSON response from Gemini, stripping markdown code fences if present.
 */
function parseJsonResponse(raw) {
  let cleaned = raw.trim();
  // Strip ```json ... ``` or ``` ... ``` wrappers
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return JSON.parse(cleaned);
}

/**
 * Classifies a complaint text into one of the CANDIDATE_CATEGORIES.
 * Returns { category, confidence }.
 * Retries once on failure, falls back to "Roads" with confidence 0.
 */
async function classifyComplaint(text) {
  const categoryDescriptions = [
    `"Water Supply" — issues about water pressure, water cuts, pipe leaks, water contamination, water tanker, boring, tap water`,
    `"Electricity" — issues about power cuts, voltage fluctuation, transformer failure, electric supply, meter problems, power outage`,
    `"Roads" — issues about potholes, road damage, road repair, broken roads, highway damage, road cave-in, asphalt, bitumen`,
    `"Waste Management" — issues about garbage collection, waste dumping, overflowing bins, sanitation, dead animals, sewage, drain cleaning`,
    `"Street Lighting" — issues about streetlight failure, dark streets, broken lamp, non-working lights, pole lights, street lamp`,
  ];

  const prompt = `You are a civic complaint classifier for an Indian municipal grievance portal.

Classify the following citizen complaint into EXACTLY ONE of these categories:
${categoryDescriptions.join("\n")}

Respond with ONLY a JSON object in this exact format, no other text:
{"category": "<one of the five categories exactly as written above>", "confidence": <number between 0 and 1>}

Citizen complaint:
"${text}"`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callGemini(
        attempt === 0
          ? prompt
          : prompt + "\n\nIMPORTANT: You MUST respond with ONLY valid JSON. No markdown, no explanation. The category MUST be exactly one of: " + CANDIDATE_CATEGORIES.join(", ")
      );

      console.log(`[AI] Classification attempt ${attempt + 1} raw response:`, raw);

      const parsed = parseJsonResponse(raw);

      if (!CANDIDATE_CATEGORIES.includes(parsed.category)) {
        console.warn(`[AI] Invalid category "${parsed.category}" returned. Attempt ${attempt + 1}.`);
        if (attempt === 0) continue; // retry
        throw new Error("Invalid category after retry");
      }

      const confidence = typeof parsed.confidence === "number"
        ? Math.min(1, Math.max(0, parsed.confidence))
        : 0.5;

      console.log(`[AI] Resolved category: "${parsed.category}" (confidence: ${confidence})`);
      return { category: parsed.category, confidence };
    } catch (err) {
      console.error(`[AI] Classification attempt ${attempt + 1} failed:`, err.message);
      if (attempt === 0) continue; // retry once
    }
  }

  // Fallback after 2 failed attempts
  console.warn("[AI] All classification attempts failed. Falling back to 'Roads' with confidence 0.");
  return { category: "Roads", confidence: 0, needs_manual_review: true };
}

/**
 * Generates a polite acknowledgement message for a classified complaint.
 * Uses real values (complaint_id, department, sla_hours) so the model fills in facts, not hallucinations.
 */
async function generateAcknowledgement({ category, complaint_id, department, sla_hours, language = "en" }) {
  const langName = language === "hi" ? "Hindi" : "English";

  const prompt = `You are a civic-service assistant for an Indian municipal grievance portal.
Create a polite acknowledgement in ${langName} for a ${category} complaint.

Use these EXACT details:
- Complaint ID: ${complaint_id}
- Assigned Department: ${department}
- Expected Service Timeline: ${sla_hours} hours

The acknowledgement should:
1. Thank the citizen for filing the complaint
2. Confirm the complaint ID
3. State the assigned department
4. Mention the expected resolution timeline
5. Do NOT promise a guaranteed resolution
6. Keep it concise (3-4 sentences)

Respond with ONLY the acknowledgement text, no JSON, no markdown formatting.`;

  try {
    const raw = await callGemini(prompt);
    const ack = raw.trim();
    console.log(`[AI] Acknowledgement generated (${ack.length} chars)`);
    return ack;
  } catch (err) {
    console.error("[AI] Acknowledgement generation failed:", err.message);
    // Return a hardcoded fallback
    return language === "hi"
      ? `आपकी शिकायत (${complaint_id}) दर्ज कर ली गई है। इसे ${department} को भेजा गया है। अपेक्षित समाधान समय: ${sla_hours} घंटे। कृपया अपने शिकायत आईडी से स्थिति ट्रैक करें।`
      : `Your complaint (${complaint_id}) has been registered and assigned to ${department}. Expected resolution timeline: ${sla_hours} hours. Please track your complaint status using your complaint ID.`;
  }
}

module.exports = {
  classifyComplaint,
  generateAcknowledgement,
};
