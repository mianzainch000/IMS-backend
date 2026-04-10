const User = require("../models/userSchema");

const authorize = (roles = []) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id || req.user.id);

      if (!user) {
        return res.status(401).json({ message: "User not found." });
      }


      if (user.status === "Inactive") {
        return res.status(403).json({ logout: true, message: "Account Inactive" });
      }

      if (req.user.role !== user.role) {
        return res.status(403).json({
          logout: true,
          message: "Role updated. Please login again."
        });
      }

      if (roles.length > 0 && !roles.includes(user.role)) {
        return res.status(403).json({ logout: true, message: "Access Denied" });
      }

      next();
    } catch (error) {
      res.status(500).json({ message: "Authorization error." });
    }
  };
};

// ⚠️ YAHAN CHECK KAREIN: Brackets ke bagair export karein
module.exports = authorize;