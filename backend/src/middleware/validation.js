/**
 * validation.js — Request Body Validation Middleware
 *
 * Responsibility:
 *   Uses the Joi library to define and enforce strict input validation schemas
 *   for all incoming request bodies on auth and user routes.
 *
 *   Two exports:
 *   - schemas          : Object of named Joi validation schemas (one per route type).
 *   - validate(key)    : Middleware factory — takes a schema key, validates req.body,
 *                        and either attaches the cleaned data to req.validatedBody
 *                        or returns a 400 error with per-field details.
 *   - validatePasswordStrength : Utility function used client-side style to score
 *                        how strong a password is (not currently used as middleware).
 */

import joi from 'joi';

/**
 * schemas
 * Named Joi schemas for each supported validation context.
 * The password pattern requires at least one uppercase, one lowercase, one digit.
 */
export const schemas = {
  // User registration — orgId is auto-created by backend
  register: joi.object({
    name: joi.string().min(2).max(100).required(),
    email: joi.string().email().required(),
    password: joi.string().min(8).max(50).required()
      .pattern(/(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])/), // password strength
  }),

  // User login — only email + password needed
  login: joi.object({
    email: joi.string().email().required(),
    password: joi.string().required(),
  }),

  // Profile update — all fields optional; only provided fields are changed
  updateUser: joi.object({
    name: joi.string().min(2).max(100).optional(),
    email: joi.string().email().optional(),
    role: joi.string().valid('VIEWER', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER', 'RISK_ANALYST', 'ORG_ADMIN').optional(),
    isActive: joi.boolean().optional(),
  }),

  // Role assignment — both userId and target role required
  assignRole: joi.object({
    userId: joi.string().required(),
    role: joi.string().valid('VIEWER', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER', 'RISK_ANALYST', 'ORG_ADMIN').required(),
  }),

  // Password change — must provide current password to confirm identity
  changePassword: joi.object({
    currentPassword: joi.string().required(),
    newPassword: joi.string().min(8).max(50).required()
      .pattern(/(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])/),
  }),

  // Token refresh — accepts a raw refresh token string
  refreshToken: joi.object({
    refreshToken: joi.string().required(),
  }),

  // ==========================================
  // INVENTORY VALIDATION SCHEMAS (Wijemanna)
  // ==========================================

  // Create inventory item
  createInventoryItem: joi.object({
    supplierId: joi.string().optional().allow('', null),
    sku: joi.string().min(1).max(50).required().messages({
      'any.required': 'SKU is required',
      'string.max': 'SKU must be at most 50 characters',
    }),
    warehouseId: joi.string().required().messages({
      'any.required': 'Warehouse is required',
    }),
    productName: joi.string().min(1).max(200).required().messages({
      'any.required': 'Product name is required',
    }),
    currentStock: joi.number().min(0).required().messages({
      'any.required': 'Current stock is required',
      'number.min': 'Stock cannot be negative',
    }),
    averageDailyDemand: joi.number().min(0).required().messages({
      'any.required': 'Average daily demand is required',
      'number.min': 'Demand cannot be negative',
    }),
    leadTimeDays: joi.number().min(1).max(365).required().messages({
      'any.required': 'Lead time is required',
      'number.min': 'Lead time must be at least 1 day',
    }),
    demandVariance: joi.number().min(0).optional().default(0),
    isCriticalItem: joi.boolean().optional().default(false),
    supplierRiskScore: joi.number().min(0).max(100).optional().default(0),
    incomingStockDays: joi.number().min(0).optional().default(0),
    pendingOrderQty: joi.number().min(0).optional().default(0),
  }),

  // Update inventory item
  updateInventoryItem: joi.object({
    supplierId: joi.string().optional().allow('', null),
    sku: joi.string().min(1).max(50).optional(),
    warehouseId: joi.string().optional(),
    productName: joi.string().min(1).max(200).optional(),
    currentStock: joi.number().min(0).optional(),
    averageDailyDemand: joi.number().min(0).optional(),
    leadTimeDays: joi.number().min(1).max(365).optional(),
    demandVariance: joi.number().min(0).optional(),
    isCriticalItem: joi.boolean().optional(),
    supplierRiskScore: joi.number().min(0).max(100).optional(),
    incomingStockDays: joi.number().min(0).optional(),
    pendingOrderQty: joi.number().min(0).optional(),
  }),

  // ==========================================
  // WAREHOUSE VALIDATION SCHEMAS
  // ==========================================

  // Create warehouse
  createWarehouse: joi.object({
    code: joi.string().min(1).max(20).required().messages({
      'any.required': 'Warehouse code is required',
    }),
    name: joi.string().min(1).max(100).required().messages({
      'any.required': 'Warehouse name is required',
    }),
    location: joi.object({
      address: joi.string().allow('', null).max(200).optional().default(''),
      city: joi.string().allow('', null).max(100).optional().default(''),
      state: joi.string().allow('', null).max(100).optional().default(''),
      country: joi.string().allow('', null).max(100).optional().default(''),
      postalCode: joi.string().allow('', null).max(20).optional().default(''),
    }).optional().default({}),
    capacity: joi.number().min(0).optional().default(0),
    type: joi.string().valid('distribution', 'storage', 'cold-storage', 'cross-dock', 'manufacturing').optional().default('storage'),
    status: joi.string().valid('active', 'inactive', 'maintenance').optional().default('active'),
    manager: joi.object({
      name: joi.string().allow('', null).max(100).optional().default(''),
      email: joi.string().allow('', null).max(100).optional().default(''),
      phone: joi.string().allow('', null).max(20).optional().default(''),
    }).optional().default({}),
    operatingHours: joi.object({
      open: joi.string().allow('', null).optional().default('08:00'),
      close: joi.string().allow('', null).optional().default('18:00'),
      timezone: joi.string().allow('', null).optional().default('UTC'),
    }).optional().default({}),
    isDefault: joi.boolean().optional().default(false),
  }),

  // Update warehouse
  updateWarehouse: joi.object({
    code: joi.string().min(1).max(20).optional(),
    name: joi.string().min(1).max(100).optional(),
    location: joi.object({
      address: joi.string().allow('', null).max(200).optional(),
      city: joi.string().allow('', null).max(100).optional(),
      state: joi.string().allow('', null).max(100).optional(),
      country: joi.string().allow('', null).max(100).optional(),
      postalCode: joi.string().allow('', null).max(20).optional(),
    }).optional(),
    capacity: joi.number().min(0).optional(),
    type: joi.string().valid('distribution', 'storage', 'cold-storage', 'cross-dock', 'manufacturing').optional(),
    status: joi.string().valid('active', 'inactive', 'maintenance').optional(),
    manager: joi.object({
      name: joi.string().allow('', null).max(100).optional(),
      email: joi.string().allow('', null).max(100).optional(),
      phone: joi.string().allow('', null).max(20).optional(),
    }).optional(),
    operatingHours: joi.object({
      open: joi.string().allow('', null).optional(),
      close: joi.string().allow('', null).optional(),
      timezone: joi.string().allow('', null).optional(),
    }).optional(),
    isDefault: joi.boolean().optional(),
  }),

  // ==========================================
  // WAREHOUSE TRANSFER VALIDATION SCHEMAS
  // ==========================================

  // Create transfer request
  createTransfer: joi.object({
    inventoryItemId: joi.string().required().messages({
      'any.required': 'Inventory item is required',
    }),
    fromWarehouseId: joi.string().required().messages({
      'any.required': 'Source warehouse is required',
    }),
    toWarehouseId: joi.string().required().messages({
      'any.required': 'Destination warehouse is required',
    }),
    quantity: joi.number().min(1).required().messages({
      'any.required': 'Quantity is required',
      'number.min': 'Quantity must be at least 1',
    }),
    priority: joi.string().valid('low', 'normal', 'high', 'urgent').optional().default('normal'),
    reason: joi.string().allow('', null).max(500).optional().default(''),
    notes: joi.string().allow('', null).max(1000).optional().default(''),
    expectedDeliveryDate: joi.date().optional(),
  }),

  // ==========================================
  // SUPPLIER VALIDATION SCHEMAS (Rifshadh)
  // ==========================================

  // Create supplier
  createSupplier: joi.object({
    name: joi.string().min(2).max(150).required().trim().messages({
      'any.required': 'Supplier name is required',
      'string.min': 'Supplier name must be at least 2 characters',
      'string.max': 'Supplier name must be at most 150 characters',
    }),
    contactEmail: joi.string().email().allow('', null).optional().messages({
      'string.email': 'Contact email must be a valid email address',
    }),
    contactPhone: joi.string().allow('', null).max(20).optional()
      .pattern(/^[+]?[\d\s\-().]{7,20}$/).messages({
        'string.pattern.base': 'Contact phone must be a valid phone number',
      }),
    country: joi.string().allow('', null).max(100).optional(),
    category: joi.string().valid('raw_materials', 'components', 'finished_goods', 'services').optional().default('raw_materials').messages({
      'any.only': 'Category must be one of: raw_materials, components, finished_goods, services',
    }),
    weatherLevel: joi.string().valid('low', 'medium', 'high').optional().default('low'),
    onTimeDeliveryRate: joi.number().min(0).max(100).optional().default(80).messages({
      'number.min': 'On-time delivery rate must be between 0 and 100',
      'number.max': 'On-time delivery rate must be between 0 and 100',
    }),
    avgDelayDays: joi.number().min(0).max(365).optional().default(0).messages({
      'number.max': 'Average delay days cannot exceed 365',
    }),
    defectRate: joi.number().min(0).max(100).optional().default(0).messages({
      'number.max': 'Defect rate must be between 0 and 100',
    }),
    financialScore: joi.number().min(0).max(100).optional().default(70).messages({
      'number.min': 'Financial score must be between 0 and 100',
      'number.max': 'Financial score must be between 0 and 100',
    }),
    yearsInBusiness: joi.number().min(0).max(200).optional().default(5),
    contractValue: joi.number().min(0).optional().default(0),
    geopoliticalRiskFlag: joi.number().valid(0, 1).optional().default(0).messages({
      'any.only': 'Geopolitical risk flag must be 0 (stable) or 1 (at-risk)',
    }),
    disputeFrequency: joi.number().min(0).max(20).optional().default(0).messages({
      'number.max': 'Dispute frequency cannot exceed 20',
    }),
  }),

  // Update supplier
  updateSupplier: joi.object({
    name: joi.string().min(2).max(150).optional().trim(),
    contactEmail: joi.string().email().allow('', null).optional(),
    contactPhone: joi.string().allow('', null).max(20).optional()
      .pattern(/^[+]?[\d\s\-().]{7,20}$/),
    country: joi.string().allow('', null).max(100).optional(),
    category: joi.string().valid('raw_materials', 'components', 'finished_goods', 'services').optional(),
    weatherLevel: joi.string().valid('low', 'medium', 'high').optional(),
    onTimeDeliveryRate: joi.number().min(0).max(100).optional(),
    avgDelayDays: joi.number().min(0).max(365).optional(),
    defectRate: joi.number().min(0).max(100).optional(),
    financialScore: joi.number().min(0).max(100).optional(),
    yearsInBusiness: joi.number().min(0).max(200).optional(),
    contractValue: joi.number().min(0).optional(),
    geopoliticalRiskFlag: joi.number().valid(0, 1).optional(),
    disputeFrequency: joi.number().min(0).max(20).optional(),
  }),

  // Override supplier risk score
  overrideSupplierScore: joi.object({
    newScore: joi.number().min(0).max(100).required().messages({
      'any.required': 'New score is required',
      'number.min': 'Score must be between 0 and 100',
      'number.max': 'Score must be between 0 and 100',
    }),
    justification: joi.string().min(10).max(1000).required().trim().messages({
      'any.required': 'Justification is required for score override',
      'string.min': 'Justification must be at least 10 characters',
      'string.max': 'Justification must be at most 1000 characters',
    }),
  }),

  // Update supplier metrics
  updateSupplierMetrics: joi.object({
    onTimeDeliveryRate: joi.number().min(0).max(100).optional(),
    defectRate: joi.number().min(0).max(100).optional(),
    disputeFrequency: joi.number().min(0).max(20).optional(),
    avgDelayDays: joi.number().min(0).max(365).optional(),
    financialScore: joi.number().min(0).max(100).optional(),
    yearsInBusiness: joi.number().min(0).max(200).optional(),
    contractValue: joi.number().min(0).optional(),
    reason: joi.string().min(5).max(500).required().trim().messages({
      'any.required': 'Reason is required for metrics adjustment',
      'string.min': 'Reason must be at least 5 characters',
    }),
    source: joi.string().valid('manual', 'auto_shipment').optional().default('manual'),
    shipmentId: joi.string().allow('', null).optional(),
  }),

  // Update supplier status
  updateSupplierStatus: joi.object({
    status: joi.string().valid('active', 'under_watch', 'high_risk', 'suspended').required().messages({
      'any.required': 'Status is required',
      'any.only': 'Status must be one of: active, under_watch, high_risk, suspended',
    }),
  }),

  // Compare suppliers
  compareSuppliers: joi.object({
    ids: joi.array().items(joi.string()).min(2).max(3).required().messages({
      'any.required': 'Supplier IDs are required',
      'array.min': 'Select at least 2 suppliers to compare',
      'array.max': 'Can compare at most 3 suppliers',
    }),
  }),

  // ==========================================
  // SHIPMENT VALIDATION SCHEMAS (Umayanthi)
  // ==========================================

  // Create shipment
  createShipment: joi.object({
    description: joi.string().allow('', null).max(500).optional().default(''),
    trackingNumber: joi.string().allow('', null).max(100).optional().default(''),
    carrier: joi.string().valid('FedEx', 'UPS', 'DHL', 'Other').required().messages({
      'any.required': 'Carrier is required',
      'any.only': 'Carrier must be one of: FedEx, UPS, DHL, Other',
    }),
    priority: joi.string().valid('standard', 'express', 'overnight').optional().default('standard'),
    supplierId: joi.string().allow('', null).optional(),
    originCity: joi.string().max(100).required().trim().messages({
      'any.required': 'Origin city is required',
    }),
    originCountry: joi.string().max(100).required().trim().messages({
      'any.required': 'Origin country is required',
    }),
    destinationCity: joi.string().max(100).required().trim().messages({
      'any.required': 'Destination city is required',
    }),
    destinationCountry: joi.string().max(100).required().trim().messages({
      'any.required': 'Destination country is required',
    }),
    estimatedDelivery: joi.date().required().messages({
      'any.required': 'Estimated delivery date is required',
      'date.base': 'Estimated delivery must be a valid date',
    }),
    weight: joi.number().min(0).max(100000).optional().default(0).messages({
      'number.min': 'Weight cannot be negative',
      'number.max': 'Weight cannot exceed 100,000 kg',
    }),
    weatherLevel: joi.string().valid('low', 'medium', 'high').optional().default('low'),
    originGeoRisk: joi.number().valid(0, 1).optional().default(0),
    destinationGeoRisk: joi.number().valid(0, 1).optional().default(0),
    inventoryItemId: joi.string().allow('', null).optional(),
    originWarehouseId: joi.string().allow('', null).optional(),
    destinationWarehouseId: joi.string().allow('', null).optional(),
    warehouseTransferId: joi.string().allow('', null).optional(),
    shipmentType: joi.string().valid('external', 'internal_transfer').optional().default('external'),
  }),

  // Update shipment
  updateShipment: joi.object({
    description: joi.string().allow('', null).max(500).optional(),
    trackingNumber: joi.string().allow('', null).max(100).optional(),
    carrier: joi.string().valid('FedEx', 'UPS', 'DHL', 'Other').optional(),
    priority: joi.string().valid('standard', 'express', 'overnight').optional(),
    supplierId: joi.string().allow('', null).optional(),
    originCity: joi.string().max(100).optional().trim(),
    originCountry: joi.string().max(100).optional().trim(),
    destinationCity: joi.string().max(100).optional().trim(),
    destinationCountry: joi.string().max(100).optional().trim(),
    estimatedDelivery: joi.date().optional(),
    weight: joi.number().min(0).max(100000).optional(),
    weatherLevel: joi.string().valid('low', 'medium', 'high').optional(),
    originGeoRisk: joi.number().valid(0, 1).optional(),
    destinationGeoRisk: joi.number().valid(0, 1).optional(),
    inventoryItemId: joi.string().allow('', null).optional(),
    originWarehouseId: joi.string().allow('', null).optional(),
    destinationWarehouseId: joi.string().allow('', null).optional(),
    warehouseTransferId: joi.string().allow('', null).optional(),
    shipmentType: joi.string().valid('external', 'internal_transfer').optional(),
  }),

  // Update shipment status
  updateShipmentStatus: joi.object({
    status: joi.string().valid('registered', 'in_transit', 'delayed', 'rerouted', 'delivered', 'closed').required().messages({
      'any.required': 'Status is required',
      'any.only': 'Status must be one of: registered, in_transit, delayed, rerouted, delivered, closed',
    }),
    notes: joi.string().allow('', null).max(1000).optional().default(''),
  }),

  // ==========================================
  // ALERT VALIDATION SCHEMAS (Kulatunga)
  // ==========================================

  // Create alert
  createAlert: joi.object({
    entityType: joi.string().valid('supplier', 'shipment', 'inventory').required().messages({
      'any.required': 'Entity type is required',
      'any.only': 'Entity type must be one of: supplier, shipment, inventory',
    }),
    entityId: joi.string().required().messages({
      'any.required': 'Entity ID is required',
    }),
    severity: joi.string().valid('low', 'medium', 'high', 'critical').optional().default('medium').messages({
      'any.only': 'Severity must be one of: low, medium, high, critical',
    }),
    title: joi.string().min(5).max(200).required().trim().messages({
      'any.required': 'Alert title is required',
      'string.min': 'Title must be at least 5 characters',
      'string.max': 'Title must be at most 200 characters',
    }),
    description: joi.string().allow('', null).max(2000).optional(),
    mitigationRecommendation: joi.string().allow('', null).max(2000).optional(),
  }),

  // Resolve alert
  resolveAlert: joi.object({
    resolutionNote: joi.string().min(10).max(2000).required().trim().messages({
      'any.required': 'Resolution note is required',
      'string.min': 'Resolution note must be at least 10 characters',
      'string.max': 'Resolution note must be at most 2000 characters',
    }),
  }),

  // ==========================================
  // ANALYTICS VALIDATION SCHEMAS (Senadeera)
  // ==========================================

  // Generate report
  generateReport: joi.object({
    type: joi.string().valid('summary', 'detailed', 'comparison', 'trend').required().messages({
      'any.required': 'Report type is required',
      'any.only': 'Type must be one of: summary, detailed, comparison, trend',
    }),
    format: joi.string().valid('pdf', 'csv').required().messages({
      'any.required': 'Report format is required',
      'any.only': 'Format must be either pdf or csv',
    }),
    module: joi.string().valid('dashboard', 'overall', 'supplier_risk', 'shipments', 'shipment_tracking', 'inventory', 'alerts').required().messages({
      'any.required': 'Module is required',
      'any.only': 'Module must be one of: dashboard, overall, supplier_risk, shipments, shipment_tracking, inventory, alerts',
    }),
    severity: joi.string().valid('low', 'medium', 'high', 'critical').optional(),
    include: joi.array().items(joi.string()).optional(),
    dateRange: joi.object({
      from: joi.date().optional(),
      to: joi.date().optional(),
    }).optional(),
  }),

  // ==========================================
  // USER CREATE/INVITE VALIDATION SCHEMAS
  // ==========================================

  // Admin create user
  createUser: joi.object({
    name: joi.string().min(2).max(100).required().trim().messages({
      'any.required': 'Name is required',
      'string.min': 'Name must be at least 2 characters',
    }),
    email: joi.string().email().required().messages({
      'any.required': 'Email is required',
      'string.email': 'Must be a valid email address',
    }),
    password: joi.string().min(8).max(50).required()
      .pattern(/(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])/).messages({
        'any.required': 'Password is required',
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      }),
    role: joi.string().valid('VIEWER', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER', 'RISK_ANALYST', 'ORG_ADMIN').optional().default('VIEWER'),
  }),

  // Admin invite user
  inviteUser: joi.object({
    name: joi.string().min(2).max(100).required().trim().messages({
      'any.required': 'Name is required',
    }),
    email: joi.string().email().required().messages({
      'any.required': 'Email is required',
      'string.email': 'Must be a valid email address',
    }),
    role: joi.string().valid('VIEWER', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER', 'RISK_ANALYST', 'ORG_ADMIN').optional().default('VIEWER'),
  }),
};

/**
 * validate(schemaKey)
 * Middleware factory that validates req.body against the named Joi schema.
 *
 * - abortEarly: false   → collect ALL validation errors, not just the first one
 * - stripUnknown: true  → silently remove any fields not in the schema
 *
 * On success: attaches cleaned/sanitised data to req.validatedBody, calls next()
 * On failure: returns HTTP 400 with an array of field-level error details
 */
export const validate = (schemaKey) => {
  return (req, res, next) => {
    const schema = schemas[schemaKey];

    // Guard: schema key must exist
    if (!schema) {
      return res.status(500).json({ error: 'Validation schema not found' });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,   // Return all errors at once
      stripUnknown: true,  // Remove unexpected fields for security
    });

    if (error) {
      // Format errors as an array of { field, message } objects for the frontend
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details });
    }

    // Replace req.body with the sanitised and type-coerced value
    req.validatedBody = value;
    next();
  };
};

/**
 * validatePasswordStrength
 * Utility function that scores a password against 5 requirements.
 * Returns an object indicating which requirements are met and an overall score.
 *
 * Requirements:
 *   - minLength:      at least 8 characters
 *   - hasUppercase:   at least one uppercase letter
 *   - hasLowercase:   at least one lowercase letter
 *   - hasNumber:      at least one digit
 *   - hasSpecialChar: at least one of !@#$%^&*
 *
 * isStrong = true when at least 4 of 5 requirements are satisfied.
 */
export const validatePasswordStrength = (password) => {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*]/.test(password),
  };

  const meetsRequirements = Object.values(requirements).filter(v => v).length;
  return {
    isStrong: meetsRequirements >= 4,
    requirements,
    score: meetsRequirements, // 0–5
  };
};

/**
 * validateObjectId(paramName)
 * Middleware factory that validates a route parameter is a valid MongoDB ObjectId.
 * Prevents CastError crashes when invalid IDs are passed to Mongoose queries.
 *
 * @param {string} paramName - The route parameter name to validate (default: 'id')
 * @returns Express middleware function
 *
 * Usage: router.get('/:id', validateObjectId('id'), handler)
 */
export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value) {
      return res.status(400).json({ error: `Missing parameter: ${paramName}` });
    }
    // MongoDB ObjectId is a 24-character hex string
    if (!/^[0-9a-fA-F]{24}$/.test(value)) {
      return res.status(400).json({
        error: `Invalid ${paramName}: must be a valid 24-character ID`,
      });
    }
    next();
  };
};

/**
 * sanitizeQuery
 * Middleware that sanitizes common query parameters to prevent NoSQL injection.
 * Strips out any query values that contain MongoDB operators ($gt, $lt, etc.)
 * and ensures pagination params are within safe bounds.
 */
export const sanitizeQuery = (req, res, next) => {
  // Sanitize: remove any keys starting with $ (NoSQL injection prevention)
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string' && value.startsWith('$')) {
      delete req.query[key];
    }
    if (typeof value === 'object' && value !== null) {
      // Remove nested $ operators
      for (const subKey of Object.keys(value)) {
        if (subKey.startsWith('$')) {
          delete value[subKey];
        }
      }
    }
  }

  // Clamp pagination params to safe bounds
  if (req.query.limit) {
    const limit = parseInt(req.query.limit);
    req.query.limit = isNaN(limit) ? 20 : Math.min(Math.max(limit, 1), 100);
  }
  if (req.query.skip) {
    const skip = parseInt(req.query.skip);
    req.query.skip = isNaN(skip) ? 0 : Math.max(skip, 0);
  }
  if (req.query.page) {
    const page = parseInt(req.query.page);
    req.query.page = isNaN(page) ? 1 : Math.max(page, 1);
  }

  next();
};
