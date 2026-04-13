require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { User, Class, StudyGroup, Task, Event, RSVP } = require("./models");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const sendVerificationEmail = require("./utils/SendVerificationEmail");
const sendPasswordResetEmail = require("./utils/SendPasswordResetEmail");

const app = express();

// CORS configuration - Allow both local dev and production
const allowedOrigins = [
  'http://localhost:5173',              // Local Vite dev server
  'http://localhost:5000',              // Local production
  'https://emilydensmore.com:5000',     // Production with port
  'http://emilydensmore.com:5000',      // Production HTTP with port
  'https://emilydensmore.com',          // Production (in case you get port 443 later)
  'http://emilydensmore.com',           // Production HTTP (in case you get port 80 later)
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(null, true); // Allow for now, can change to false for strict mode
    }
  },
  credentials: true
}));

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

    res.status(200).json({
      message: "Login successful!",
      userId: user._id,
      role: user.role,   
      name: user.name     
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////
/// User API
///////////////////////////////////////////////////////////////////////////////////////////////////////////

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

////////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Class API
///////////////////////////////////////////////////////////////////////////////////////////////////////////

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

///////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Study Group API
///////////////////////////////////////////////////////////////////////////////////////////////////////////

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

///////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Task API
///////////////////////////////////////////////////////////////////////////////////////////////////////////

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

///////////////////////////////////////////////////////////////////////////////////////////////////////////
/// Event API
///////////////////////////////////////////////////////////////////////////////////////////////////////////

// Create an event
app.post("/api/events", async (req, res) => {
  try {
    const { title, description, type, createdBy, classId, studyGroupId, startTime, endTime, location, meetingLink } = req.body;
 
    if (!title || !createdBy || !startTime || !endTime ) 
      return res.status(400).json({ message: "title, createdBy startTime, endTime are required" });

    const user = await User.findById(createdBy);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (classId) { //make sure the class exists
      const cls = await Class.findById(classId);
      if (!cls)
        return res.status(404).json({ message: "Class not found" });
    }

    if (studyGroupId) { //make sure the study group exists
      const group = await StudyGroup.findById(studyGroupId);
      if (!group)
        return res.status(404).json({ message: "Study group not found" });
    }
 
    const event = new Event({
      title,
      description: description || null,
      type: type || "study session",
      location: location || "",
      createdBy,
      classId: classId || null,
      studyGroupId: studyGroupId || null,
      startTime,
      endTime,
      meetingLink: meetingLink || "",
    });
 
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all events
app.get("/api/events", async (req, res) => {
  try {
    const { classId, studyGroupId, type } = req.query;
 
    const filter = {};
    if (classId) filter.classId = classId;
    if (studyGroupId) filter.studyGroupId = studyGroupId;
    if (type) filter.type = type;
 
    const events = await Event.find(filter)
      .populate("createdBy", "name email")
      .populate("classId", "courseCode title")
      .populate("studyGroupId", "name")
      .sort({ startTime: 1 });
 
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Get single event
app.get("/api/events/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("classId", "courseCode title")
      .populate("studyGroupId", "name");
 
    if (!event)
      return res.status(404).json({ message: "Event not found" });
 
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Update an event
app.put("/api/events/:id", async (req, res) => {
  try {
    const { title, description, type, startTime, endTime, location, meetingLink } = req.body;
 
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { title, description, type, startTime, endTime, location, meetingLink },
      { new: true }
    );
 
    if (!event)
      return res.status(404).json({ message: "Event not found" });
 
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Delete an event
app.delete("/api/events/:id", async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
 
    if (!event)
      return res.status(404).json({ message: "Event not found" });
 
    // Cleanup — delete all RSVPs linked to this event
    await RSVP.deleteMany({ eventId: req.params.id });
 
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////
///RSVP API
///////////////////////////////////////////////////////////////////////////////////////////////////////////

// RSVP to an event
app.post("/api/events/:id/rsvp", async (req, res) => {
  try {
    const { userId, status } = req.body;
 
    if (!userId || !status)
      return res.status(400).json({ message: "userId and status are required" });
 
    if (!["accepted", "declined", "tentative"].includes(status))
      return res.status(400).json({ message: "status must be accepted, declined, or tentative" });
 
    const event = await Event.findById(req.params.id);
    if (!event)
      return res.status(404).json({ message: "Event not found" });
 
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });
 
    // Check if user already RSVPed
    const existingRsvp = await RSVP.findOne({ userId, eventId: req.params.id });
    if (existingRsvp)
      return res.status(400).json({ message: "User has already RSVPed to this event" });
 
    const rsvp = new RSVP({
      userId,
      eventId: req.params.id,
      status,
      respondedAt: Date.now(),
    });
 
    await rsvp.save();
    res.status(201).json({ message: "RSVP confirmed", rsvp });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Update RSVP status
app.put("/api/events/:id/rsvp/:userId", async (req, res) => {
  try {
    const { status } = req.body;
 
    if (!status)
      return res.status(400).json({ message: "status is required" });
 
    if (!["accepted", "declined", "tentative"].includes(status))
      return res.status(400).json({ message: "status must be accepted, declined, or tentative" });
 
    const rsvp = await RSVP.findOneAndUpdate(
      { userId: req.params.userId, eventId: req.params.id },
      { status, respondedAt: Date.now() },
      { new: true }
    );
 
    if (!rsvp)
      return res.status(404).json({ message: "RSVP not found" });
 
    res.json({ message: "RSVP updated", rsvp });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Cancel an RSVP
app.delete("/api/events/:id/rsvp/:userId", async (req, res) => {
  try {
    const rsvp = await RSVP.findOneAndDelete({
      userId: req.params.userId,
      eventId: req.params.id,
    });
 
    if (!rsvp)
      return res.status(404).json({ message: "RSVP not found" });
 
    res.json({ message: "RSVP cancelled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Get all RSVPs for an event
app.get("/api/events/:id/rsvps", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event)
      return res.status(404).json({ message: "Event not found" });
 
    const rsvps = await RSVP.find({ eventId: req.params.id })
      .populate("userId", "name email");
 
    res.json(rsvps);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get all events a user RSVPed to
app.get("/api/users/:id/rsvps", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    const rsvps = await RSVP.find({ userId: req.params.id })
      .populate("eventId");

    res.json(rsvps);
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

// 5️⃣ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
// Frontend static files (only in production)
const buildPath = path.join(__dirname, "..", "web-frontend", "dist");
const indexPath = path.join(buildPath, "index.html");

if (fs.existsSync(buildPath) && fs.existsSync(indexPath)) {
  console.log("Serving frontend from:", buildPath);
  app.use(express.static(buildPath));
  
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(indexPath);
  });
} else {
  console.warn("Frontend dist folder not found. API routes will work, but frontend won't be served.");
  console.warn("Run 'npm run build' in web-frontend to build the frontend.");
}