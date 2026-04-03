// Jest setup file - runs before all tests
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistic18_test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRY = '24h';

// Suppress console output during tests (optional)
// global.console.log = jest.fn();
// global.console.error = jest.fn();
// global.console.warn = jest.fn();

// Extended timeout for slow operations
jest.setTimeout(30000);
