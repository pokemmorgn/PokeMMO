import mongoose from "mongoose";

const uri = "mongodb://localhost:27017/pokeworld"; // Mets directement la DB dans l'URI

export async function connectDB() {
  if (mongoose.connection.readyState !== 0) return;

  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    } as any); // cast si TS râle
    console.log("✅ Connected to MongoDB: pokeworld");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    throw err;
  }
}
