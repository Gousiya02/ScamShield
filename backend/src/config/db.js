import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('data');

// Ensure local data directory exists for local JSON DB fallback
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let isUsingLocalJSONDb = false;

// Custom Lightweight JSON Database Engine for Seamless Fallback
class LocalJSONDb {
  constructor(collectionName) {
    this.filePath = path.join(DATA_DIR, `${collectionName}.json`);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]));
    }
  }

  read() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data || '[]');
    } catch (err) {
      console.error(`Error reading ${this.filePath}:`, err);
      return [];
    }
  }

  write(data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Error writing ${this.filePath}:`, err);
    }
  }

  async find(query = {}) {
    const items = this.read();
    return items.filter(item => {
      for (let key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
  }

  async findOne(query = {}) {
    const items = this.read();
    return items.find(item => {
      for (let key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    }) || null;
  }

  async findById(id) {
    return this.findOne({ id });
  }

  async create(doc) {
    const items = this.read();
    const newDoc = {
      id: Math.random().toString(36).substring(2, 11),
      _id: Math.random().toString(36).substring(2, 11), // support both formats
      createdAt: new Date().toISOString(),
      ...doc
    };
    items.push(newDoc);
    this.write(items);
    return newDoc;
  }

  async updateOne(query, update) {
    const items = this.read();
    const index = items.findIndex(item => {
      for (let key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
    if (index === -1) return false;
    
    // Simple update logic ($set support)
    const currentItem = items[index];
    const updatedFields = update.$set ? update.$set : update;
    items[index] = { ...currentItem, ...updatedFields, updatedAt: new Date().toISOString() };
    this.write(items);
    return items[index];
  }
}

export const collections = {
  users: new LocalJSONDb('users'),
  scamReports: new LocalJSONDb('scam_reports'),
  scanHistory: new LocalJSONDb('scan_history'),
  quizzes: new LocalJSONDb('quizzes')
};

export const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.log('\n⚠️  MONGO_URI not specified. Starting in LOCAL JSON DATABASE mode.');
    isUsingLocalJSONDb = true;
    return true;
  }

  try {
    mongoose.set('strictQuery', false);
    // Setting bufferTimeoutMS and serverSelectionTimeoutMS short to check quickly if MongoDB is running
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`\n✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.log(`\n⚠️  MongoDB connection failed: ${error.message}`);
    console.log('🤖 Gracefully falling back to LOCAL JSON DATABASE Engine (no MongoDB installation required).\n');
    isUsingLocalJSONDb = true;
    return true;
  }
};

export const isLocalDb = () => isUsingLocalJSONDb;
