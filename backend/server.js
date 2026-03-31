require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { User } = require("./models");
const bcrypt = require("bcrypt");

const app = express();

// 1️⃣ Middleware
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json()); // MUST be before API routes


connectDB();

// 3️⃣ API Routes
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    user = new User({
      name,
      email,
      passwordHash: hashedPassword,
      role: role === "professor" ? "professor" : "student",
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    res.status(200).json({ message: "Login successful!", userId: user._id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

///User APIs
app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-passwordHash")
      .populate("enrolledClasses", "courseCode title semester section");

    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  try {
    const { name, email, profilePictureUrl } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, profilePictureUrl },
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!user)
      return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user)
      return res.status(404).json({ message: "User not found" });
    

    if(user.enrolledClasses && user.enrolledClasses.length > 0){
      await Class.updateMany(
        { studentIds: req.params.id },
        { $pull: { studentIds: req.params.id } }
      );
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



// 4️⃣ Frontend static files
const buildPath = path.join(__dirname, "..", "web-frontend", "dist");
const indexPath = path.join(buildPath, "index.html");

if (!fs.existsSync(buildPath) || !fs.existsSync(indexPath)) {
  console.error("Frontend dist folder not found! Run 'npm run build' in web-frontend.");
  process.exit(1);
}

app.use(express.static(buildPath));

// Catch-all for SPA routes (everything not /api goes to index.html)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(indexPath);
});

// 5️⃣ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));