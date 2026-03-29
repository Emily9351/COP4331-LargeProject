require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const { User } = require("./models");

const app = express();

app.use(express.json()); 

connectDB();

// Registration endpoint
app.post("/api/register", async (req, res) => 
{
  try 
    {
    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) 
    {
      return res.status(400).json({ message: "User already exists" });
    }

    user = new User({
      name,         
      email,        
      passwordHash: password 
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
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (password !== user.passwordHash) 
    {
      return res.status(400).json({ message: "Invalid credentials" });
    }
 
    res.status(200).json({ message: "Login successful!", userId: user._id });

  } 
  catch (error) 
  {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));