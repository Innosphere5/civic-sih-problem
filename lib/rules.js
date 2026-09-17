/**
 * Deterministic rules engine for category → department + SLA mapping.
 * The AI model classifies complaints into categories; this module handles
 * the auditable, reproducible mapping to departments and SLA timelines.
 */

const CATEGORY_RULES = {
  "Water Supply": { department: "Jal Board / Water Department", sla_hours: 48 },
  "Electricity": { department: "State DISCOM / Power Department", sla_hours: 24 },
  "Roads": { department: "Public Works Department (PWD)", sla_hours: 72 },
  "Waste Management": { department: "Municipal Sanitation Wing", sla_hours: 24 },
  "Street Lighting": { department: "Electrical Maintenance Division", sla_hours: 48 },
};

const CANDIDATE_CATEGORIES = Object.keys(CATEGORY_RULES);

/**
 * Returns { department, sla_hours } for a given category.
 * Throws if the category is not in the rules table.
 */
function resolveDepartment(category) {
  const rule = CATEGORY_RULES[category];
  if (!rule) throw new Error(`Unknown category: ${category}`);
  return rule;
}

/**
 * Generates a unique complaint ID in the format CG-{YEAR}-{5-digit-random}.
 * Checks the database for collisions and retries up to 10 times.
 * @param {import("better-sqlite3").Database} db
 * @returns {string}
 */
function generateComplaintId(db) {
  const year = new Date().getFullYear();
  const checkStmt = db.prepare("SELECT 1 FROM complaints WHERE complaint_id = ?");

  for (let attempt = 0; attempt < 10; attempt++) {
    const rand = String(Math.floor(10000 + Math.random() * 90000)); // 5-digit
    const id = `CG-${year}-${rand}`;
    const exists = checkStmt.get(id);
    if (!exists) return id;
  }

  throw new Error("Failed to generate unique complaint ID after 10 attempts");
}

module.exports = {
  CATEGORY_RULES,
  CANDIDATE_CATEGORIES,
  resolveDepartment,
  generateComplaintId,
};
