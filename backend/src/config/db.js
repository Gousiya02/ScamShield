import mongoose from 'mongoose';

export const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error('\n❌ Error: MONGO_URI is not specified in the environment variables.');
    process.exit(1);
  }

  try {
    mongoose.set('strictQuery', false);
    // Short timeout parameters are removed to allow robust production retry/connection handling
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`\n✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`\n❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};
