const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
router.post(
  "/signup",
  userController.validate("signup"),
  userController.signup,
);
router.post("/login", userController.validate("login"), userController.login);

router.post(
  "/forgotPassword",
  userController.validate("forgotPassword"),
  userController.forgotPassword,
);

router.post(
  "/resetPassword/:tokenEmail",
  userController.validate("resetPassword"),
  userController.resetPassword,
);

router.get(
  "/allUsers",
  authenticate,
  authorize(["Admin", "Editor", "Viewer"]),
  userController.getAllUsers,
);

router.put(
  "/updateRole/:id",
  authenticate,
  authorize(["Admin"]),
  userController.updateUserRole,
);

router.put(
  "/adminResetPassword/:id",
  authenticate,
  authorize(["Admin"]),
  userController.adminResetPassword,
);
module.exports = router;
