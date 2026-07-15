const mongoose = require("mongoose");

const TeamSessionSchema = new mongoose.Schema({
  teamId: { type: Number, required: true },
  teamName: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  loggedInAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("TeamSession", TeamSessionSchema);
