require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { User, Class, StudyGroup, Task } = require("./models");
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

///USER API
////////////////////////////////////////////////////////////////////////////////////////////////

//get user
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

//update user
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

//delete user
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

    await StudyGroup.updateMany(
      { memberIds: req.params.id },
      { $pull: { memberIds: req.params.id } }
    );

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//CLASS API
/////////////////////////////////////////////////////////////////////////////////////////////////

//create class
app.post("/api/classes", async (req, res) => {
  try {
    const { courseCode, title, professorId, semester, section } = req.body;
 
    if (!courseCode || !title || !professorId)
      return res.status(400).json({ message: "courseCode, title, and professorId are required" });
 
    const newClass = new Class({
      courseCode,
      title,
      professorId,
      studentIds: [],
      semester,
      section,
    });
 
    await newClass.save();
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//get all classes
app.get("/api/classes", async (req, res) => {
  try {
    const classes = await Class.find()
      .populate("professorId", "name email");
 
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Get a single class
app.get("/api/classes/:id", async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id)
      .populate("professorId", "name email")
      .populate("studentIds", "name email");
 
    if (!cls)
      return res.status(404).json({ message: "Class not found" });
 
    res.json(cls);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update a class
app.put("/api/classes/:id", async (req, res) => {
  try {
    const { title, semester, section } = req.body;
 
    const cls = await Class.findByIdAndUpdate(
      req.params.id,
      { title, semester, section },
      { new: true }
    );
 
    if (!cls)
      return res.status(404).json({ message: "Class not found" });
 
    res.json(cls);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Delete a class
app.delete("/api/classes/:id", async (req, res) => {
  try {
    const cls = await Class.findByIdAndDelete(req.params.id);
 
    if (!cls)
      return res.status(404).json({ message: "Class not found" });
 
    
    await User.updateMany(
      { enrolledClasses: req.params.id },
      { $pull: { enrolledClasses: req.params.id } }
    );
 

    await Task.deleteMany({ classId: req.params.id });
 
  
    await StudyGroup.deleteMany({ classId: req.params.id });
 
    res.json({ message: "Class deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Enroll a student in a class
app.post("/api/classes/:id/enroll", async (req, res) => {
  try {
    const { userId } = req.body;
 
    const cls = await Class.findById(req.params.id);
    if (!cls)
      return res.status(404).json({ message: "Class not found" });
 
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });
 
    if (cls.studentIds.includes(userId))
      return res.status(400).json({ message: "Student already enrolled" });
 
    cls.studentIds.push(userId);
    await cls.save();
 
    user.enrolledClasses.push(req.params.id);
    await user.save();
 
    res.json({ message: "Student enrolled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Remove a student from a class
app.delete("/api/classes/:id/enroll/:userId", async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls)
      return res.status(404).json({ message: "Class not found" });
 
    const user = await User.findById(req.params.userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });
 
    cls.studentIds = cls.studentIds.filter(
      (id) => id.toString() !== req.params.userId
    );
    await cls.save();
 
    user.enrolledClasses = user.enrolledClasses.filter(
      (id) => id.toString() !== req.params.id
    );
    await user.save();
 
    res.json({ message: "Student removed from class successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//group
/////////////////////////////////////////////////////////////////////////////

// Create a group
app.post("/api/groups", async (req, res) => {
  try {
    const { name, classId, createdBy, description, isPublic } = req.body;
 
    if (!name)
      return res.status(400).json({ message: "Group name is required" });

    if (!createdBy)
      return res.status(400).json({ message: "Created by is required" });
 
    
    if (classId) { //make sure the class exists
      const cls = await Class.findById(classId);
      if (!cls)
        return res.status(404).json({ message: "Class not found" });
    }
 
    const group = new StudyGroup({
      name,
      classId: classId || null,
      createdBy,
      memberIds: [],
      description: description || "",
      isPublic: isPublic !== undefined ? isPublic : true,
    });
 
    await group.save();
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Get all groups
app.get("/api/groups", async (req, res) => {
  try {
    const groups = await StudyGroup.find()
      .populate("memberIds", "name email")
      .populate("classId", "courseCode title");
 
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Get a single group
app.get("/api/groups/:id", async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id)
      .populate("memberIds", "name email")
      .populate("classId", "courseCode title");
 
    if (!group)
      return res.status(404).json({ message: "Study group not found" });
 
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Update a group 
app.put("/api/groups/:id", async (req, res) => {
  try {
    const { name } = req.body;
 
    if (!name)
      return res.status(400).json({ message: "Group name is required" });
 
    const group = await StudyGroup.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );
 
    if (!group)
      return res.status(404).json({ message: "Study group not found" });
 
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Delete a group
app.delete("/api/groups/:id", async (req, res) => {
  try {
    const group = await StudyGroup.findByIdAndDelete(req.params.id);
 
    if (!group)
      return res.status(404).json({ message: "Study group not found" });
 
  
    await Task.deleteMany({ studyGroupId: req.params.id });
 
    res.json({ message: "Study group deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Add a member to a group
app.post("/api/groups/:id/members", async (req, res) => {
  try {
    const { userId } = req.body;
 
    const group = await StudyGroup.findById(req.params.id);
    if (!group)
      return res.status(404).json({ message: "Study group not found" });
 
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });
 
    
    if (group.memberIds.includes(userId))
      return res.status(400).json({ message: "User is already in this group" });
 
    group.memberIds.push(userId);
    await group.save();
    res.json({ message: "Member added successfully", group });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Remove a member from a group
app.delete("/api/groups/:id/members/:userId", async (req, res) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group)
      return res.status(404).json({ message: "Study group not found" });
 
    const user = await User.findById(req.params.userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });
 
    group.memberIds = group.memberIds.filter(
      (id) => id.toString() !== req.params.userId
    );
    await group.save();
 
    res.json({ message: "Member removed successfully", group });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Get all study groups for a specific class  
app.get("/api/classes/:id/groups", async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls)
      return res.status(404).json({ message: "Class not found" });
 
    const groups = await StudyGroup.find({ classId: req.params.id })
      .populate("members", "name email");
 
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//task
///////////////////////////////////////////////////////////////////

// Create a task
app.post("/api/tasks", async (req, res) => {
  try {
    const { title, type, dueDate, classId,  assignedTo, linkedEventId, priority, notes, tags } = req.body;
 
    if (!title)
      return res.status(400).json({ message: "Task title is required" });
    if (!assignedTo)
      return res.status(400).json({ message: "Assigned user is required" });


    const task = new Task({
      title,
      type: type || "assignment",
      assignedTo,
      dueDate: dueDate || null,
      linkedEventId: linkedEventId || null,
      classId: classId || null,
      priority: priority || "medium",
      status: "todo",
      notes: notes || "",
      tags: tags || [],
    });
 
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Get all tasks
app.get("/api/tasks", async (req, res) => {
  try {
    const { classId, status } = req.query;
 
    const filter = {};
 
    if (classId) filter.classId = classId;
    if (status) filter.status = status;
   
 
    const tasks = await Task.find(filter)
      .populate("classId", "courseCode title")
      .populate("assignedTo", "name email")
      .sort({ dueDate: 1 });
 
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Get single task
app.get("/api/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("classId", "courseCode title")
      .populate("assignedTo", "name email");
 
    if (!task)
      return res.status(404).json({ message: "Task not found" });
 
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Update a task
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { title, type, assignedTo, dueDate, priority, notes, tags, status  } = req.body;
 
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { title, type, assignedTo,dueDate, priority, notes, tags, status },
      { new: true }
    );
 
    if (!task)
      return res.status(404).json({ message: "Task not found" });
 
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Delete a task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
 
    if (!task)
      return res.status(404).json({ message: "Task not found" });
 
    res.json({ message: "Task deleted successfully" });
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