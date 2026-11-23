import mongoose from 'mongoose';
let mongod = null;
export const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) {
        return;
    }
    try {
        let mongoUri = process.env.MONGODB_URI;
        if (!mongoUri || mongoUri.trim() === '') {
            if (process.env.VERCEL) {
                throw new Error('MONGODB_URI environment variable is required on Vercel. Please add your MongoDB Atlas connection string in Vercel Project Settings > Environment Variables.');
            }
            console.log('⚡ No MONGODB_URI found. Initializing in-memory MongoDB for local development...');
            const { MongoMemoryServer } = await import('mongodb-memory-server');
            mongod = await MongoMemoryServer.create();
            mongoUri = mongod.getUri();
            console.log(`✅ In-memory MongoDB started at: ${mongoUri}`);
        }
        mongoose.set('strictQuery', true);
        await mongoose.connect(mongoUri, {
            dbName: process.env.DB_NAME || 'salonbook',
            serverSelectionTimeoutMS: 10000,
        });
        console.log(`🚀 Connected to MongoDB: ${mongoose.connection.host}/${mongoose.connection.name}`);
    }
    catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        if (!process.env.VERCEL) {
            process.exit(1);
        }
        throw error;
    }
};
export const closeDB = async () => {
    await mongoose.disconnect();
    if (mongod) {
        await mongod.stop();
    }
};
