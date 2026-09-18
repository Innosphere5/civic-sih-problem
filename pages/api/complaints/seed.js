const { getDb } = require("../../../lib/db");

const SAMPLE_COMPLAINTS = [
  {
    complaint_id: "CG-2026-88102",
    complaint_text: "Severe drinking water pipeline rupture near Community Centre Gate 4. Turbid brownish water flowing into residential gutters since 6 AM, affecting over 120 households. Urgent repair and water tanker deployment requested.",
    locality: "Ward 14, Sector 7 Rohini, Near Community Centre Gate 4",
    contact: "9811234567",
    language: "en",
    category: "Water Supply",
    confidence: 0.96,
    department: "Delhi Jal Board (DJB)",
    sla_hours: 12,
    status: "Pending",
    acknowledgement: "Water pipeline rupture grievance registered under Emergency Category.",
    image_path: "/uploads/Garbage_Container_Cleaning___C-1789630006569-xmjmrf.jpg",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    complaint_id: "CG-2026-92415",
    complaint_text: "High voltage transformer sparking intermittently during evening load hours near Block C park. Sparks causing panic among residents and posing imminent fire hazard to adjacent overhead telecom cables.",
    locality: "Ward 8, Block C Green Park Extension",
    contact: "9876543210",
    language: "en",
    category: "Electricity",
    confidence: 0.94,
    department: "State DISCOM / Power Department",
    sla_hours: 24,
    status: "Pending",
    acknowledgement: "Electrical transformer safety grievance prioritized for immediate inspection.",
    image_path: "/uploads/_It_could_save_you_hundreds__s-1789640307608-fwwh4d.jpg",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    complaint_id: "CG-2026-55193",
    complaint_text: "Massive solid waste accumulation and overflow around municipal dhalao. Waste has spilled onto the main road blocking half the lane and generating foul stench. Stray cattle feeding on plastic bags.",
    locality: "Ward 21, Market Road, Near Subzi Mandi",
    contact: "9988776655",
    language: "en",
    category: "Waste Management",
    confidence: 0.98,
    department: "Municipal Sanitation Wing",
    sla_hours: 24,
    status: "Pending",
    acknowledgement: "Sanitation complaint received and scheduled for clearing dispatch.",
    image_path: "/uploads/Garbage_Container_Cleaning___C-1789631613631-kbg5pn.jpg",
    created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    complaint_id: "CG-2026-44281",
    complaint_text: "Four consecutive sodium-vapor streetlights non-functional on 80ft arterial road. Heavy pedestrian traffic in evening; absolute darkness has led to two minor two-wheeler skids this week.",
    locality: "Ward 12, Main Outer Ring Service Road",
    contact: "9711002233",
    language: "en",
    category: "Street Lighting",
    confidence: 0.92,
    department: "Electrical Maintenance Division",
    sla_hours: 48,
    status: "Accepted",
    acknowledgement: "Streetlight fault forwarded to zonal field technician team.",
    image_path: null,
    created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    complaint_id: "CG-2026-31908",
    complaint_text: "Major 2-meter deep cavity/pothole formed following monsoon drainage line laying. Vehicles suffering damage, barricading needed immediately before heavy traffic peak.",
    locality: "Ward 5, Guru Nanak Marg intersection",
    contact: "9899112244",
    language: "en",
    category: "Roads",
    confidence: 0.95,
    department: "Public Works Department (PWD)",
    sla_hours: 72,
    status: "Accepted",
    acknowledgement: "Road repair order created and dispatched to PWD Sub-Division 3.",
    image_path: null,
    created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    complaint_id: "CG-2026-61405",
    complaint_text: "Private commercial building owner constructing illegal iron ramp encroaching 4 feet into public pedestrian footpath and blocking storm water drain opening.",
    locality: "Ward 19, Commercial Complex, Sector 15",
    contact: "9871239871",
    language: "en",
    category: "Roads",
    confidence: 0.88,
    department: "Public Works Department (PWD)",
    sla_hours: 72,
    status: "Rejected",
    acknowledgement: "Encroachment matter reviewed.",
    officer_override: 1,
    override_reason: "Outside Municipal Grievance scope: Building bye-law encroachment matters must be lodged directly with Municipal Enforcement & Demolition Cell via e-Encroachment portal.",
    image_path: null,
    created_at: new Date(Date.now() - 3600000 * 36).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  }
];

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const db = getDb();
    const insertStmt = db.prepare(`
      INSERT OR REPLACE INTO complaints (
        complaint_id, complaint_text, locality, contact, language, category,
        confidence, department, sla_hours, status, acknowledgement,
        officer_override, override_reason, image_path, created_at, updated_at
      ) VALUES (
        @complaint_id, @complaint_text, @locality, @contact, @language, @category,
        @confidence, @department, @sla_hours, @status, @acknowledgement,
        @officer_override, @override_reason, @image_path, @created_at, @updated_at
      )
    `);

    let seededCount = 0;
    for (const item of SAMPLE_COMPLAINTS) {
      insertStmt.run({
        complaint_id: item.complaint_id,
        complaint_text: item.complaint_text,
        locality: item.locality,
        contact: item.contact,
        language: item.language,
        category: item.category,
        confidence: item.confidence,
        department: item.department,
        sla_hours: item.sla_hours,
        status: item.status,
        acknowledgement: item.acknowledgement,
        officer_override: item.officer_override || 0,
        override_reason: item.override_reason || null,
        image_path: item.image_path,
        created_at: item.created_at,
        updated_at: item.updated_at,
      });
      seededCount++;
    }

    return res.status(200).json({
      success: true,
      message: `Successfully seeded ${seededCount} realistic sample complaints.`,
    });
  } catch (err) {
    console.error("[API] Seed error:", err);
    return res.status(500).json({ error: "Failed to seed sample complaints." });
  }
}
