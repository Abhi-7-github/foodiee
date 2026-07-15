const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const TeamSession = require("../models/TeamSession");
const Order = require("../models/Order");

const router = express.Router();
const getSecret = () => process.env.JWT_SECRET || "foodiee_secret_key_123456";

// Middleware to verify active team session
const verifyTeamToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  const logPath = path.join(__dirname, "../test.log");
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] authHeader present: ${!!authHeader}, token: ${token ? token.substring(0, 15) : "none"}\n`);

  if (!token) {
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Rejected: No token provided\n`);
    return res.status(401).json({
      success: false,
      message: "Access Denied. Please login first."
    });
  }

  try {
    const session = await TeamSession.findOne({ token });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] DB Session found: ${!!session}\n`);

    if (!session) {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] Rejected: Session not found in DB\n`);
      return res.status(401).json({
        success: false,
        message: "Session expired or invalid. Please login again."
      });
    }

    const decoded = jwt.verify(token, getSecret());
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] JWT Verified. Team: ${decoded.teamName}\n`);
    
    req.team = {
      id: session.teamId,
      teamName: session.teamName
    };
    next();
  } catch (error) {
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Rejected: JWT error: ${error.message}\n`);
    return res.status(401).json({
      success: false,
      message: "Session invalid or expired."
    });
  }
};

// 1. Create a new Order
router.post("/", verifyTeamToken, async (req, res) => {
  try {
    const { items, transactionId, paymentScreenshot } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items are required."
      });
    }

    if (transactionId) {
      const existing = await Order.findOne({ transactionId });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "This Transaction ID has already been used for another order."
        });
      }
    }

    // Calculate total amount
    let totalAmount = 0;
    const formattedItems = [];

    for (const item of items) {
      if (!item.name || !item.price || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: "Each item must have a name, price, and quantity."
        });
      }
      totalAmount += Number(item.price) * Number(item.quantity);
      formattedItems.push({
        foodItemId: item.foodItemId || null,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity)
      });
    }

    const newOrder = new Order({
      teamName: req.team.teamName,
      items: formattedItems,
      totalAmount: totalAmount,
      status: "Pending",
      transactionId: transactionId || undefined,
      paymentScreenshot: paymentScreenshot || undefined
    });

    await newOrder.save();

    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      order: newOrder
    });
  } catch (error) {
    console.error("Order creation error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while placing the order."
    });
  }
});

// 2. Retrieve past Orders for user's team
router.get("/", verifyTeamToken, async (req, res) => {
  try {
    const orders = await Order.find({ teamName: req.team.teamName }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error("Order retrieval error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving orders."
    });
  }
});

module.exports = router;
