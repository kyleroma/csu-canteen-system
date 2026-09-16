const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/register", authController.register);
router.post("/login", authController.login);

const { verifyToken } = require("../middleware/auth");

router.get("/me", verifyToken, (req, res) => {
  res.json({ message: "Token is valid.", user: req.user });
});

module.exports = router;
