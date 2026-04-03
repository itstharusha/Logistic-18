const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app.js');
const InventoryItem = require('../../models/InventoryItem.js');
const User = require('../../models/User.js');
const Warehouse = require('../../models/Warehouse.js');

describe('Inventory Routes', () => {
  let authToken;
  let warehouse;

  beforeAll(async () => {
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // Create a test warehouse
    warehouse = await Warehouse.create({
      name: 'Test Warehouse',
      location: 'Test Location',
      capacity: 1000
    });

    // Register and login a user
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Inventory Manager',
        email: 'manager@example.com',
        password: 'TestPassword123',
        orgId: 'org-test-001'
      });

    authToken = registerRes.body.accessToken;
  });

  beforeEach(async () => {
    await InventoryItem.deleteMany({});
  });

  afterAll(async () => {
    await InventoryItem.deleteMany({});
    await Warehouse.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  describe('GET /api/inventory', () => {
    it('should get all inventory items', async () => {
      const res = await request(app)
        .get('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/inventory');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/inventory', () => {
    it('should create a new inventory item', async () => {
      const res = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sku: 'SKU-001',
          name: 'Test Product',
          quantity: 100,
          warehouseId: warehouse._id,
          minThreshold: 20,
          maxThreshold: 500
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('sku', 'SKU-001');
      expect(res.body).toHaveProperty('quantity', 100);
    });

    it('should fail with missing required fields', async () => {
      const res = await request(app)
        .post('/api/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Product'
          // Missing sku, quantity, warehouseId
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('PUT /api/inventory/:id', () => {
    let itemId;

    beforeEach(async () => {
      const item = await InventoryItem.create({
        sku: 'SKU-001',
        name: 'Test Product',
        quantity: 100,
        warehouseId: warehouse._id,
        minThreshold: 20,
        maxThreshold: 500
      });
      itemId = item._id;
    });

    it('should update an inventory item', async () => {
      const res = await request(app)
        .put(`/api/inventory/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 150
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('quantity', 150);
    });

    it('should trigger low stock alert', async () => {
      const res = await request(app)
        .put(`/api/inventory/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 10  // Below minThreshold of 20
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.alerts).toBeDefined();
    });
  });

  describe('DELETE /api/inventory/:id', () => {
    it('should delete an inventory item', async () => {
      const item = await InventoryItem.create({
        sku: 'SKU-DELETE',
        name: 'Delete Test',
        quantity: 50,
        warehouseId: warehouse._id,
        minThreshold: 10,
        maxThreshold: 200
      });

      const res = await request(app)
        .delete(`/api/inventory/${item._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);

      const deleted = await InventoryItem.findById(item._id);
      expect(deleted).toBeNull();
    });
  });
});
