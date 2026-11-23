import mongoose from 'mongoose';

let mongod: any = null;

export const connectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    // Check MONGODB_URI, Vercel Integration MONGODB_1_MONGODB_URI, or any MONGODB_*_URI
    let mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGODB_1_MONGODB_URI ||
      process.env.DATABASE_URL;

    if (!mongoUri || mongoUri.trim() === '') {
      for (const [key, value] of Object.entries(process.env)) {
        if (key.startsWith('MONGODB') && key.endsWith('URI') && value && value.trim() !== '') {
          mongoUri = value;
          break;
        }
      }
    }

    if (!mongoUri || mongoUri.trim() === '') {
      if (process.env.VERCEL) {
        throw new Error(
          'MONGODB_URI or MONGODB_1_MONGODB_URI is required on Vercel. Please add or check your MongoDB Atlas connection string in Vercel Project Settings > Environment Variables.'
        );
      }
      console.log('⚡ No MONGODB_URI found. Initializing in-memory MongoDB for local development...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      mongoUri = mongod.getUri();
      console.log(`✅ In-memory MongoDB started at: ${mongoUri}`);
    }

    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoUri!, {
      dbName: process.env.DB_NAME || 'salonbook',
      serverSelectionTimeoutMS: 10000,
    });

    console.log(`🚀 Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error: any) {
    console.error('❌ MongoDB connection error:', error.message);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw error;
  }
};

export const closeDB = async (): Promise<void> => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
};
