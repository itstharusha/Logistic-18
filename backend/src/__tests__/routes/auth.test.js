import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app.js';
import User from '../../models/User.js';
import Organisation from '../../models/Organisation.js';
import { connectTestDb, disconnectTestDb, clearDatabase } from '../helpers/testDb.js';

let dbConnected = false;

describe('Auth Routes', () => {
  beforeAll(async () => {
    // Try to connect to test database
    dbConnected = await connectTestDb();
    if (!dbConnected) {
      console.warn('⚠️  Database tests skipped - MongoDB not available');
    }
  });

  beforeEach(async () => {
    if (dbConnected) {
      try {
        await clearDatabase();
      } catch (error) {
        console.warn('Could not clear database before test:', error.message);
      }
    }
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  const skipIfNoDb = dbConnected ? describe : describe.skip;

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'TestPassword123',
          orgId: 'org-test-001'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('should fail with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com'
          // password is missing
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should fail with duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'TestPassword123',
          orgId: 'org-test-001'
        });

      // Second registration with same email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email: 'test@example.com',
          password: 'AnotherPassword123',
          orgId: 'org-test-002'
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'TestPassword123',
          orgId: 'org-test-001'
        });
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('should fail with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        });

      expect(res.statusCode).toBe(401);
    });

    it('should fail with non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPassword123'
        });

      expect(res.statusCode).toBe(401);
    });
  });
});
