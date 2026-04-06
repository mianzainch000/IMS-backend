const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize"); // Naya middleware
router.post(
    "/signup",
    userController.validate("signup"),
    userController.signup
);
router.post("/login", userController.validate("login"), userController.login);

router.post(
    "/forgotPassword",
    userController.validate("forgotPassword"),
    userController.forgotPassword
);

router.post(
    "/resetPassword/:tokenEmail",
    userController.validate("resetPassword"),
    userController.resetPassword
);

// router.js mein Admin ke sath Viewer/Editor bhi add kar dein
router.get("/allUsers", authenticate, authorize(["Admin", "Editor", "Viewer"]), userController.getAllUsers);
// 2. Kisi user ka role badalne ke liye (PUT)
router.put("/updateRole/:id", authenticate, authorize(["Admin"]), userController.updateUserRole);

// Admin power to reset any user's password
router.put(
    "/adminResetPassword/:id",
    authenticate,
    authorize(["Admin"]),
    userController.adminResetPassword
);
module.exports = router;
