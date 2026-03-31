import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Organisation from "./src/models/Organisation.js";
import User from "./src/models/User.js";
import Supplier from "./src/models/Supplier.js";
import Warehouse from "./src/models/Warehouse.js";
import InventoryItem from "./src/models/InventoryItem.js";
import Shipment from "./src/models/Shipment.js";
import Alert from "./src/models/Alert.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CSV paths
const SUPPLIER_CSV = path.resolve(__dirname, "../supplier risk dataset.csv");
const INVENTORY_CSV = path.resolve(__dirname, "../inventory risk dataset.csv");
const SHIPMENT_CSV = path.resolve(__dirname, "../shipment risk dataset.csv");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("ERROR: MONGODB_URI missing.");
  process.exit(1);
}

function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) {
      console.log("Could not find", filePath);
      return [];
  }
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",");
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] ? row[idx].trim() : "";
    });
    data.push(obj);
  }
  return data;
}

const WAREHOUSE_NAMES = [
  "Central Hub - Memphis",
  "East Coast Distribution - NJ",
  "West Coast Dispatch - CA",
  "Midwest Facility - IL",
  "Southern Depot - TX",
];

async function seed() {
  await mongoose.connect(MONGODB_URI);

  console.log("Wiping existing DB collections...");
  await Organisation.deleteMany({});
  await User.deleteMany({});
  await Supplier.deleteMany({});
  await Warehouse.deleteMany({});
  await InventoryItem.deleteMany({});
  await Shipment.deleteMany({});
  await Alert.deleteMany({});

  console.log("1. Creating DemoOrg and Users...");
  const org = await Organisation.create({
    name: "DemoOrg",
    industry: "Logistics",
    country: "US",
    timezone: "UTC",
    planTier: "ENTERPRISE",
  });
  const orgId = org._id;

  const users = [
    { name: "Alice Admin", email: "admin@demo.org", password: "AdminPass123!", role: "ORG_ADMIN" },
    { name: "Bob Analyst", email: "analyst@demo.org", password: "AnalystPass123!", role: "RISK_ANALYST" },
  ];
  let adminId = null;
  for (const u of users) {
    const user = await User.create({
      orgId,
      name: u.name,
      email: u.email,
      passwordHash: u.password,
      role: u.role,
      isActive: true, // Bypass email verification for demo
    });
    if (u.role === "ORG_ADMIN") adminId = user._id;
  }

  console.log("2. Creating Warehouses...");
  const warehouses = [];
  for (let i = 0; i < WAREHOUSE_NAMES.length; i++) {
    const wh = await Warehouse.create({
      orgId,
      code: `WH-00${i + 1}`,
      name: WAREHOUSE_NAMES[i],
      location: { address: "123 Logistics Way", city: "Metro", state: "ST", country: "US" },
      capacity: 50000,
    });
    warehouses.push(wh);
  }

  console.log("3. Seeding Suppliers...");
  const supplierRows = parseCSV(SUPPLIER_CSV);
  const supplierDocs = [];
  const MAX_RECORDS = 500; // Cap to 500 for realistic seeding
  for (let i = 0; i < Math.min(supplierRows.length, MAX_RECORDS * 2); i++) {
    const r = supplierRows[i];
    const catChoice = i % 4 === 0 ? "raw_materials" : i % 4 === 1 ? "components" : i % 4 === 2 ? "finished_goods" : "services";
    supplierDocs.push({
      orgId,
      name: `Supplier ${String.fromCharCode(65 + (i % 26))}${i + 1} Corp`,
      category: catChoice,
      contactEmail: `contact@supplier${i}.com`,
      onTimeDeliveryRate: parseFloat(r.onTimeDeliveryRate) || 80,
      financialScore: parseFloat(r.financialScore) || 70,
      defectRate: parseFloat(r.defectRate) || 0,
      disputeFrequency: parseFloat(r.disputeFrequency) || 0,
      geopoliticalRiskFlag: parseFloat(r.geopoliticalRiskFlag) || 0,
      riskScore: parseFloat(r.riskScore) || 0,
      riskTier: r.riskTier || "low",
      status: r.riskTier === "critical" ? "high_risk" : "active",
    });
  }
  const insertedSuppliers = await Supplier.insertMany(supplierDocs);
  const supplierIds = insertedSuppliers.map(s => s._id);

  console.log("4. Seeding Inventory...");
  const inventoryRows = parseCSV(INVENTORY_CSV);
  const inventoryDocs = [];
  for (let i = 0; i < Math.min(inventoryRows.length, MAX_RECORDS); i++) {
    const r = inventoryRows[i];
    const wh = warehouses[i % warehouses.length];
    const sup = supplierIds[i % supplierIds.length];
    inventoryDocs.push({
      orgId,
      supplierId: sup,
      sku: `SKU-${1000 + i}`,
      warehouseId: wh._id,
      productName: `Industrial Part ${i+1}`,
      currentStock: parseFloat(r.currentStock) || 0,
      averageDailyDemand: parseFloat(r.averageDailyDemand) || 0,
      leadTimeDays: parseFloat(r.leadTimeDays) || 0,
      safetyStock: parseFloat(r.safetyStock) || 0,
      reorderPoint: parseFloat(r.reorderPoint) || 0,
      isCriticalItem: parseInt(r.isCriticalItem) === 1,
      riskScore: parseFloat(r.riskScore) || 0,
      riskTier: r.riskTier || "low",
    });
  }
  const insertedInventory = await InventoryItem.insertMany(inventoryDocs);

  console.log("5. Seeding Shipments...");
  const shipmentRows = parseCSV(SHIPMENT_CSV);
  const shipmentDocs = [];
  for (let i = 0; i < Math.min(shipmentRows.length, MAX_RECORDS); i++) {
    const r = shipmentRows[i];
    const sup = supplierIds[(i * 3) % supplierIds.length];
    shipmentDocs.push({
      orgId,
      createdBy: adminId,
      shipmentNumber: `SHP-${20000 + i}`,
      supplierId: sup,
      origin: "Origin Port A",
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      destination: warehouses[i % warehouses.length].name,
      status: r.riskTier === "critical" ? "delayed" : "in_transit",
      shipmentValueUSD: parseFloat(r.shipmentValueUSD) || 10000,
      etaDeviationHours: parseFloat(r.etaDeviationHours) || 0,
      weatherLevel: r.weatherLevel || "low",
      routeRiskIndex: parseFloat(r.routeRiskIndex) || 0,
      carrierReliability: parseFloat(r.carrierReliability) || 0,
      trackingGapHours: parseFloat(r.trackingGapHours) || 0,
      riskScore: parseFloat(r.riskScore) || 0,
      riskTier: r.riskTier || "low",
    });
  }
  const insertedShipments = await Shipment.insertMany(shipmentDocs);
  
  console.log("6. Generating Alerts from critical items...");
  const alerts = [];
  
  // Inventory alerts
  const critInventory = insertedInventory.filter(d => d.riskTier === "critical" || d.riskTier === "high").slice(0, 20);
  for (const item of critInventory) {
      alerts.push({
          orgId,
          entityType: "inventory",
          entityId: item._id,
          title: "High Risk Detected", severity: item.riskTier,
          message: `Inventory item ${item.sku} has high risk score (${item.riskScore})`,
          status: "open",
      });
  }
  
  // Shipment alerts
  const critShipments = insertedShipments.filter(d => d.riskTier === "critical" || d.riskTier === "high").slice(0, 20);
  for (const item of critShipments) {
      alerts.push({
          orgId,
          entityType: "shipment",
          entityId: item._id,
          title: "High Risk Detected", severity: item.riskTier,
          message: `Shipment ${item.shipmentNumber} is delayed or has high route risk (${item.riskScore})`,
          status: "open",
      });
  }

  // Supplier alerts
  const critSuppliers = insertedSuppliers.filter(d => d.riskTier === "critical" || d.riskTier === "high").slice(0, 20);
  for (const item of critSuppliers) {
      alerts.push({
          orgId,
          entityType: "supplier",
          entityId: item._id,
          title: "High Risk Detected", severity: item.riskTier,
          message: `Supplier ${item.name} has concerning financial score or defect rate (${item.riskScore})`,
          status: "open",
      });
  }

  await Alert.insertMany(alerts);

  console.log(`Database seeded successfully with ${MAX_RECORDS} real records per domain!`);
  await mongoose.disconnect();
}

seed().catch(err => {
    console.error("Failed to seed:", err);
    process.exit(1);
});
