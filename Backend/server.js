const mongoose = require("mongoose");
const dotenv = require("dotenv");
const app = require("./app");

dotenv.config();

const PORT = process.env.PORT || 7700;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/foodiee";

// My mongodb connection
console.log("Connecting to MongoDB...");
mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    console.log("Starting server in fallback database-free mode...");
  });

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});