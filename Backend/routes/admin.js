const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const mongoose = require("mongoose");

const cloudinary = require("../config/cloudinary");
const FoodItem = require("../Models/FoodItem");
const Order = require("../Models/Order");

const router = express.Router();

/* =========================================================
   ENVIRONMENT VARIABLES // are gone
========================================================= */

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_KEY = process.env.ADMIN_KEY;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from environment variables.");
}

if (!ADMIN_KEY) {
  throw new Error("ADMIN_KEY is missing from environment variables.");
}

/* =========================================================
   MULTER CONFIGURATION
========================================================= */

// Store uploaded files temporarily in memory
const storage = multer.memoryStorage();

// Allow only supported image formats
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only JPEG, JPG, PNG, and WEBP images are allowed."),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter
});

/* =========================================================
   ADMIN AUTHENTICATION MIDDLEWARE
========================================================= */

const verifyAdminToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Admin token is missing."
    });
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. Admin token is missing."
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
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Admin session has expired. Please login again."
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid admin token. Please login again."
    });
  }
};

/* =========================================================
   CLOUDINARY UPLOAD HELPER
========================================================= */

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "foodiee_items",
        resource_type: "image"
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/* =========================================================
   1. ADMIN LOGIN
   POST /api/admin/login
========================================================= */

router.post("/login", (req, res) => {
  try {
    const { adminKey } = req.body;

    if (!adminKey || typeof adminKey !== "string") {
      return res.status(400).json({
        success: false,
        message: "Admin security key is required."
      });
    }

    if (adminKey.trim() !== ADMIN_KEY) {
      return res.status(401).json({
        success: false,
        message: "Invalid Admin Key."
      });
    }

    const token = jwt.sign(
      {
        role: "admin"
      },
      JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    return res.status(200).json({
      success: true,
      message: "Admin authenticated successfully.",
      token
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      success: false,
      message: "Admin authentication failed."
    });
  }
});

/* =========================================================
   2. VERIFY ADMIN TOKEN
   GET /api/admin/verify
========================================================= */

router.get("/verify", verifyAdminToken, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Admin authentication verified."
  });
});

/* =========================================================
   3. CREATE FOOD ITEM
   POST /api/admin/food
========================================================= */

router.post(
  "/food",
  verifyAdminToken,

  // Handle Multer errors manually
  (req, res, next) => {
    upload.single("image")(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Image size must not exceed 5MB."
          });
        }

        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      next();
    });
  },

  async (req, res) => {
    let uploadedPublicId = null;

    try {
      const {
        name,
        description,
        price,
        category,
        isVeg,
        isBestseller
      } = req.body;

      /* -------------------------
         Validate required fields
      ------------------------- */

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Food item name is required."
        });
      }

      if (!description || !description.trim()) {
        return res.status(400).json({
          success: false,
          message: "Food item description is required."
        });
      }

      if (price === undefined || price === null || price === "") {
        return res.status(400).json({
          success: false,
          message: "Food item price is required."
        });
      }

      const parsedPrice = Number(price);

      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid number greater than 0."
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "An image file is required for the food item."
        });
      }

      /* -------------------------
         Parse boolean values
      ------------------------- */

      const parsedIsVeg =
        isVeg === undefined
          ? true
          : String(isVeg).toLowerCase() === "true";

      const parsedIsBestseller =
        String(isBestseller).toLowerCase() === "true";

      /* -------------------------
         Upload image
      ------------------------- */

      console.log("Uploading food image to Cloudinary...");

      const uploadResult = await uploadToCloudinary(
        req.file.buffer
      );

      uploadedPublicId = uploadResult.public_id;

      console.log(
        "Cloudinary upload successful:",
        uploadResult.secure_url
      );

      /* -------------------------
         Save food item
      ------------------------- */

      const newFoodItem = new FoodItem({
        name: name.trim(),

        description: description.trim(),

        price: parsedPrice,

        category:
          category && category.trim()
            ? category.trim()
            : "General",

        image: uploadResult.secure_url,

        cloudinaryPublicId: uploadResult.public_id,

        isVeg: parsedIsVeg,

        isBestseller: parsedIsBestseller
      });

      await newFoodItem.save();

      return res.status(201).json({
        success: true,
        message: "Food item added successfully.",
        foodItem: newFoodItem
      });
    } catch (error) {
      console.error("Error creating food item:", error);

      /*
       If Cloudinary upload succeeded but MongoDB save failed,
       remove the uploaded image to avoid orphan files.
      */

      if (uploadedPublicId) {
        try {
          await cloudinary.uploader.destroy(
            uploadedPublicId
          );
        } catch (cloudinaryError) {
          console.error(
            "Failed to clean up Cloudinary image:",
            cloudinaryError
          );
        }
      }

      return res.status(500).json({
        success: false,
        message: "An error occurred while creating the food item."
      });
    }
  }
);

/* =========================================================
   4. GET ALL FOOD ITEMS
   GET /api/admin/food
========================================================= */

router.get("/food", async (req, res) => {
  try {
    const foodItems = await FoodItem.find()
      .sort({ createdAt: -1 });

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

/* =========================================================
   5. DELETE FOOD ITEM
   DELETE /api/admin/food/:id
========================================================= */

router.delete(
  "/food/:id",
  verifyAdminToken,
  async (req, res) => {
    const { id } = req.params;

    try {
      /* -------------------------
         Validate MongoDB ID
      ------------------------- */

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid food item ID."
        });
      }

      /* -------------------------
         Find food item
      ------------------------- */

      const foodItem = await FoodItem.findById(id);

      if (!foodItem) {
        return res.status(404).json({
          success: false,
          message: "Food item not found."
        });
      }

      /* -------------------------
         Delete Cloudinary image
      ------------------------- */

      if (foodItem.cloudinaryPublicId) {
        try {
          await cloudinary.uploader.destroy(
            foodItem.cloudinaryPublicId
          );
        } catch (cloudinaryError) {
          console.error(
            "Cloudinary image deletion failed:",
            cloudinaryError
          );

          // Continue deleting DB record
        }
      }

      /* -------------------------
         Delete database record
      ------------------------- */

      await FoodItem.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: `Food item '${foodItem.name}' deleted successfully.`
      });
    } catch (error) {
      console.error(
        "Delete food item error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to delete the food item."
      });
    }
  }
);

/* =========================================================
   6. GET ALL ORDERS
   GET /api/admin/orders
========================================================= */

router.get(
  "/orders",
  verifyAdminToken,
  async (req, res) => {
    try {
      const orders = await Order.find()
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        orders
      });
    } catch (error) {
      console.error(
        "Admin fetch orders error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve orders."
      });
    }
  }
);

/* =========================================================
   7. UPDATE ORDER STATUS
   PUT /api/admin/orders/:id
========================================================= */

router.put(
  "/orders/:id",
  verifyAdminToken,
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    /* -------------------------
       Validate MongoDB ID
    ------------------------- */

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID."
      });
    }

    /* -------------------------
       Validate status
    ------------------------- */

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required."
      });
    }

    const validStatuses = [
      "Pending",
      "Accepted",
      "Rejected",
      "Delivered"
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(
          ", "
        )}`
      });
    }

    try {
      const updatedOrder =
        await Order.findByIdAndUpdate(
          id,
          {
            status
          },
          {
            new: true,
            runValidators: true
          }
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
      console.error(
        "Admin update order status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to update order status."
      });
    }
  }
);

module.exports = router;