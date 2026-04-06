const User = require("../models/userSchema");

const authorize = (roles = []) => {
    return async (req, res, next) => {
        try {
            const user = await User.findById(req.user._id || req.user.id);

            if (!user) {
                return res.status(401).json({ message: "User not found." });
            }

            // 1. REAL LOGOUT TRIGGER: Agar status Inactive hai
            if (user.status === "Inactive") {
                return res.status(403).json({
                    logout: true,
                    // Message with User Name
                    message: `Hi ${user.firstName}, your account is currently Inactive. Please contact Admin.`
                });
            }

            // 2. ROLE RESTRICTION (No Logout): Agar role match nahi karta
            if (roles.length > 0 && !roles.includes(user.role)) {
                return res.status(403).json({
                    logout: false,
                    // Message with User Name
                    message: `Access Denied: ${user.firstName}, your current role is "${user.role}". This section is for Admins only.`
                });
            }

            next();
        } catch (error) {
            res.status(500).json({ message: "Authorization error occured." });
        }
    };
};

module.exports = authorize;