const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../models");
const User = db.User;

exports.register = async (req, res) => {
  try {
    const { email, password, full_name, role, phone } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({
        message: "Email, password, and full name are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters.",
      });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      phone: phone || null,
      password_hash,
      full_name,
      role: role || "STUDENT",
    });

    return res.status(201).json({
      message: "Account created successfully.",
      user: {
        user_id: user.user_id,
        email: user.email,
        phone: user.phone,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { user_id: user.user_id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong." });
  }
};
