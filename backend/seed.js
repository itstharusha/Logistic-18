import "dotenv/config";
import mongoose from "mongoose";
import Organisation from "./src/models/Organisation.js";
import User from "./src/models/User.js";
import Supplier from "./src/models/Supplier.js";
import Warehouse from "./src/models/Warehouse.js";
import InventoryItem from "./src/models/InventoryItem.js";
import Shipment from "./src/models/Shipment.js";
import Alert from "./src/models/Alert.js";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("ERROR: MONGODB_URI missing in .env");
  process.exit(1);
}

// ─────────────────────────────────────────────
// Helper: derive riskTier from a numeric score
// ─────────────────────────────────────────────
function tierFromScore(score) {
  if (score <= 30) return "low";
  if (score <= 60) return "medium";
  if (score <= 80) return "high";
  return "critical";
}

// ─────────────────────────────────────────────
// Helper: random date in the next N days
// ─────────────────────────────────────────────
function futureDate(minDays, maxDays) {
  const days = minDays + Math.random() * (maxDays - minDays);
  return new Date(Date.now() + days * 86400000);
}
function pastDate(minDays, maxDays) {
  const days = minDays + Math.random() * (maxDays - minDays);
  return new Date(Date.now() - days * 86400000);
}

// ═══════════════════════════════════════════════
// INLINE DATA — no external CSV files needed
// ═══════════════════════════════════════════════

const WAREHOUSES = [
  {
    code: "WH-MEM",
    name: "Central Hub — Memphis",
    type: "distribution",
    location: { address: "3500 Tchulahoma Rd", city: "Memphis", state: "TN", country: "US", postalCode: "38118" },
    capacity: 75000,
    currentUtilization: 48200,
    manager: { name: "David Park", email: "d.park@logistics18.com", phone: "+1-901-555-0134" },
    operatingHours: { open: "06:00", close: "22:00", timezone: "America/Chicago" },
  },
  {
    code: "WH-EWR",
    name: "East Coast Distribution — Newark",
    type: "distribution",
    location: { address: "800 Newark Turnpike", city: "Newark", state: "NJ", country: "US", postalCode: "07114" },
    capacity: 60000,
    currentUtilization: 41500,
    manager: { name: "Sarah Mitchell", email: "s.mitchell@logistics18.com", phone: "+1-973-555-0198" },
    operatingHours: { open: "07:00", close: "21:00", timezone: "America/New_York" },
  },
  {
    code: "WH-LAX",
    name: "West Coast Dispatch — Long Beach",
    type: "cross-dock",
    location: { address: "1200 Pier S Ave", city: "Long Beach", state: "CA", country: "US", postalCode: "90802" },
    capacity: 55000,
    currentUtilization: 52100,
    manager: { name: "Carlos Reyes", email: "c.reyes@logistics18.com", phone: "+1-562-555-0271" },
    operatingHours: { open: "05:00", close: "23:00", timezone: "America/Los_Angeles" },
  },
  {
    code: "WH-ORD",
    name: "Midwest Facility — Chicago",
    type: "storage",
    location: { address: "4500 W 47th St", city: "Chicago", state: "IL", country: "US", postalCode: "60632" },
    capacity: 45000,
    currentUtilization: 18900,
    manager: { name: "Emily Chen", email: "e.chen@logistics18.com", phone: "+1-312-555-0342" },
    operatingHours: { open: "08:00", close: "18:00", timezone: "America/Chicago" },
  },
  {
    code: "WH-DFW",
    name: "Southern Depot — Dallas",
    type: "storage",
    location: { address: "2100 S Stemmons Fwy", city: "Dallas", state: "TX", country: "US", postalCode: "75207" },
    capacity: 50000,
    currentUtilization: 31400,
    manager: { name: "James Rivera", email: "j.rivera@logistics18.com", phone: "+1-214-555-0456" },
    operatingHours: { open: "07:00", close: "20:00", timezone: "America/Chicago" },
  },
];

const SUPPLIERS = [
  // --- LOW risk (12) ---
  { name: "Evergreen Plastics Co.",        category: "raw_materials",   country: "US", contactEmail: "sales@evergreenplastics.com",   onTimeDeliveryRate: 96, financialScore: 88, defectRate: 0.4, disputeFrequency: 0, geopoliticalRiskFlag: 0, yearsInBusiness: 22, contractValue: 450000,  riskScore: 12 },
  { name: "Apex Steel Industries",         category: "raw_materials",   country: "US", contactEmail: "orders@apexsteel.com",          onTimeDeliveryRate: 94, financialScore: 91, defectRate: 0.7, disputeFrequency: 0, geopoliticalRiskFlag: 0, yearsInBusiness: 35, contractValue: 820000,  riskScore: 15 },
  { name: "BlueLine Packaging Ltd.",       category: "components",      country: "CA", contactEmail: "info@bluelinepack.ca",          onTimeDeliveryRate: 97, financialScore: 85, defectRate: 0.3, disputeFrequency: 0, geopoliticalRiskFlag: 0, yearsInBusiness: 18, contractValue: 210000,  riskScore: 10 },
  { name: "NovaTech Semiconductors",       category: "components",      country: "US", contactEmail: "b2b@novatech-semi.com",         onTimeDeliveryRate: 92, financialScore: 90, defectRate: 0.9, disputeFrequency: 1, geopoliticalRiskFlag: 0, yearsInBusiness: 14, contractValue: 1050000, riskScore: 22 },
  { name: "Pacific Rim Fasteners",         category: "components",      country: "JP", contactEmail: "export@pacrimfast.jp",          onTimeDeliveryRate: 98, financialScore: 93, defectRate: 0.2, disputeFrequency: 0, geopoliticalRiskFlag: 0, yearsInBusiness: 41, contractValue: 340000,  riskScore: 8  },
  { name: "GreenLeaf Chemical Supply",     category: "raw_materials",   country: "DE", contactEmail: "vertrieb@greenleaf-chem.de",    onTimeDeliveryRate: 95, financialScore: 87, defectRate: 0.5, disputeFrequency: 0, geopoliticalRiskFlag: 0, yearsInBusiness: 28, contractValue: 670000,  riskScore: 14 },
  { name: "Summit Logistics Parts",        category: "finished_goods",  country: "US", contactEmail: "sales@summitparts.com",         onTimeDeliveryRate: 93, financialScore: 82, defectRate: 1.0, disputeFrequency: 1, geopoliticalRiskFlag: 0, yearsInBusiness: 11, contractValue: 185000,  riskScore: 25 },
  { name: "Kanto Electronics Corp.",       category: "components",      country: "JP", contactEmail: "trade@kantoelec.co.jp",         onTimeDeliveryRate: 96, financialScore: 94, defectRate: 0.3, disputeFrequency: 0, geopoliticalRiskFlag: 0, yearsInBusiness: 50, contractValue: 920000,  riskScore: 9  },
  { name: "Atlas Rubber & Polymers",       category: "raw_materials",   country: "US", contactEmail: "procurement@atlasrubber.com",   onTimeDeliveryRate: 91, financialScore: 80, defectRate: 1.2, disputeFrequency: 1, geopoliticalRiskFlag: 0, yearsInBusiness: 19, contractValue: 290000,  riskScore: 28 },
  { name: "Nordic Timber Group AB",        category: "raw_materials",   country: "SE", contactEmail: "order@nordictimber.se",          onTimeDeliveryRate: 94, financialScore: 86, defectRate: 0.6, disputeFrequency: 0, geopoliticalRiskFlag: 0, yearsInBusiness: 33, contractValue: 410000,  riskScore: 18 },
  { name: "Precision Bearings Inc.",       category: "components",      country: "US", contactEmail: "sales@precbearings.com",         onTimeDeliveryRate: 95, financialScore: 89, defectRate: 0.4, disputeFrequency: 0, geopoliticalRiskFlag: 0, yearsInBusiness: 26, contractValue: 530000,  riskScore: 11 },
  { name: "ClearView Glass Solutions",     category: "finished_goods",  country: "US", contactEmail: "orders@clearviewglass.com",     onTimeDeliveryRate: 90, financialScore: 83, defectRate: 1.1, disputeFrequency: 1, geopoliticalRiskFlag: 0, yearsInBusiness: 15, contractValue: 240000,  riskScore: 27 },

  // --- MEDIUM risk (4) ---
  { name: "Orient Dragon Textiles",        category: "raw_materials",   country: "CN", contactEmail: "export@orientdragon.cn",        onTimeDeliveryRate: 78, financialScore: 65, defectRate: 3.2, disputeFrequency: 3, geopoliticalRiskFlag: 1, yearsInBusiness: 12, contractValue: 380000,  riskScore: 45 },
  { name: "Balkan Metals d.o.o.",          category: "raw_materials",   country: "RS", contactEmail: "info@balkanmetals.rs",           onTimeDeliveryRate: 82, financialScore: 60, defectRate: 2.5, disputeFrequency: 2, geopoliticalRiskFlag: 1, yearsInBusiness: 8,  contractValue: 190000,  riskScore: 52 },
  { name: "Delta Marine Hardware",         category: "components",      country: "TR", contactEmail: "sales@deltamarine.com.tr",       onTimeDeliveryRate: 80, financialScore: 68, defectRate: 2.8, disputeFrequency: 2, geopoliticalRiskFlag: 0, yearsInBusiness: 10, contractValue: 270000,  riskScore: 48 },
  { name: "Sahara Industrial Services",    category: "services",        country: "EG", contactEmail: "contracts@saharaind.eg",         onTimeDeliveryRate: 76, financialScore: 62, defectRate: 3.0, disputeFrequency: 3, geopoliticalRiskFlag: 1, yearsInBusiness: 7,  contractValue: 150000,  riskScore: 55 },

  // --- HIGH risk (2) ---
  { name: "QuickShip Components Ltd.",     category: "finished_goods",  country: "IN", contactEmail: "sales@quickship.in",             onTimeDeliveryRate: 65, financialScore: 48, defectRate: 5.5, disputeFrequency: 5, geopoliticalRiskFlag: 1, yearsInBusiness: 4,  contractValue: 120000,  riskScore: 72 },
  { name: "Volga Chem Supplies",           category: "raw_materials",   country: "RU", contactEmail: "export@volgachem.ru",            onTimeDeliveryRate: 60, financialScore: 42, defectRate: 6.0, disputeFrequency: 6, geopoliticalRiskFlag: 1, yearsInBusiness: 9,  contractValue: 95000,   riskScore: 78 },

  // --- CRITICAL risk (2) ---
  { name: "RedFlag Logistics Co.",         category: "services",        country: "VE", contactEmail: "ops@redflaglogistics.ve",        onTimeDeliveryRate: 45, financialScore: 28, defectRate: 9.0, disputeFrequency: 10, geopoliticalRiskFlag: 1, yearsInBusiness: 3, contractValue: 60000,   riskScore: 91 },
  { name: "Shattered Supply Chain Inc.",   category: "finished_goods",  country: "NG", contactEmail: "contact@shatteredsc.ng",         onTimeDeliveryRate: 40, financialScore: 22, defectRate: 11.0, disputeFrequency: 12, geopoliticalRiskFlag: 1, yearsInBusiness: 2, contractValue: 35000,  riskScore: 95 },
];

const INVENTORY_ITEMS = [
  // Warehouse 0 (Memphis) — 8 items
  { sku: "SKU-HCA-001", productName: "Hydraulic Cylinder Assembly",     whIdx: 0, supIdx: 0,  currentStock: 320,  avgDemand: 12, leadTime: 14, isCritical: true,  riskScore: 18 },
  { sku: "SKU-CWS-002", productName: "Copper Wire Spool 2.5mm",        whIdx: 0, supIdx: 5,  currentStock: 1500, avgDemand: 45, leadTime: 7,  isCritical: false, riskScore: 8  },
  { sku: "SKU-SBK-003", productName: "Steel Bolt Kit M10×50",          whIdx: 0, supIdx: 1,  currentStock: 5200, avgDemand: 80, leadTime: 5,  isCritical: false, riskScore: 5  },
  { sku: "SKU-PLR-004", productName: "Polymer Resin Pellets 25kg",     whIdx: 0, supIdx: 0,  currentStock: 180,  avgDemand: 15, leadTime: 21, isCritical: true,  riskScore: 35 },
  { sku: "SKU-MCB-005", productName: "Micro-Controller Board v3.2",    whIdx: 0, supIdx: 3,  currentStock: 890,  avgDemand: 30, leadTime: 10, isCritical: true,  riskScore: 22 },
  { sku: "SKU-BBR-006", productName: "Ball Bearing 6204-2RS",          whIdx: 0, supIdx: 10, currentStock: 4100, avgDemand: 95, leadTime: 4,  isCritical: false, riskScore: 6  },
  { sku: "SKU-IFP-007", productName: "Industrial Filter Panel 20×20",  whIdx: 0, supIdx: 8,  currentStock: 210,  avgDemand: 8,  leadTime: 18, isCritical: false, riskScore: 28 },
  { sku: "SKU-ALX-008", productName: "Aluminium Extrusion Profile 6m", whIdx: 0, supIdx: 1,  currentStock: 750,  avgDemand: 20, leadTime: 12, isCritical: false, riskScore: 14 },

  // Warehouse 1 (Newark) — 8 items
  { sku: "SKU-PWA-009", productName: "Power Adapter 48V/5A",           whIdx: 1, supIdx: 7,  currentStock: 2300, avgDemand: 60, leadTime: 6,  isCritical: false, riskScore: 7  },
  { sku: "SKU-RBC-010", productName: "Rubber Conveyor Belt 10m",       whIdx: 1, supIdx: 8,  currentStock: 85,   avgDemand: 5,  leadTime: 25, isCritical: true,  riskScore: 42 },
  { sku: "SKU-GPK-011", productName: "Glass Panel Kit — Tempered",     whIdx: 1, supIdx: 11, currentStock: 420,  avgDemand: 12, leadTime: 15, isCritical: false, riskScore: 20 },
  { sku: "SKU-SST-012", productName: "Stainless Steel Tubing 2in",     whIdx: 1, supIdx: 1,  currentStock: 3200, avgDemand: 70, leadTime: 8,  isCritical: false, riskScore: 10 },
  { sku: "SKU-TCM-013", productName: "Thermal Compound Paste 500g",    whIdx: 1, supIdx: 5,  currentStock: 650,  avgDemand: 18, leadTime: 7,  isCritical: false, riskScore: 12 },
  { sku: "SKU-LED-014", productName: "LED Panel Array 600×600",        whIdx: 1, supIdx: 3,  currentStock: 175,  avgDemand: 10, leadTime: 12, isCritical: false, riskScore: 30 },
  { sku: "SKU-HDW-015", productName: "Hardwood Pallet Standard 1.2m",  whIdx: 1, supIdx: 9,  currentStock: 8500, avgDemand: 200,leadTime: 3,  isCritical: false, riskScore: 4  },
  { sku: "SKU-SVP-016", productName: "Solenoid Valve Pneumatic 1/4in", whIdx: 1, supIdx: 4,  currentStock: 40,   avgDemand: 6,  leadTime: 20, isCritical: true,  riskScore: 65 },

  // Warehouse 2 (Long Beach) — 8 items
  { sku: "SKU-CTN-017", productName: "Corrugated Carton Box 60×40×40", whIdx: 2, supIdx: 2,  currentStock: 12000,avgDemand: 350,leadTime: 3,  isCritical: false, riskScore: 3  },
  { sku: "SKU-EPX-018", productName: "Epoxy Adhesive Industrial 5L",   whIdx: 2, supIdx: 5,  currentStock: 290,  avgDemand: 10, leadTime: 14, isCritical: false, riskScore: 16 },
  { sku: "SKU-WRM-019", productName: "Wiring Harness Module — Auto",   whIdx: 2, supIdx: 3,  currentStock: 130,  avgDemand: 8,  leadTime: 18, isCritical: true,  riskScore: 55 },
  { sku: "SKU-TXT-020", productName: "Textile Fabric Roll 100m",       whIdx: 2, supIdx: 12, currentStock: 45,   avgDemand: 7,  leadTime: 30, isCritical: false, riskScore: 68 },
  { sku: "SKU-SPC-021", productName: "Sprocket Chain Assembly",        whIdx: 2, supIdx: 6,  currentStock: 560,  avgDemand: 15, leadTime: 10, isCritical: false, riskScore: 19 },
  { sku: "SKU-PPE-022", productName: "PPE Safety Goggles (100-pack)",  whIdx: 2, supIdx: 6,  currentStock: 3400, avgDemand: 90, leadTime: 5,  isCritical: false, riskScore: 7  },
  { sku: "SKU-CMP-023", productName: "Compressor Motor 5HP",           whIdx: 2, supIdx: 16, currentStock: 15,   avgDemand: 3,  leadTime: 35, isCritical: true,  riskScore: 82 },
  { sku: "SKU-SNS-024", productName: "Pressure Sensor Transducer",     whIdx: 2, supIdx: 7,  currentStock: 980,  avgDemand: 25, leadTime: 8,  isCritical: false, riskScore: 11 },

  // Warehouse 3 (Chicago) — 8 items
  { sku: "SKU-INS-025", productName: "Insulation Foam Sheet 4×8",      whIdx: 3, supIdx: 0,  currentStock: 2100, avgDemand: 40, leadTime: 6,  isCritical: false, riskScore: 9  },
  { sku: "SKU-GKT-026", productName: "Gasket Set — Universal",         whIdx: 3, supIdx: 8,  currentStock: 720,  avgDemand: 22, leadTime: 9,  isCritical: false, riskScore: 15 },
  { sku: "SKU-FBR-027", productName: "Fiberglass Reinforcement Mat",   whIdx: 3, supIdx: 0,  currentStock: 340,  avgDemand: 12, leadTime: 16, isCritical: false, riskScore: 24 },
  { sku: "SKU-CAP-028", productName: "Capacitor Bank Module 100µF",    whIdx: 3, supIdx: 3,  currentStock: 55,   avgDemand: 4,  leadTime: 22, isCritical: true,  riskScore: 58 },
  { sku: "SKU-PTB-029", productName: "Protective Tarp — Blue 20×30",   whIdx: 3, supIdx: 2,  currentStock: 4500, avgDemand: 100,leadTime: 4,  isCritical: false, riskScore: 5  },
  { sku: "SKU-OIL-030", productName: "Machine Lubricant Oil 20L",      whIdx: 3, supIdx: 5,  currentStock: 180,  avgDemand: 6,  leadTime: 10, isCritical: false, riskScore: 17 },
  { sku: "SKU-DRL-031", productName: "Drill Bit Set — Carbide 25pc",   whIdx: 3, supIdx: 10, currentStock: 1100, avgDemand: 28, leadTime: 7,  isCritical: false, riskScore: 8  },
  { sku: "SKU-RFG-032", productName: "Refrigerant Gas R-410A 11kg",    whIdx: 3, supIdx: 17, currentStock: 20,   avgDemand: 4,  leadTime: 28, isCritical: true,  riskScore: 88 },

  // Warehouse 4 (Dallas) — 8 items
  { sku: "SKU-PMP-033", productName: "Centrifugal Pump 3in",           whIdx: 4, supIdx: 6,  currentStock: 95,   avgDemand: 5,  leadTime: 20, isCritical: true,  riskScore: 32 },
  { sku: "SKU-CBL-034", productName: "Ethernet Cable Cat6 305m",       whIdx: 4, supIdx: 7,  currentStock: 1800, avgDemand: 50, leadTime: 5,  isCritical: false, riskScore: 6  },
  { sku: "SKU-VLV-035", productName: "Gate Valve Brass 2in",           whIdx: 4, supIdx: 4,  currentStock: 670,  avgDemand: 18, leadTime: 12, isCritical: false, riskScore: 13 },
  { sku: "SKU-WLD-036", productName: "Welding Rod E6013 5kg",          whIdx: 4, supIdx: 1,  currentStock: 2900, avgDemand: 65, leadTime: 6,  isCritical: false, riskScore: 9  },
  { sku: "SKU-PLW-037", productName: "Plywood Sheet Marine Grade 18mm",whIdx: 4, supIdx: 9,  currentStock: 480,  avgDemand: 14, leadTime: 10, isCritical: false, riskScore: 16 },
  { sku: "SKU-TRF-038", productName: "Transformer Core Lamination",    whIdx: 4, supIdx: 19, currentStock: 8,    avgDemand: 2,  leadTime: 45, isCritical: true,  riskScore: 95 },
  { sku: "SKU-PNT-039", productName: "Industrial Paint Grey 20L",      whIdx: 4, supIdx: 11, currentStock: 350,  avgDemand: 10, leadTime: 8,  isCritical: false, riskScore: 20 },
  { sku: "SKU-FLG-040", productName: "Flange Coupling DN100",          whIdx: 4, supIdx: 10, currentStock: 240,  avgDemand: 8,  leadTime: 14, isCritical: false, riskScore: 21 },
];

const SHIPMENT_TEMPLATES = [
  // In-transit (10)
  { num: "SHP-2025-0001", supIdx: 0,  whIdx: 0, originCity: "Houston",       originCountry: "US", destCity: "Memphis",    destCountry: "US", carrier: "FedEx", priority: "standard",  status: "in_transit", value: 42000,  riskScore: 12, weatherLevel: "low",    delayHours: 0   },
  { num: "SHP-2025-0002", supIdx: 3,  whIdx: 1, originCity: "Taipei",        originCountry: "TW", destCity: "Newark",     destCountry: "US", carrier: "DHL",   priority: "express",   status: "in_transit", value: 128000, riskScore: 25, weatherLevel: "low",    delayHours: 0   },
  { num: "SHP-2025-0003", supIdx: 5,  whIdx: 0, originCity: "Frankfurt",     originCountry: "DE", destCity: "Memphis",    destCountry: "US", carrier: "UPS",   priority: "standard",  status: "in_transit", value: 67500,  riskScore: 14, weatherLevel: "low",    delayHours: 0   },
  { num: "SHP-2025-0004", supIdx: 7,  whIdx: 2, originCity: "Osaka",         originCountry: "JP", destCity: "Long Beach", destCountry: "US", carrier: "DHL",   priority: "standard",  status: "in_transit", value: 95000,  riskScore: 9,  weatherLevel: "medium", delayHours: 0   },
  { num: "SHP-2025-0005", supIdx: 1,  whIdx: 4, originCity: "Pittsburgh",    originCountry: "US", destCity: "Dallas",     destCountry: "US", carrier: "FedEx", priority: "standard",  status: "in_transit", value: 53000,  riskScore: 15, weatherLevel: "low",    delayHours: 0   },
  { num: "SHP-2025-0006", supIdx: 2,  whIdx: 1, originCity: "Toronto",       originCountry: "CA", destCity: "Newark",     destCountry: "US", carrier: "UPS",   priority: "standard",  status: "in_transit", value: 21000,  riskScore: 10, weatherLevel: "low",    delayHours: 0   },
  { num: "SHP-2025-0007", supIdx: 9,  whIdx: 3, originCity: "Stockholm",     originCountry: "SE", destCity: "Chicago",    destCountry: "US", carrier: "DHL",   priority: "standard",  status: "in_transit", value: 41000,  riskScore: 18, weatherLevel: "low",    delayHours: 0   },
  { num: "SHP-2025-0008", supIdx: 4,  whIdx: 2, originCity: "Yokohama",      originCountry: "JP", destCity: "Long Beach", destCountry: "US", carrier: "DHL",   priority: "express",   status: "in_transit", value: 34000,  riskScore: 8,  weatherLevel: "low",    delayHours: 0   },
  { num: "SHP-2025-0009", supIdx: 10, whIdx: 0, originCity: "Cleveland",     originCountry: "US", destCity: "Memphis",    destCountry: "US", carrier: "FedEx", priority: "standard",  status: "in_transit", value: 29500,  riskScore: 11, weatherLevel: "low",    delayHours: 0   },
  { num: "SHP-2025-0010", supIdx: 6,  whIdx: 4, originCity: "Atlanta",       originCountry: "US", destCity: "Dallas",     destCountry: "US", carrier: "UPS",   priority: "standard",  status: "in_transit", value: 18500,  riskScore: 19, weatherLevel: "low",    delayHours: 0   },

  // Delayed (5) — high/critical risk
  { num: "SHP-2025-0011", supIdx: 12, whIdx: 2, originCity: "Shanghai",      originCountry: "CN", destCity: "Long Beach", destCountry: "US", carrier: "DHL",   priority: "express",   status: "delayed",    value: 75000,  riskScore: 68, weatherLevel: "high",   delayHours: 48  },
  { num: "SHP-2025-0012", supIdx: 16, whIdx: 1, originCity: "Mumbai",        originCountry: "IN", destCity: "Newark",     destCountry: "US", carrier: "Other", priority: "standard",  status: "delayed",    value: 32000,  riskScore: 74, weatherLevel: "medium", delayHours: 72  },
  { num: "SHP-2025-0013", supIdx: 17, whIdx: 0, originCity: "Moscow",        originCountry: "RU", destCity: "Memphis",    destCountry: "US", carrier: "Other", priority: "standard",  status: "delayed",    value: 28000,  riskScore: 82, weatherLevel: "high",   delayHours: 120 },
  { num: "SHP-2025-0014", supIdx: 18, whIdx: 3, originCity: "Caracas",       originCountry: "VE", destCity: "Chicago",    destCountry: "US", carrier: "Other", priority: "standard",  status: "delayed",    value: 15000,  riskScore: 90, weatherLevel: "high",   delayHours: 168 },
  { num: "SHP-2025-0015", supIdx: 19, whIdx: 4, originCity: "Lagos",         originCountry: "NG", destCity: "Dallas",     destCountry: "US", carrier: "Other", priority: "standard",  status: "delayed",    value: 8500,   riskScore: 94, weatherLevel: "high",   delayHours: 200 },

  // Registered / pending pickup (5)
  { num: "SHP-2025-0016", supIdx: 8,  whIdx: 0, originCity: "Akron",         originCountry: "US", destCity: "Memphis",    destCountry: "US", carrier: "FedEx", priority: "standard",  status: "registered", value: 24000,  riskScore: 20, weatherLevel: "low",    delayHours: 0   },
  { num: "SHP-2025-0017", supIdx: 11, whIdx: 1, originCity: "Philadelphia",  originCountry: "US", destCity: "Newark",     destCountry: "US", carrier: "UPS",   priority: "standard",  status: "registered", value: 19000,  riskScore: 22, weatherLevel: "low",    delayHours: 0   },
  { num: "SHP-2025-0018", supIdx: 13, whIdx: 3, originCity: "Belgrade",      originCountry: "RS", destCity: "Chicago",    destCountry: "US", carrier: "DHL",   priority: "standard",  status: "registered", value: 46000,  riskScore: 48, weatherLevel: "medium", delayHours: 0   },
  { num: "SHP-2025-0019", supIdx: 14, whIdx: 2, originCity: "Istanbul",      originCountry: "TR", destCity: "Long Beach", destCountry: "US", carrier: "DHL",   priority: "express",   status: "registered", value: 55000,  riskScore: 44, weatherLevel: "low",    delayHours: 0   },
  { num: "SHP-2025-0020", supIdx: 15, whIdx: 4, originCity: "Cairo",         originCountry: "EG", destCity: "Dallas",     destCountry: "US", carrier: "Other", priority: "standard",  status: "registered", value: 31000,  riskScore: 50, weatherLevel: "medium", delayHours: 0   },

  // Delivered (5) — historical
  { num: "SHP-2025-0021", supIdx: 0,  whIdx: 0, originCity: "Houston",       originCountry: "US", destCity: "Memphis",    destCountry: "US", carrier: "FedEx", priority: "standard",  status: "delivered",  value: 38000,  riskScore: 10, weatherLevel: "low",    delayHours: 0   },
  { num: "SHP-2025-0022", supIdx: 1,  whIdx: 1, originCity: "Pittsburgh",    originCountry: "US", destCity: "Newark",     destCountry: "US", carrier: "UPS",   priority: "express",   status: "delivered",  value: 72000,  riskScore: 12, weatherLevel: "low",    delayHours: 0   },
  { num: "SHP-2025-0023", supIdx: 4,  whIdx: 2, originCity: "Tokyo",         originCountry: "JP", destCity: "Long Beach", destCountry: "US", carrier: "DHL",   priority: "overnight", status: "delivered",  value: 110000, riskScore: 8,  weatherLevel: "low",    delayHours: 0   },
  { num: "SHP-2025-0024", supIdx: 7,  whIdx: 3, originCity: "Nagoya",        originCountry: "JP", destCity: "Chicago",    destCountry: "US", carrier: "DHL",   priority: "standard",  status: "delivered",  value: 88000,  riskScore: 9,  weatherLevel: "low",    delayHours: 0   },
  { num: "SHP-2025-0025", supIdx: 10, whIdx: 4, originCity: "Cleveland",     originCountry: "US", destCity: "Dallas",     destCountry: "US", carrier: "FedEx", priority: "standard",  status: "delivered",  value: 27000,  riskScore: 11, weatherLevel: "low",    delayHours: 0   },
];


// ═══════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB.\n");

  // ── Step 1: Resolve org & admin user (NEVER delete users) ──────────
  let org = await Organisation.findOne();
  if (!org) {
    console.log("No organisation found — creating default org...");
    org = await Organisation.create({
      name: "Logistics18",
      industry: "Logistics & Supply Chain",
      country: "US",
      timezone: "America/New_York",
      planTier: "ENTERPRISE",
    });
  }
  const orgId = org._id;
  console.log(`Using organisation: "${org.name}" (${orgId})`);

  let admin = await User.findOne({ role: "ORG_ADMIN" });
  if (!admin) {
    admin = await User.findOne(); // fallback to any user
  }
  if (!admin) {
    console.log("No users found — creating default admin...");
    admin = await User.create({
      orgId,
      name: "System Admin",
      email: "admin@logistics18.com",
      passwordHash: "AdminPass123!",
      role: "ORG_ADMIN",
      isActive: true,
    });
  }
  const adminId = admin._id;
  console.log(`Using admin user: "${admin.name}" (${adminId})\n`);

  // ── Step 2: Clear all non-user collections ─────────────────────────
  console.log("Clearing existing data (preserving users & org)...");
  await Supplier.deleteMany({});
  await Warehouse.deleteMany({});
  await InventoryItem.deleteMany({});
  await Shipment.deleteMany({});
  await Alert.deleteMany({});

  // AuditLog has immutability hooks — bypass via native driver
  const db = mongoose.connection.db;
  await db.collection("audit_logs").deleteMany({});
  await db.collection("warehouse_transfers").deleteMany({});
  // Clear both report collections (legacy + current)
  const collections = await db.listCollections().toArray();
  const collNames = collections.map(c => c.name);
  if (collNames.includes("reports")) await db.collection("reports").deleteMany({});
  if (collNames.includes("analytics_reports")) await db.collection("analytics_reports").deleteMany({});
  console.log("✓ All non-user data cleared.\n");

  // ── Step 3: Seed Warehouses ────────────────────────────────────────
  console.log("1/5  Seeding warehouses...");
  const warehouseDocs = WAREHOUSES.map(w => ({ orgId, ...w }));
  const insertedWarehouses = await Warehouse.insertMany(warehouseDocs);
  console.log(`     ✓ ${insertedWarehouses.length} warehouses created.`);

  // ── Step 4: Seed Suppliers ─────────────────────────────────────────
  console.log("2/5  Seeding suppliers...");
  const supplierDocs = SUPPLIERS.map(s => {
    const tier = tierFromScore(s.riskScore);
    return {
      orgId,
      name: s.name,
      category: s.category,
      country: s.country,
      contactEmail: s.contactEmail,
      contactPhone: "",
      onTimeDeliveryRate: s.onTimeDeliveryRate,
      financialScore: s.financialScore,
      defectRate: s.defectRate,
      disputeFrequency: s.disputeFrequency,
      geopoliticalRiskFlag: s.geopoliticalRiskFlag,
      yearsInBusiness: s.yearsInBusiness,
      contractValue: s.contractValue,
      riskScore: s.riskScore,
      riskTier: tier,
      status: tier === "critical" ? "high_risk" : tier === "high" ? "under_watch" : "active",
    };
  });
  const insertedSuppliers = await Supplier.insertMany(supplierDocs);
  const supplierIds = insertedSuppliers.map(s => s._id);
  console.log(`     ✓ ${insertedSuppliers.length} suppliers created.`);

  // ── Step 5: Seed Inventory ─────────────────────────────────────────
  console.log("3/5  Seeding inventory items...");
  const inventoryDocs = INVENTORY_ITEMS.map(item => ({
    orgId,
    supplierId: supplierIds[item.supIdx],
    sku: item.sku,
    warehouseId: insertedWarehouses[item.whIdx]._id,
    productName: item.productName,
    currentStock: item.currentStock,
    averageDailyDemand: item.avgDemand,
    leadTimeDays: item.leadTime,
    demandVariance: Math.round(item.avgDemand * 0.2),
    isCriticalItem: item.isCritical,
    supplierRiskScore: SUPPLIERS[item.supIdx].riskScore,
    riskScore: item.riskScore,
    riskTier: tierFromScore(item.riskScore),
  }));
  const insertedInventory = await InventoryItem.insertMany(inventoryDocs);
  console.log(`     ✓ ${insertedInventory.length} inventory items created.`);

  // ── Step 6: Seed Shipments ─────────────────────────────────────────
  console.log("4/5  Seeding shipments...");
  const shipmentDocs = SHIPMENT_TEMPLATES.map((s, idx) => {
    const tier = tierFromScore(s.riskScore);
    const isDelivered = s.status === "delivered";
    const isDelayed = s.status === "delayed";
    const shipCreatedAt = pastDate(idx * 2 + 1, idx * 2 + 5);

    return {
      orgId,
      createdBy: adminId,
      shipmentNumber: s.num,
      supplierId: supplierIds[s.supIdx],
      carrier: s.carrier,
      priority: s.priority,
      originCity: s.originCity,
      originCountry: s.originCountry,
      destinationCity: s.destCity,
      destinationCountry: s.destCountry,
      estimatedDelivery: isDelivered ? pastDate(3, 15) : futureDate(2, 21),
      actualDelivery: isDelivered ? pastDate(1, 10) : null,
      shipmentValueUSD: s.value,
      status: s.status,
      delayHours: s.delayHours,
      delaySeverity: isDelayed ? tier : null,
      weatherLevel: s.weatherLevel,
      originGeoRisk: SUPPLIERS[s.supIdx].geopoliticalRiskFlag,
      destinationGeoRisk: 0,
      riskScore: s.riskScore,
      riskTier: tier,
      trackingEvents: [
        {
          status: "registered",
          location: s.originCity,
          description: `Shipment registered at ${s.originCity}`,
          timestamp: pastDate(5, 20),
          source: "system",
        },
        ...(s.status !== "registered"
          ? [{
              status: "in_transit",
              location: s.originCity,
              description: `Picked up by ${s.carrier}`,
              timestamp: pastDate(2, 8),
              source: "carrier_api",
            }]
          : []),
        ...(isDelayed
          ? [{
              status: "delayed",
              location: "In Transit",
              description: `Delay detected — ${s.delayHours}h behind schedule`,
              timestamp: pastDate(0, 2),
              source: "system",
            }]
          : []),
        ...(isDelivered
          ? [{
              status: "delivered",
              location: s.destCity,
              description: `Delivered to ${s.destCity} warehouse`,
              timestamp: pastDate(1, 5),
              source: "carrier_api",
            }]
          : []),
      ],
      statusHistory: [
        { status: "registered", changedAt: pastDate(5, 20), changedByName: admin.name, changedByEmail: admin.email || "", changedByRole: admin.role, notes: "Shipment created" },
      ],
      createdAt: shipCreatedAt,
      updatedAt: shipCreatedAt,
    };
  });
  const insertedShipments = await Shipment.insertMany(shipmentDocs);
  console.log(`     ✓ ${insertedShipments.length} shipments created.`);

  // ── Step 7: Generate Alerts from high/critical items ───────────────
  console.log("5/5  Generating alerts...");
  const alerts = [];

  // Supplier alerts
  for (const sup of insertedSuppliers) {
    if (sup.riskTier === "high" || sup.riskTier === "critical") {
      alerts.push({
        orgId,
        entityType: "supplier",
        entityId: sup._id.toString(),
        severity: sup.riskTier,
        title: sup.riskTier === "critical"
          ? `CRITICAL: ${sup.name} — Immediate Review Required`
          : `High Risk Supplier: ${sup.name}`,
        description: `${sup.name} has a risk score of ${sup.riskScore}. Financial score: ${sup.financialScore}, defect rate: ${sup.defectRate}%, on-time delivery: ${sup.onTimeDeliveryRate}%.`,
        mitigationRecommendation: sup.riskTier === "critical"
          ? "Consider suspending orders and sourcing alternatives immediately."
          : "Schedule a supplier review meeting and monitor upcoming deliveries closely.",
        status: "open",
      });
    }
  }

  // Inventory alerts
  for (const inv of insertedInventory) {
    if (inv.riskTier === "high" || inv.riskTier === "critical") {
      alerts.push({
        orgId,
        entityType: "inventory",
        entityId: inv._id.toString(),
        severity: inv.riskTier,
        title: inv.riskTier === "critical"
          ? `CRITICAL: ${inv.productName} — Stockout Imminent`
          : `Low Stock Alert: ${inv.productName}`,
        description: `${inv.productName} (${inv.sku}) has risk score ${inv.riskScore}. Current stock: ${inv.currentStock}, daily demand: ${inv.averageDailyDemand}, lead time: ${inv.leadTimeDays} days.`,
        mitigationRecommendation: inv.riskTier === "critical"
          ? "Initiate emergency procurement or warehouse transfer immediately."
          : "Place reorder and consider expedited shipping options.",
        status: "open",
      });
    }
  }

  // Shipment alerts
  for (const shp of insertedShipments) {
    if (shp.riskTier === "high" || shp.riskTier === "critical") {
      alerts.push({
        orgId,
        entityType: "shipment",
        entityId: shp._id.toString(),
        severity: shp.riskTier,
        title: shp.riskTier === "critical"
          ? `CRITICAL: Shipment ${shp.shipmentNumber} — Major Delay`
          : `Shipment Delay: ${shp.shipmentNumber}`,
        description: `Shipment ${shp.shipmentNumber} from ${shp.originCity} to ${shp.destinationCity} is delayed by ${shp.delayHours}h. Risk score: ${shp.riskScore}, weather: ${shp.weatherLevel}.`,
        mitigationRecommendation: shp.riskTier === "critical"
          ? "Contact carrier immediately and prepare contingency routing."
          : "Monitor closely and alert receiving warehouse of potential late arrival.",
        status: "open",
      });
    }
  }

  // Spread existing alert createdAt across past 30 days so dashboard "open" alerts
  // aren't all on the same day, and KPI trend has some recent data points.
  const spreadAlerts = alerts.map((alert, idx) => {
    const daysBack = (idx % 14) + 1;
    const d = new Date(Date.now() - daysBack * 86400000);
    return { ...alert, createdAt: d, updatedAt: d };
  });
  if (spreadAlerts.length > 0) {
    await Alert.insertMany(spreadAlerts);
  }

  // Generate 90-day historical alert trend so KPI trend charts have real data.
  // Creates 3-6 resolved alerts per day (weekends get fewer), referencing real entities.
  const entityPool = [
    ...insertedSuppliers.filter(s => s.riskTier === "high" || s.riskTier === "critical")
      .map(s => ({ type: "supplier", id: s._id.toString(), severity: s.riskTier, name: s.name })),
    ...insertedShipments.filter(s => s.riskTier === "high" || s.riskTier === "critical")
      .map(s => ({ type: "shipment", id: s._id.toString(), severity: s.riskTier, name: s.shipmentNumber })),
    ...insertedInventory.filter(i => i.riskTier === "high" || i.riskTier === "critical")
      .map(i => ({ type: "inventory", id: i._id.toString(), severity: i.riskTier, name: i.productName })),
  ];

  let trendAlertCount = 0;
  if (entityPool.length > 0) {
    const trendAlerts = [];
    for (let daysBack = 90; daysBack >= 2; daysBack--) {
      const baseDate = new Date(Date.now() - daysBack * 86400000);
      const isWeekend = baseDate.getDay() === 0 || baseDate.getDay() === 6;
      const dailyCount = (isWeekend ? 2 : 4) + Math.floor(Math.random() * 3);
      for (let j = 0; j < dailyCount; j++) {
        const entity = entityPool[Math.floor(Math.random() * entityPool.length)];
        const alertTime = new Date(baseDate);
        alertTime.setHours(8 + j * 2, Math.floor(Math.random() * 60), 0, 0);
        trendAlerts.push({
          orgId,
          entityType: entity.type,
          entityId: entity.id,
          severity: entity.severity,
          title: `Risk Alert: ${entity.name}`,
          description: `Automated risk alert for ${entity.name}.`,
          mitigationRecommendation: "Review entity risk profile and take appropriate action.",
          status: "resolved",
          createdAt: alertTime,
          updatedAt: alertTime,
        });
      }
    }
    await Alert.insertMany(trendAlerts);
    trendAlertCount = trendAlerts.length;
  }
  console.log(`     ✓ ${spreadAlerts.length} current alerts + ${trendAlertCount} historical trend alerts generated.\n`);

  // Spread updatedAt for at-risk inventory items across past 30 days so the
  // inventory KPI trend has multiple data points.
  const atRiskInventory = insertedInventory.filter(
    item => item.currentStock / Math.max(item.averageDailyDemand, 1) < 10
  );
  for (let i = 0; i < atRiskInventory.length; i++) {
    const daysBack = Math.round((i / Math.max(atRiskInventory.length - 1, 1)) * 28) + 1;
    await InventoryItem.collection.updateOne(
      { _id: atRiskInventory[i]._id },
      { $set: { updatedAt: new Date(Date.now() - daysBack * 86400000) } }
    );
  }
  if (atRiskInventory.length > 0) {
    console.log(`     ✓ ${atRiskInventory.length} at-risk inventory items spread across past 30 days.\n`);
  }

  // ── Summary ────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════");
  console.log("  DATABASE SEED COMPLETE");
  console.log("═══════════════════════════════════════════");
  console.log(`  Organisation : ${org.name}`);
  console.log(`  Warehouses   : ${insertedWarehouses.length}`);
  console.log(`  Suppliers    : ${insertedSuppliers.length}`);
  console.log(`  Inventory    : ${insertedInventory.length}`);
  console.log(`  Shipments    : ${insertedShipments.length}`);
  console.log(`  Alerts       : ${spreadAlerts.length} current + ${trendAlertCount} historical`);
  console.log(`  Users        : preserved (not modified)`);
  console.log("═══════════════════════════════════════════\n");

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
