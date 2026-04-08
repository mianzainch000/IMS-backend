const express = require("express");
const router = express.Router();
const {
  getCategories,
  addCategory,
  deleteCategory,
  updateCategory,
} = require("../controllers/categoryController");

const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

router.get(
  "/getCategory",
  authenticate,
  authorize(["Admin", "Editor", "Viewer"]),
  getCategories,
);

router.post(
  "/addCategory",
  authenticate,
  authorize(["Admin", "Editor"]),
  addCategory,
);

router.put(
  "/updateCategory/:id",
  authenticate,
  authorize(["Admin", "Editor"]),
  updateCategory,
);

router.delete(
  "/deleteCategory/:id",
  authenticate,
  authorize(["Admin"]),
  deleteCategory,
);

module.exports = router;
