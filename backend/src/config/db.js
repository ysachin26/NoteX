const mongoose = require('mongoose')

const connectDB = async () => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        console.error('No MongoDB connection string found in environment (MONGODB_URI or MONGO_URI)');
        process.exit(1);
    }
    try {
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`failed connection`, err);
        process.exit(1);
    }
}

module.exports = connectDB;