// Test database setup utility
import mongoose from 'mongoose';

export async function connectTestDb() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistic18_test';
  
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
    }
    return true;
  } catch (error) {
    console.warn('⚠️  Could not connect to MongoDB test database:', error.message);
    return false;
  }
}

export async function disconnectTestDb() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (error) {
    console.warn('Could not disconnect from MongoDB:', error.message);
  }
}

export async function clearDatabase() {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  } catch (error) {
    console.warn('Could not clear database:', error.message);
  }
}
