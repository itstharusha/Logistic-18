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
