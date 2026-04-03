export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: ['src/__tests__/**/*.test.js'],
  coveragePathIgnorePatterns: ['/node_modules/', 'src/__tests__/'],
  testTimeout: 30000,
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};
