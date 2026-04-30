# API Data Contracts & ML Feature Specifications

**Last Updated**: April 3, 2026
**Version**: 1.0
**Status**: PRODUCTION

---

## 1. ML Feature Definitions

All predictions require exactly 10 numeric features per entity type. Features must be within specified bounds.

### 1.1 Supplier ML Features (supplier-v1.0)

| Feature | Type | Range | Required | Source | Description |
|---------|------|-------|----------|--------|-------------|
| `onTimeDeliveryRate` | Number | 0-100 | ✓ | User Input | Percentage of on-time deliveries |
| `financialScore` | Number | 0-100 | ✓ | User Input | Supplier financial health score |
| `defectRate` | Number | 0-100 | ✓ | User Input | % of defective shipments |
| `disputeFrequency` | Number | 0-20 | ✓ | User Input | Number of disputes per period |
| `geopoliticalRiskFlag` | Number | 0-1 | ✓ | User Input | Binary: 0=stable, 1=at-risk country |
| `totalShipments` | Number | 0-999999 | ✓ | Calculated | Total shipments from supplier |
| `averageDelayDays` | Number | 0-999 | ✓ | User Input | Average delay in days |
| `daysSinceLastShip` | Number | 0-999999 | ✓ | Calculated | Days since last shipment |
| `activeShipmentCount` | Number | 0-999999 | ✓ | Calculated | Current in-transit shipments |
| `categoryRisk` | Number | 0-3 | ✓ | Encoded | Maps category enum to numeric |

**Category Risk Mapping**:
- `0` = raw_materials
- `1` = components  
- `2` = finished_goods
- `3` = services

**Example Request**:
```json
{
  "name": "Acme Corp",
  "country": "USA",
  "onTimeDeliveryRate": 92,
  "financialScore": 85,
  "defectRate": 2.5,
  "disputeFrequency": 1,
  "geopoliticalRiskFlag": 0,
  "averageDelayDays": 1.2,
  "category": "components"
}
```

**Backend Enrichment** (added before ML):
- `totalShipments`: COUNT(shipments WHERE supplier_id = ?) 
- `daysSinceLastShip`: DATEDIFF(NOW(), MAX(shipment.created_at))
- `activeShipmentCount`: COUNT(shipments WHERE status IN [in_transit, delayed, rerouted])
- `categoryRisk`: Encoded from `category` field

---

### 1.2 Shipment ML Features (shipment-v1.0)

| Feature | Type | Range | Required | Source | Description |
|---------|------|-------|----------|--------|-------------|
| `etaDeviationHours` | Number | 0-9999 | ✓ | Calculated | Actual vs estimated delivery time |
| `weatherLevel` | Number | 0-2 | ✓ | Encoded | 0=low, 1=medium, 2=high |
| `routeRiskIndex` | Number | 0-100 | ✓ | Calculated | Risk based on route geopolitics |
| `carrierReliability` | Number | 0-100 | ✓ | Calculated | Carrier historical reliability % |
| `trackingGapHours` | Number | 0-9999 | ✓ | Calculated | Hours since last tracking update |
| `shipmentValueUSD` | Number | 0-9999999 | ✓ | User Input | Monetary value of shipment |
| `daysInTransit` | Number | 0-365 | ✓ | Calculated | Days from pickup to delivery |
| `supplierRiskScore` | Number | 0-100 | ✓ | Lookup | Linked supplier's risk score |
| `isInternational` | Number | 0-1 | ✓ | Calculated | Binary: 0=domestic, 1=international |
| `carrierDelayRate` | Number | 0-100 | ✓ | Calculated | Carrier's historical delay % |

**Example Request**:
```json
{
  "trackingNumber": "SHIP123456",
  "originCity": "Shanghai",
  "originCountry": "China",
  "destinationCity": "Los Angeles",
  "destinationCountry": "USA",
  "carrier": "FedEx",
  "priority": "express",
  "weight": 250,
  "shipmentValueUSD": 15000,
  "weatherLevel": "low",
  "estimatedDelivery": "2026-04-10T14:00:00Z",
  "supplierId": "507f1f77bcf86cd799439011"
}
```

**Backend Enrichment**:
- `weatherLevel`: Encoded from string ("low"=0, "medium"=1, "high"=2)
- `etaDeviationHours`: DATEDIFF(NOW(), estimatedDelivery) / 3600
- `daysInTransit`: DATEDIFF(actualDelivery, estimated_delivery)
- `isInternational`: originCountry !== destinationCountry ? 1 : 0
- `routeRiskIndex`: Calculated from geopolitical indices
- `carrierReliability`: AVG(on-time rate) for carrier
- `carrierDelayRate`: AVG(delay rate) for carrier
- `trackingGapHours`: DATEDIFF(NOW(), lastTrackingUpdate) / 3600
- `supplierRiskScore`: Lookup from Supplier record

---

### 1.3 Inventory ML Features (inventory-v1.0)

| Feature | Type | Range | Required | Source | Description |
|---------|------|-------|----------|--------|-------------|
| `currentStock` | Number | 0-999999 | ✓ | User Input | Current quantity in stock |
| `averageDailyDemand` | Number | 0-999999 | ✓ | User Input | Average daily demand forecast |
| `leadTimeDays` | Number | 1-999 | ✓ | User Input | Supplier lead time in days |
| `demandVariance` | Number | 0-999999 | ✓ | User Input | Variance in demand (volatility) |
| `supplierRiskScore` | Number | 0-100 | ✓ | Lookup | Linked supplier's risk score |
| `safetyStock` | Number | 0-999999 | ✓ | User Input | Minimum safety stock level |
| `reorderPoint` | Number | 0-999999 | ✓ | User Input | Trigger for reordering |
| `incomingStockDays` | Number | 0-999 | ✓ | User Input | ETA for incoming stock |
| `pendingOrderQty` | Number | 0-999999 | ✓ | User Input | Quantity on pending order |
| `isCriticalItem` | Number | 0-1 | ✓ | User Input | Binary: 0=normal, 1=critical |

**Constraints**:
- `leadTimeDays` must be >= 1
- `safetyStock` should be <= `reorderPoint`
- `demandVariance` = 0 or calculated as `averageDailyDemand * 0.2` (default)

**Example Request**:
```json
{
  "sku": "WIDGET-001",
  "productName": "Widget Assembly",
  "supplierId": "507f1f77bcf86cd799439011",
  "currentStock": 450,
  "averageDailyDemand": 50,
  "leadTimeDays": 14,
  "demandVariance": 180,
  "safetyStock": 200,
  "reorderPoint": 300,
  "incomingStockDays": 5,
  "pendingOrderQty": 1000,
  "isCriticalItem": true
}
```

**Backend Enrichment**:
- `supplierRiskScore`: Lookup from Supplier record by supplierId

---

## 2. API Endpoints & Schemas

### 2.1 Supplier Endpoints

#### POST /api/suppliers
Create new supplier and generate ML risk prediction.

**Request Body**:
```json
{
  "name": "Acme Corp",
  "contactEmail": "supplier@acme.com",
  "country": "USA",
  "category": "components",
  "onTimeDeliveryRate": 92,
  "financialScore": 85,
  "defectRate": 2.5,
  "disputeFrequency": 1,
  "geopoliticalRiskFlag": 0,
  "averageDelayDays": 1.2
}
```

**Response (201)**: 
```json
{
  "supplier": {
    "_id": "507f1f77bcf86cd799439011",
    "riskScore": 18,
    "riskTier": "low",
    "modelVersion": "supplier-v1.0",
    "recommendations": ["Monitor onTimeDeliveryRate quarterly", "..."],
    "shapValues": [{
      "feature": "onTimeDeliveryRate",
      "value": 92,
      "impact": -5.2
    }]
  }
}
```

**Error Response (400)**:
```json
{
  "error": "Supplier data validation failed",
  "details": [
    "onTimeDeliveryRate out of range [0, 100]"
  ]
}
```

#### PUT /api/suppliers/:id
Update supplier and recalculate ML risk.

**Request Body**: (same as POST, any fields)
**Response (200)**: Updated supplier object

---

### 2.2 Shipment Endpoints

#### POST /api/shipments
Create new shipment and generate ML risk prediction.

**Request Body**:
```json
{
  "trackingNumber": "SHIP123456",
  "originCity": "Shanghai",
  "originCountry": "China",
  "destinationCity": "Los Angeles",
  "destinationCountry": "USA",
  "carrier": "FedEx",
  "priority": "express",
  "weight": 250,
  "shipmentValueUSD": 15000,
  "weatherLevel": "low",
  "estimatedDelivery": "2026-04-10T14:00:00Z",
  "supplierId": "507f1f77bcf86cd799439011"
}
```

**Response (201)**:
```json
{
  "shipment": {
    "_id": "507f191e810c19729de860ea",
    "shipmentNumber": "SHIP-2026-00001",
    "riskScore": 25,
    "riskTier": "low",
    "modelVersion": "shipment-v1.0",
    "shapValues": [{...}]
  }
}
```

---

### 2.3 Inventory Endpoints

#### POST /api/inventory
Create new inventory item and generate ML risk prediction.

**Request Body**:
```json
{
  "sku": "WIDGET-001",
  "productName": "Widget Assembly",
  "supplierId": "507f1f77bcf86cd799439011",
  "warehouseId": "WH-001",
  "currentStock": 450,
  "averageDailyDemand": 50,
  "leadTimeDays": 14,
  "demandVariance": 180,
  "safetyStock": 200,
  "reorderPoint": 300,
  "incomingStockDays": 5,
  "pendingOrderQty": 1000,
  "isCriticalItem": true
}
```

**Response (201)**:
```json
{
  "item": {
    "_id": "507f191e810c19729de860eb",
    "riskScore": 35,
    "riskTier": "medium",
    "modelVersion": "inventory-v1.0"
  }
}
```

---

## 3. Data Quality Endpoints

### GET /api/data-quality/health
Returns system health status.

**Response**:
```json
{
  "status": "GREEN",
  "issues": [],
  "lastChecked": "2026-04-03T10:30:00Z"
}
```

**Status Values**:
- `GREEN`: System healthy, no issues detected
- `YELLOW`: Warnings - investigate coercion/validation patterns
- `RED`: Critical issues - ML predictions may be unreliable

---

## 4. Common Error Codes

| Code | Message | Cause | Fix |
|------|---------|-------|-----|
| 400 | Supplier data validation failed | Feature out of range | Ensure all features within documented bounds |
| 400 | Shipment data validation failed | Missing required field | Include all 10 ML features |
| 400 | Inventory data validation failed | Type mismatch | Convert strings to numbers, validate booleans |
| 503 | ML Service unavailable | ML microservice down | Rule-based fallback used; check ML service health |

---

## 5. Feature Version Compatibility

Feature versions enable reproducibility. When ML models are updated, version increments:

**Current Versions**:
- Supplier: `v1.0` (10 features)
- Shipment: `v1.0` (10 features)
- Inventory: `v1.0` (10 features)

Each prediction stores `modelVersion` in the database to enable future comparison and auditing.

---

## 6. Type Coercion Rules

When data doesn't match expected types, backend auto-corrects:

| Scenario | Behavior | Severity |
|----------|----------|----------|
| String "123" → number | Converts to 123 | Low |
| Empty string → number | Converts to 0 | High |
| NaN → number | Converts to 0 | Critical |
| Out of range | Clamps to bounds | Medium |

All coercions are logged to data quality service for monitoring.

---

## 7. Example: Complete Request/Response Flow

### Step 1: Create Supplier
POST /api/suppliers
```json
{"name": "Supplier X", "onTimeDeliveryRate": 95, ...}
```

Logged coercions: None (valid data)

### Step 2: Create Shipment (linked to Supplier X)
POST /api/shipments
```json
{
  "trackingNumber": "TRACK001",
  "originCountry": "USA",
  "destinationCountry": "Mexico",
  "carrier": "FedEx",
  "weight": 100,
  "shipmentValueUSD": 5000,
  "supplierId": "507f1f77bcf86cd799439011"
}
```

Backend enriches:
- `isInternational`: 1 (USA ≠ Mexico)
- `supplierRiskScore`: 12 (from Supplier X)
- `weatherLevel`: 0 (default "low")
- `etaDeviationHours`: 0 (not yet delayed)

### Step 3: Check Data Quality
GET /api/data-quality/health
```json
{"status": "GREEN", "issues": [], ...}
```

---

## 8. Monitoring Checklist

- [ ] Feature completeness: All 10 features provided
- [ ] Type safety: All features are numeric
- [ ] Range validation: All features within bounds
- [ ] Data quality:  < 5% coercion rate, < 1% validation failures
- [ ] ML service: < 1% error rate
- [ ] Feature versions: Match deployed model versions

