import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      autoIndex: true, // Force index recreation
    });

    // Force recreate indexes for the Favorite model
    const collections = await conn.connection.db.listCollections().toArray();
    const favoriteCollection = collections.find((c) => c.name === "favorites");
    if (favoriteCollection) {
      await conn.connection.db.collection("favorites").dropIndexes();
    }

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
