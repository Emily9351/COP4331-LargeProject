require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { User, StudyGroup } = require("./models");
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
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    res.status(200).json({ message: "Login successful!", userId: user._id });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Create a study group
app.post("/api/study-groups", async (req, res) => {
  try {
    const { name, classId, createdBy, description, isPublic } = req.body;

    if (!name || !classId || !createdBy) {
      return res
        .status(400)
        .json({ message: "Name, classId, and createdBy are required" });
    }

    const newGroup = new StudyGroup({
      name,
      classId,
      createdBy,
      description,
      isPublic,
      memberIds: [createdBy],
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all study groups (optional filtering by classId)
app.get("/api/study-groups", async (req, res) => {
  try {
    const { classId } = req.query;
    const filter = classId ? { classId } : {};
    const groups = await StudyGroup.find(filter);
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get single study group by ID
app.get("/api/study-groups/:id", async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group)
      return res.status(404).json({ message: "Study group not found" });
    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update a study group
app.put("/api/study-groups/:id", async (req, res) => {
  try {
    const updatedGroup = await StudyGroup.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true },
    );
    if (!updatedGroup)
      return res.status(404).json({ message: "Study group not found" });
    res.status(200).json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Delete a study group
app.delete("/api/study-groups/:id", async (req, res) => {
  try {
    const deletedGroup = await StudyGroup.findByIdAndDelete(req.params.id);
    if (!deletedGroup)
      return res.status(404).json({ message: "Study group not found" });
    res.status(200).json({ message: "Study group deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 4️⃣ Frontend static files
const buildPath = path.join(__dirname, "..", "web-frontend", "dist");
const indexPath = path.join(buildPath, "index.html");

if (!fs.existsSync(buildPath) || !fs.existsSync(indexPath)) {
  console.error(
    "Frontend dist folder not found! Run 'npm run build' in web-frontend.",
  );
  process.exit(1);
}

app.use(express.static(buildPath));

// Catch-all for SPA routes (everything not /api goes to index.html)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(indexPath);
});

// 5️⃣ Start server
const PORT = process.env.PORT || 80;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`),
);
