const User = require("../models/userSchema");

const authorize = (roles = []) => {
    return async (req, res, next) => {
        try {
            // 1. Database se fresh user data nikaalna zaroori hai
            const user = await User.findById(req.user._id);

            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            // 2. CHECK: Agar admin ne user ko Inactive kar diya hai
            if (user.status === "Inactive") {
                return res.status(403).json({
                    message: "Access Denied: Your account is currently Inactive."
                });
            }

            // 3. CHECK: Role authorization
            if (roles.length > 0 && !roles.includes(user.role)) {
                return res.status(403).json({
                    message: `Access Denied: Your role (${user.role}) is not authorized.`
                });
            }

            next(); // Sab theek hai, agay jane do
        } catch (error) {
            console.error("Authorization Error:", error);
            res.status(500).json({ message: "Authorization error occured." });
        }
    };
};

module.exports = authorize;