const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, set: (v) => v.trim() },
  lastName: { type: String, required: true, set: (v) => v.trim() },
  email: { type: String, required: true, unique: true, set: (v) => v.trim() },
  password: { type: String, required: true },

  // Nayi fields yahan add karein
  role: {
    type: String,
    enum: ["Admin", "Editor", "Viewer"],
    default: "Viewer"
  },
  status: {
    type: String,
    enum: ["Active", "Inactive"],
    default: "Active"
  },
}, { timestamps: true }); // Timestamps se pata chalega user kab bana

module.exports = mongoose.model("User", userSchema);