const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { User } = require("./models");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const sendVerificationEmail = require("./utils/SendVerificationEmail");
const sendPasswordResetEmail = require("./utils/SendPasswordResetEmailSendGrid");

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());



connectDB();

// REGISTER
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    user = new User({
      name,
      email,
      passwordHash: hashedPassword,
      role: role === "professor" ? "professor" : "student",
      verificationCode,
      verificationCodeExpires,
    });

    await user.save();
    await sendVerificationEmail(email, verificationCode);

    res.status(201).json({ message: "Check your email for a verification code.", userId: user._id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// VERIFY EMAIL
app.post("/api/verify-email", async (req, res) => {
  try {
    const { userId, code } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isVerified) return res.status(400).json({ message: "Already verified" });

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Invalid code" });
    }

    if (user.verificationCodeExpires < new Date()) {
      return res.status(400).json({ message: "Code has expired, please register again" });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    res.json({ message: "Email verified successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email before logging in" });
    }

    res.status(200).json({ message: "Login successful!", userId: user._id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// FORGOT PASSWORD
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether user exists for security
      return res.status(200).json({ message: "If that email exists, a reset link has been sent." });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    // Send the password reset email
    const emailResult = await sendPasswordResetEmail(email, resetToken);
    
    if (!emailResult || !emailResult.success) {
      console.error("❌ Failed to send reset email, but returning success to user for security");
      // Still return success for security (don't reveal if email exists)
      // But log the actual error for debugging
    }

    res.status(200).json({ message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// RESET PASSWORD
app.post("/api/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.passwordHash = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful! You can now log in." });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Frontend static files
const buildPath = path.join(__dirname, "..", "web-frontend", "dist");
const indexPath = path.join(buildPath, "index.html");

if (!fs.existsSync(buildPath) || !fs.existsSync(indexPath)) {
  console.error("Frontend dist folder not found! Run 'npm run build' in web-frontend.");
  process.exit(1);
}

app.use(express.static(buildPath));

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(indexPath);
});

const PORT = process.env.PORT || 80;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
