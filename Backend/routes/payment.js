const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const PaymentConfig = require("../Models/PaymentConfig");
const TeamSession = require("../Models/TeamSession");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "foodiee_secret_key_123456";

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Middleware: Verify Admin
const verifyAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  if (!token) return res.status(401).json({ success: false, message: "Unauthorized. Admin token missing." });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden. Admin access required." });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired admin session." });
  }
};

// Middleware: Verify Team
const verifyTeam = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  if (!token) return res.status(401).json({ success: false, message: "Unauthorized. Team token missing." });
  try {
    const session = await TeamSession.findOne({ token });
    if (!session) return res.status(401).json({ success: false, message: "Invalid session." });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.team = { id: session.teamId, teamName: session.teamName };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Session expired." });
  }
};

// Tool: Upload Buffer helper
const uploadToCloudinary = (fileBuffer, folder = "foodiee_payments") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.write(fileBuffer);
    uploadStream.end();
  });
};

// 1. Get Payment Configuration
router.get("/config", async (req, res) => {
  try {
    let config = await PaymentConfig.findOne({});
    if (!config) {
      config = new PaymentConfig({ isActive: false, qrCodeUrl: "" });
      await config.save();
    }
    return res.status(200).json({ success: true, config });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Update Payment Configuration (Admin ONLY)
router.post("/config", verifyAdmin, upload.single("qrCode"), async (req, res) => {
  try {
    const { isActive } = req.body;
    let config = await PaymentConfig.findOne({});
    if (!config) {
      config = new PaymentConfig();
    }
    
    if (isActive !== undefined) {
      config.isActive = String(isActive) === "true";
    }

    if (req.file) {
      const uploadRes = await uploadToCloudinary(req.file.buffer, "foodiee_qr_codes");
      config.qrCodeUrl = uploadRes.secure_url;
    }

    await config.save();
    return res.status(200).json({ success: true, message: "Payment settings saved successfully.", config });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Client upload screenshot helper
router.post("/upload-screenshot", verifyTeam, upload.single("screenshot"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No screenshot file uploaded." });
    }
    const uploadRes = await uploadToCloudinary(req.file.buffer, "foodiee_payments");
    return res.status(200).json({ success: true, imageUrl: uploadRes.secure_url });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
