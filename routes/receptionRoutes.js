const express = require("express");
const { registerReception, loginReception, getReceptions, logout } = require("../controllers/receptionController");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

router.post("/signup", upload.single("profileImage"), protect, registerReception);
router.post("/login", loginReception);
router.post("/logout", logout);
router.get("/", protect, getReceptions);

module.exports = router;
