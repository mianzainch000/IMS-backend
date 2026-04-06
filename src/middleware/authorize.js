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
                    logout: true, // Frontend ko batane ke liye
                    message: "Access Denied: Your account is currently Inactive."
                });
            }

            // 2. ROLE RESTRICTION (No Logout): Agar role match nahi karta
            if (roles.length > 0 && !roles.includes(user.role)) {
                // Yahan hum 403 ki jagah 200 ya 403 with 'logout: false' bhej sakte hain
                return res.status(403).json({
                    logout: false, // <--- Yeh flag logout ko rokega
                    message: `Permission Denied: Admins only.`
                });
            }

            next();
        } catch (error) {
            res.status(500).json({ message: "Authorization error occured." });
        }
    };
};

module.exports = authorize;