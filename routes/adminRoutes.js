const express = require("express");
const { registerAdmin, loginAdmin, logoutAdmin, getAdmins, deleteAdmin } = require("../controllers/adminController");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const Admin = require("../models/Admin");
const upload = require("../middleware/uploadMiddleware");


// Conditionally apply protect middleware for the /register route:
// If at least one admin exists, require a valid admin token; otherwise, allow registration.
router.post("/signup", upload.single("profileImage") ,(req, res, next) => {
  Admin.countDocuments({})
    .then((count) => {
      if (count > 0) {
        // If any admin exists, run the protect middleware.
        return protect(req, res, next);
      } else {
        // No admin exists yet; proceed without token.
        next();
      }
    })
    .catch((err) => next(err));
}, registerAdmin);

router.post("/login", loginAdmin);
router.post("/logout", logoutAdmin);
router.get("/", protect, getAdmins);
router.delete("/:id", protect, deleteAdmin);

module.exports = router;
