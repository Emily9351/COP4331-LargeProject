require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const { User } = require("./models");

const app = express();

app.use(express.json()); 

connectDB();

const bcrypt = require("bcrypt");

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user = new User({
      name,
      email,
      passwordHash: hashedPassword,
      role: role === "professor" ? "professor" : "student"
    });

    await user.save();

    res.status(201).json({ message: "User registered successfully!" });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Login endpoint
app.post("/api/login", async (req, res) => 
{
  try 
  {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) 
    {
      console.log("User not found");
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);  
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    res.status(200).json({ message: "Login successful!", userId: user._id });

  } 
  catch (error) 
  {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));