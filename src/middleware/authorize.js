// middleware/authorize.js

const authorize = (roles = []) => {
    return (req, res, next) => {
        // Agar user ka role allowed roles ki list mein nahi hai
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access Denied: Your role (${req.user.role}) is not authorized.`
            });
        }
        next();
    };
};

module.exports = authorize;