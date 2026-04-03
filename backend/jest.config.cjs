module.exports = {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['<rootDir>/src/__tests__/**/*.test.js'],
  coveragePathIgnorePatterns: ['/node_modules/', 'src/__tests__/'],
  testTimeout: 30000,
};
