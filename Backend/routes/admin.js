const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const FoodItem = require("../models/FoodItem");
const Order = require("../models/Order");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "foodiee_secret_key_123456";
const ADMIN_KEY = process.env.ADMIN_KEY || "admin123";

// Configure Multer memory storage (files are parsed into buffers)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // limit file size to 5MB
});

// Middleware to verify Admin JWT
const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access Denied. Admin token is missing."
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden. Access restricted to administrators."
      });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid token."
    });
  }
};

// Helper: Native uploader stream writing to Cloudinary
const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "foodiee_items" },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
    uploadStream.write(fileBuffer);
    uploadStream.end();
  });
};

// 1. Admin Login Endpoint
router.post("/login", (req, res) => {
  const { adminKey } = req.body;

  if (!adminKey) {
    return res.status(400).json({
      success: false,
      message: "Admin security key is required."
    });
  }

  if (adminKey !== ADMIN_KEY) {
    return res.status(401).json({
      success: false,
      message: "Invalid Admin Key. Please check your config parameters."
    });
  }

  const token = jwt.sign(
    { role: "admin", verifiedAt: new Date() },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  return res.status(200).json({
    success: true,
    message: "Admin authenticated successfully.",
    token
  });
});

// 2. Admin Verification status endpoint
router.get("/verify", verifyAdminToken, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Admin authentication verified."
  });
});

// 3. Create a new Food Item (Admin only + Cloudinary Upload)
router.post("/food", verifyAdminToken, upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, category } = req.body;

    // Basic Validation
    if (!name || !description || !price) {
      return res.status(400).json({
        success: false,
        message: "name, description, and price are required fields."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "An image file is required for the food item."
      });
    }

    console.log("Uploading file to Cloudinary...");
    // Upload image buffer directly to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer);
    console.log("Cloudinary upload successful:", uploadResult.secure_url);

    // Save food item to Database
    const newFoodItem = new FoodItem({
      name,
      description,
      price: Number(price),
      category: category || "General",
      image: uploadResult.secure_url // Cloudinary Image URL
    });

    await newFoodItem.save();

    return res.status(201).json({
      success: true,
      message: "Food item added successfully.",
      foodItem: newFoodItem
    });
  } catch (error) {
    console.error("Error creating food item:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred while creating the food item."
    });
  }
});

// 4. Get All Food Items
router.get("/food", async (req, res) => {
  try {
    const foodItems = await FoodItem.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      foodItems
    });
  } catch (error) {
    console.error("Fetch food items error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve food items."
    });
  }
});

// 5. Delete Food Item (Admin only)
router.delete("/food/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await FoodItem.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Food item not found."
      });
    }
    return res.status(200).json({
      success: true,
      message: `Food item '${deleted.name}' deleted successfully.`
    });
  } catch (error) {
    console.error("Delete food item error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete the food item."
    });
  }
});

// 6. Get All Orders (Admin only)
router.get("/orders", verifyAdminToken, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error("Admin fetch orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve orders."
    });
  }
});

// 7. Update Order Status (Admin only)
router.put("/orders/:id", verifyAdminToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: "Status is required."
    });
  }

  const validStatuses = ["Pending", "Accepted", "Rejected", "Delivered"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    });
  }

  try {
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: `Order status revised successfully to ${status}.`,
      order: updatedOrder
    });
  } catch (error) {
    console.error("Admin update order status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order status."
    });
  }
});

module.exports = router;
