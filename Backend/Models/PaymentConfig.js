const mongoose = require("mongoose");

const PaymentConfigSchema = new mongoose.Schema({
  isActive: {
    type: Boolean,
    default: false
  },
  qrCodeUrl: {
    type: String,
    default: ""
  }
});

module.exports = mongoose.model("PaymentConfig", PaymentConfigSchema);
