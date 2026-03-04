import joi from 'joi';

// Validation schemas
export const schemas = {
  // User registration
  register: joi.object({
    name: joi.string().min(2).max(100).required(),
    email: joi.string().email().required(),
    password: joi.string().min(8).max(50).required().pattern(/(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])/),
    orgId: joi.string().required(),
  }),

  // User login
  login: joi.object({
    email: joi.string().email().required(),
    password: joi.string().required(),
  }),

  // User update
  updateUser: joi.object({
    name: joi.string().min(2).max(100).optional(),
    email: joi.string().email().optional(),
    role: joi.string().valid('VIEWER', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER', 'RISK_ANALYST', 'ORG_ADMIN').optional(),
    isActive: joi.boolean().optional(),
  }),

  // Role assignment
  assignRole: joi.object({
    userId: joi.string().required(),
    role: joi.string().valid('VIEWER', 'LOGISTICS_OPERATOR', 'INVENTORY_MANAGER', 'RISK_ANALYST', 'ORG_ADMIN').required(),
  }),

  // Change password
  changePassword: joi.object({
    currentPassword: joi.string().required(),
    newPassword: joi.string().min(8).max(50).required().pattern(/(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])/),
  }),

  // Refresh token
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
};

// Validation middleware factory
export const validate = (schemaKey) => {
  return (req, res, next) => {
    const schema = schemas[schemaKey];
    
    if (!schema) {
      return res.status(500).json({ error: 'Validation schema not found' });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details });
    }

    // Replace req.body with validated value
    req.validatedBody = value;
    next();
  };
};

// Password strength validator
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
    score: meetsRequirements,
  };
};
