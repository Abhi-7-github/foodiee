const mongoose = require("mongoose");

const FoodItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true }, // Store the Cloudinary secure URL
  category: { type: String, default: "General" },
  isVeg: { type: Boolean, default: true },
  isBestseller: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("FoodItem", FoodItemSchema);
