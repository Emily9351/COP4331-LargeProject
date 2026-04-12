// config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://studyapp-admin:Sghpwm0FmmxsQZpv@studyapp-cluster.sqkwc7q.mongodb.net/?appName=studyapp-cluster");
    console.log("MongoDB connected");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;