const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const dbName = process.env.MONGO_DB_NAME?.trim();
    await mongoose.connect(process.env.MONGO_URI, dbName ? { dbName } : {});
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
