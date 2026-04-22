const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, set: (v) => v.trim() },
    lastName: { type: String, required: true, set: (v) => v.trim() },
    email: { type: String, required: true, unique: true, set: (v) => v.trim() },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["Admin", "Editor", "Viewer"],
      default: "Viewer",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
