import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistic18';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });

    console.log('✓ MongoDB connected successfully');
    
    // Create indexes
    await createIndexes();
    
    return mongoose.connection;
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // TTL indexes for automatic data expiration
    await mongoose.connection.db.collection('audit_logs').createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days
    await mongoose.connection.db.collection('alert_cooldowns').createIndex({ cooldownExpiresAt: 1 }, { expireAfterSeconds: 0 });
    
    console.log('✓ Database indexes created');
  } catch (error) {
    console.warn('⚠ Index creation warning (may already exist):', error.message);
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  console.log('✓ MongoDB disconnected');
};

export { connectDB, disconnectDB };
