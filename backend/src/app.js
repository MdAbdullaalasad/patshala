import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";
import dotenv from "dotenv";

// dotenv কনফিগারেশন
dotenv.config();

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", process.env.PORT || 8000);

app.use(cors());
app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);

const start = async () => {
  try {
    // .env ফাইল থেকে MONGO_URL নেওয়া হচ্ছে, না থাকলে ব্যাকআপ লিঙ্ক ব্যবহার করবে (টাইপো ঠিক করে দেওয়া হয়েছে)
    const mongoUri =
      process.env.MONGO_URL ||
      "mongodb+srv://mdabdullaalasad2001_db_user:1C2jG7Vxo2fqblyK@cluster0.w2g8wgf.mongodb.net/patshala?appName=Cluster0";

    const connectionDb = await mongoose.connect(mongoUri);

    console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`);
    
    server.listen(app.get("port"), () => {
      console.log(`SERVER LISTENING ON PORT ${app.get("port")}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
};

start();