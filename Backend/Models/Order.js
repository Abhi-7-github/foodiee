const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true
  },
  items: [
    {
      foodItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoodItem"
      },
      name: {
        type: String,
        required: true
      },
      price: {
        type: Number,
        required: true
      },
      quantity: {
        type: Number,
        required: true
      }
    }
  ],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    default: "Pending",
    enum: ["Pending", "Accepted", "Rejected", "Delivered"]
  },
  transactionId: {
    type: String,
    sparse: true
  },
  paymentScreenshot: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Order", OrderSchema);
