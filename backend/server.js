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
const { authenticateToken, signAuthToken } = require("./middleware/auth");

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

function idsMatch(left, right) {
  return left?.toString() === right?.toString();
}

function isClassProfessor(cls, userId) {
  return idsMatch(cls?.professorId, userId);
}

function isGroupMember(group, userId) {
  return group.memberIds.some((memberId) => idsMatch(memberId, userId));
}

function isGroupCreator(group, userId) {
  return idsMatch(group.createdBy, userId);
}

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

    const token = signAuthToken(user);

    res.status(200).json({
      message: "Login successful!",
      token,
      userId: user._id,
      role: user.role || "student",   
      name: user.name,
      user: {
        userId: user._id,
        role: user.role || "student",
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.use("/api", authenticateToken);

app.get("/api/me", async (req, res) => {
  res.json({
    userId: req.user._id,
    role: req.user.role,
    name: req.user.name,
    email: req.user.email,
  });
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////
/// User API
///////////////////////////////////////////////////////////////////////////////////////////////////////////

//get all users (searchable)
app.get("/api/users", async (req, res) => {
  try {
    const { role, name, email } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (name) filter.name = { $regex: name, $options: "i" };
    if (email) filter.email = { $regex: email, $options: "i" };

    const users = await User.find(filter)
      .select("-passwordHash")
      .limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

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
    if (!idsMatch(req.params.id, req.user._id)) {
      return res.status(403).json({ message: "You can only update your own profile" });
    }

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
    if (!idsMatch(req.params.id, req.user._id)) {
      return res.status(403).json({ message: "You can only delete your own account" });
    }

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
    const { courseCode, title, semester, section } = req.body;
 
    if (req.user.role !== "professor")
      return res.status(403).json({ message: "Only professors can create classes" });

    if (!courseCode || !title)
      return res.status(400).json({ message: "courseCode and title are required" });
 
    const newClass = new Class({
      courseCode,
      title,
      professorId: req.user._id,
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
    const { userId, professorId } = req.query;
    const filter = {};

    if (userId) {
      if (!idsMatch(userId, req.user._id)) {
        return res.status(403).json({ message: "Cannot query another user's classes" });
      }
      filter.studentIds = req.user._id;
    }

    if (professorId) {
      if (req.user.role !== "professor" || !idsMatch(professorId, req.user._id)) {
        return res.status(403).json({ message: "Cannot query another professor's classes" });
      }
      filter.professorId = req.user._id;
    }

    const classes = await Class.find(filter)
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

    const existingClass = await Class.findById(req.params.id);
    if (!existingClass)
      return res.status(404).json({ message: "Class not found" });

    if (!isClassProfessor(existingClass, req.user._id)) {
      return res.status(403).json({ message: "Only the class professor can update this class" });
    }
 
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
    const existingClass = await Class.findById(req.params.id);

    if (!existingClass)
      return res.status(404).json({ message: "Class not found" });

    if (!isClassProfessor(existingClass, req.user._id)) {
      return res.status(403).json({ message: "Only the class professor can delete this class" });
    }

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
    const requestedUserId = req.body.userId;
 
    const cls = await Class.findById(req.params.id);
    if (!cls)
      return res.status(404).json({ message: "Class not found" });

    const actorIsProfessor = req.user.role === "professor";
    const targetUserId = actorIsProfessor ? requestedUserId : req.user._id;

    if (actorIsProfessor && !isClassProfessor(cls, req.user._id)) {
      return res.status(403).json({ message: "Only the class professor can enroll students" });
    }

    if (!targetUserId) {
      return res.status(400).json({ message: "User ID is required" });
    }
 
    const user = await User.findById(targetUserId);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (user.role !== "student") {
      return res.status(400).json({ message: "Only students can be enrolled in classes" });
    }
 
    if (cls.studentIds.some((id) => idsMatch(id, targetUserId)))
      return res.status(400).json({ message: "Student already enrolled" });
 
    cls.studentIds.push(targetUserId);
    await cls.save();
 
    user.enrolledClasses.push(req.params.id);
    await user.save();

    // Assign existing class-wide (master) tasks to the new student
    const masterTasks = await Task.find({ classId: req.params.id, isMaster: true });
    const taskPromises = masterTasks.map(master => {
        return new Task({
          title: master.title,
          type: master.type,
          assignedTo: targetUserId,
          createdBy: master.createdBy,
        isMaster: false,
        dueDate: master.dueDate,
        linkedEventId: master.linkedEventId,
        classId: req.params.id,
        priority: master.priority,
        status: "todo",
        notes: master.notes,
        tags: master.tags,
      }).save();
    });
    await Promise.all(taskPromises);
 
    res.json({ message: "Student enrolled successfully and tasks assigned" });
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

    const actorIsProfessor = req.user.role === "professor";
    if (actorIsProfessor) {
      if (!isClassProfessor(cls, req.user._id)) {
        return res.status(403).json({ message: "Only the class professor can remove students" });
      }
    } else if (!idsMatch(req.params.userId, req.user._id)) {
      return res.status(403).json({ message: "You can only remove yourself from a class" });
    }
 
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
    const { name, classId, description, isPublic, memberIds, allowStudentTasks } = req.body;
 
    if (!name)
      return res.status(400).json({ message: "Group name is required" });
 
    
    if (classId) { //make sure the class exists
      const cls = await Class.findById(classId);
      if (!cls)
        return res.status(404).json({ message: "Class not found" });

      const canCreateForClass = isClassProfessor(cls, req.user._id) || cls.studentIds.some((id) => idsMatch(id, req.user._id));
      if (!canCreateForClass) {
        return res.status(403).json({ message: "You must belong to a class to create a group for it" });
      }
    }
 
    const group = new StudyGroup({
      name,
      classId: classId || null,
      createdBy: req.user._id,
      memberIds: memberIds || [],
      description: description || "",
      isPublic: isPublic !== undefined ? isPublic : true,
      allowStudentTasks: allowStudentTasks !== undefined ? allowStudentTasks : true,
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
    const { userId } = req.query;
    const filter = {};
    if (userId) {
      if (!idsMatch(userId, req.user._id)) {
        return res.status(403).json({ message: "Cannot query another user's groups" });
      }
      filter.memberIds = req.user._id;
    }

    const groups = await StudyGroup.find(filter)
      .populate("memberIds", "name email")
      .populate("classId", "courseCode title")
      .populate("createdBy", "name email role");
 
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
    const { name, description, isPublic, allowStudentTasks } = req.body;

    const existingGroup = await StudyGroup.findById(req.params.id);
    if (!existingGroup)
      return res.status(404).json({ message: "Study group not found" });

    if (!isGroupCreator(existingGroup, req.user._id)) {
      return res.status(403).json({ message: "Only the group creator can update this group" });
    }
 
    const update = {};
    if (name) update.name = name;
    if (description !== undefined) update.description = description;
    if (isPublic !== undefined) update.isPublic = isPublic;
    if (allowStudentTasks !== undefined) update.allowStudentTasks = allowStudentTasks;
 
    const group = await StudyGroup.findByIdAndUpdate(
      req.params.id,
      update,
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
    const group = await StudyGroup.findById(req.params.id);
 
    if (!group)
      return res.status(404).json({ message: "Study group not found" });

    if (!isGroupCreator(group, req.user._id)) {
      return res.status(403).json({ message: "Only the group creator can delete this group" });
    }

    await StudyGroup.findByIdAndDelete(req.params.id);
 
   
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

    let canManageGroup = isGroupCreator(group, req.user._id) || isGroupMember(group, req.user._id);
    if (group.classId) {
      const cls = await Class.findById(group.classId);
      canManageGroup = canManageGroup || isClassProfessor(cls, req.user._id);
    }

    if (!canManageGroup) {
      return res.status(403).json({ message: "Not allowed to add members to this group" });
    }
 
    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });
 
    
    if (group.memberIds.some((id) => idsMatch(id, userId)))
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

    let canManageGroup = isGroupCreator(group, req.user._id) || idsMatch(req.params.userId, req.user._id);
    if (group.classId) {
      const cls = await Class.findById(group.classId);
      canManageGroup = canManageGroup || isClassProfessor(cls, req.user._id);
    }

    if (!canManageGroup) {
      return res.status(403).json({ message: "Not allowed to remove members from this group" });
    }
 
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
      .populate("memberIds", "name email");
 
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
    const { title, type, dueDate, classId, studyGroupId, assignedTo, linkedEventId, priority, notes, tags } = req.body;
 
    if (!title)
      return res.status(400).json({ message: "Task title is required" });
    
    const creatorId = req.user._id;

    const creator = await User.findById(creatorId);
    if (!creator)
      return res.status(404).json({ message: "Creator not found" });

    const isProfessor = creator.role === "professor";

    // If it's a class-wide task created by a professor (no specific assignedTo)
    if (classId && !studyGroupId && !assignedTo && isProfessor) {
      const cls = await Class.findById(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });
      if (!isClassProfessor(cls, creatorId)) {
        return res.status(403).json({ message: "Only the class professor can create class-wide tasks" });
      }

      // Create a MASTER task (no assignedTo)
      const masterTask = new Task({
        title,
        type: type || "assignment",
        assignedTo: null,
        createdBy: creatorId,
        isMaster: true,
        dueDate: dueDate || null,
        linkedEventId: linkedEventId || null,
        classId: classId,
        priority: priority || "medium",
        status: "todo",
        notes: notes || "",
        tags: tags || [],
      });
      await masterTask.save();

      // Create copies for all students currently in the class
      const taskPromises = cls.studentIds.map(studentId => {
        return new Task({
          title,
          type: type || "assignment",
          assignedTo: studentId,
          createdBy: creatorId,
          isMaster: false,
          dueDate: dueDate || null,
          linkedEventId: linkedEventId || null,
          classId: classId,
          priority: priority || "medium",
          status: "todo",
          notes: notes || "",
          tags: tags || [],
        }).save();
      });

      await Promise.all(taskPromises);
      return res.status(201).json({ message: "Master task created and distributed to students", masterTask });
    }

    // Handle Study Group tasks - Create for all group members if no specific assignee AND created by professor
    if (studyGroupId && !assignedTo && isProfessor) {
      const group = await StudyGroup.findById(studyGroupId);
      if (!group) return res.status(404).json({ message: "Study group not found" });

      let canManageGroup = isGroupCreator(group, creatorId);
      if (group.classId) {
        const cls = await Class.findById(group.classId);
        canManageGroup = canManageGroup || isClassProfessor(cls, creatorId);
      }

      if (!canManageGroup) {
        return res.status(403).json({ message: "Not allowed to create tasks for this group" });
      }

      // Create a MASTER task (no assignedTo)
      const masterTask = new Task({
        title,
        type: type || "assignment",
        assignedTo: null,
        createdBy: creatorId,
        isMaster: true,
        dueDate: dueDate || null,
        linkedEventId: linkedEventId || null,
        classId: classId || group.classId,
        studyGroupId: studyGroupId,
        priority: priority || "medium",
        status: "todo",
        notes: notes || "",
        tags: tags || [],
      });
      await masterTask.save();

      const taskPromises = group.memberIds.map(memberId => {
        return new Task({
          title,
          type: type || "assignment",
          assignedTo: memberId,
          createdBy: creatorId,
          isMaster: false,
          dueDate: dueDate || null,
          linkedEventId: linkedEventId || null,
          classId: classId || group.classId,
          studyGroupId: studyGroupId,
          priority: priority || "medium",
          status: "todo",
          notes: notes || "",
          tags: tags || [],
        }).save();
      });

      await Promise.all(taskPromises);
      return res.status(201).json({ message: "Master group task created and distributed", masterTask });
    }

    if (assignedTo && req.user.role !== "professor" && !idsMatch(assignedTo, req.user._id)) {
      return res.status(403).json({ message: "Students can only create tasks for themselves" });
    }

    if (classId) {
      const cls = await Class.findById(classId);
      if (!cls) return res.status(404).json({ message: "Class not found" });

      const canAccessClass = isClassProfessor(cls, creatorId) || cls.studentIds.some((id) => idsMatch(id, creatorId));
      if (!canAccessClass) {
        return res.status(403).json({ message: "Not allowed to create tasks for this class" });
      }
    }

    if (studyGroupId) {
      const group = await StudyGroup.findById(studyGroupId);
      if (!group) return res.status(404).json({ message: "Study group not found" });

      if (!isGroupMember(group, creatorId) && !isGroupCreator(group, creatorId)) {
        return res.status(403).json({ message: "You must belong to a study group to create tasks for it" });
      }

      if (!group.allowStudentTasks && req.user.role !== "professor") {
        return res.status(403).json({ message: "Students cannot add tasks to this group" });
      }
    }

    const finalAssignedTo = assignedTo || req.user._id;
    if (!finalAssignedTo)
      return res.status(400).json({ message: "Assigned user is required" });

    const task = new Task({
      title,
      type: type || "assignment",
      assignedTo: finalAssignedTo,
      createdBy: creatorId,
      isMaster: false,
      dueDate: dueDate || null,
      linkedEventId: linkedEventId || null,
      classId: classId || null,
      studyGroupId: studyGroupId || null,
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
    const { classId, studyGroupId, status, userId, assignedTo } = req.query;
 
    const filter = {};
 
    if (classId) filter.classId = classId;
    if (studyGroupId) filter.studyGroupId = studyGroupId;
    // If we want ONLY tasks without a study group when classId is passed, 
    // we should explicitly handle that, but let's see if the user wants strict isolation.
    // If studyGroupId is 'null' (string from query), we filter for null.
    if (studyGroupId === 'null') filter.studyGroupId = null;

    if (status) filter.status = status;
    if (assignedTo || userId) {
      const requestedAssignedTo = assignedTo || userId;
      if (req.user.role !== "professor" && !idsMatch(requestedAssignedTo, req.user._id)) {
        return res.status(403).json({ message: "Cannot query another user's tasks" });
      }
      filter.assignedTo = requestedAssignedTo;
    } else if (req.user.role !== "professor") {
      filter.assignedTo = req.user._id;
    } else if (classId || studyGroupId) {
      // If fetching for a class/group but no user specified, 
      // return only master tasks (to avoid duplicates in professor view)
      filter.isMaster = true;
    }
    
    // Filter by isHidden
    if (req.query.isHidden === 'all') {
      // Don't add isHidden to filter, fetch all
    } else if (req.query.isHidden !== undefined) {
      filter.isHidden = req.query.isHidden === 'true';
    } else {
      filter.isHidden = false;
    }
   
 
    const tasks = await Task.find(filter)
      .populate("classId", "courseCode title")
      .populate("studyGroupId", "name")
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

    const existingTask = await Task.findById(req.params.id);
    if (!existingTask)
      return res.status(404).json({ message: "Task not found" });

    const canEditTask = idsMatch(existingTask.createdBy, req.user._id) || idsMatch(existingTask.assignedTo, req.user._id);
    if (!canEditTask) {
      return res.status(403).json({ message: "Not allowed to update this task" });
    }

    const nextAssignedTo = assignedTo && req.user.role === "professor" ? assignedTo : existingTask.assignedTo;
 
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { title, type, assignedTo: nextAssignedTo, dueDate, priority, notes, tags, status },
      { new: true }
    );
 
    if (!task)
      return res.status(404).json({ message: "Task not found" });
 
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Toggle task status
app.patch("/api/tasks/:id/toggle", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const canToggleTask = idsMatch(task.assignedTo, req.user._id) || idsMatch(task.createdBy, req.user._id);
    if (!canToggleTask) {
      return res.status(403).json({ message: "Not allowed to update this task" });
    }

    task.status = task.status === "done" ? "todo" : "done";
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Toggle task hidden status (soft delete)
app.patch("/api/tasks/:id/toggle-hide", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const canToggleTask = idsMatch(task.assignedTo, req.user._id) || idsMatch(task.createdBy, req.user._id);
    if (!canToggleTask) {
      return res.status(403).json({ message: "Not allowed to update this task" });
    }

    task.isHidden = !task.isHidden;
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});
 
// Delete a task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const canDeleteTask = idsMatch(task.createdBy, req.user._id) || idsMatch(task.assignedTo, req.user._id);
    if (!canDeleteTask) {
      return res.status(403).json({ message: "Not allowed to delete this task" });
    }

    // If deleting a master task, delete all student copies
    if (task.isMaster) {
      await Task.deleteMany({
        title: task.title,
        classId: task.classId,
        studyGroupId: task.studyGroupId,
        createdBy: task.createdBy,
        isMaster: false
      });
    }

    await Task.findByIdAndDelete(req.params.id);
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
    const { title, description, type, classId, studyGroupId, startTime, endTime, location, meetingLink } = req.body;
 
    if (!title || !startTime || !endTime ) 
      return res.status(400).json({ message: "title, startTime, endTime are required" });

    if (classId) { //make sure the class exists
      const cls = await Class.findById(classId);
      if (!cls)
        return res.status(404).json({ message: "Class not found" });

      const canCreateForClass = isClassProfessor(cls, req.user._id) || cls.studentIds.some((id) => idsMatch(id, req.user._id));
      if (!canCreateForClass) {
        return res.status(403).json({ message: "Not allowed to create events for this class" });
      }
    }

    if (studyGroupId) { //make sure the study group exists
      const group = await StudyGroup.findById(studyGroupId);
      if (!group)
        return res.status(404).json({ message: "Study group not found" });

      if (!isGroupMember(group, req.user._id) && !isGroupCreator(group, req.user._id)) {
        return res.status(403).json({ message: "Not allowed to create events for this group" });
      }
    }
 
    const event = new Event({
      title,
      description: description || null,
      type: type || "study session",
      location: location || "",
      createdBy: req.user._id,
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

    const existingEvent = await Event.findById(req.params.id);
    if (!existingEvent)
      return res.status(404).json({ message: "Event not found" });

    if (!idsMatch(existingEvent.createdBy, req.user._id)) {
      return res.status(403).json({ message: "Only the event creator can update this event" });
    }
 
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
    const existingEvent = await Event.findById(req.params.id);

    if (!existingEvent)
      return res.status(404).json({ message: "Event not found" });

    if (!idsMatch(existingEvent.createdBy, req.user._id)) {
      return res.status(403).json({ message: "Only the event creator can delete this event" });
    }

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
    const { status } = req.body;
    const userId = req.user._id;
 
    if (!status)
      return res.status(400).json({ message: "status is required" });
 
    if (!["accepted", "declined", "tentative"].includes(status))
      return res.status(400).json({ message: "status must be accepted, declined, or tentative" });
 
    const event = await Event.findById(req.params.id);
    if (!event)
      return res.status(404).json({ message: "Event not found" });
 
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

    if (!idsMatch(req.params.userId, req.user._id)) {
      return res.status(403).json({ message: "You can only update your own RSVP" });
    }
 
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
    if (!idsMatch(req.params.userId, req.user._id)) {
      return res.status(403).json({ message: "You can only cancel your own RSVP" });
    }

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
    if (!idsMatch(req.params.id, req.user._id)) {
      return res.status(403).json({ message: "You can only view your own RSVPs" });
    }

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
