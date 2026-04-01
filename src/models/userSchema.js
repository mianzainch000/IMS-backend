const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    set: (value) => value.trim(),
  },
  lastName: {
    type: String,
    required: true,
    set: (value) => value.trim(),
  },
  email: {
    type: String,
    required: true,
    unique: true,
    set: (value) => value.trim(),
  },
  password: { type: String, required: true },

});

module.exports = mongoose.model("User", userSchema);
