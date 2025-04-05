const express = require("express");
const { login, logout, checkAdminExists , getProfile} = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/profile", getProfile);

router.get("/check-admin", checkAdminExists);

module.exports = router;
