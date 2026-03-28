const mongoose = require("mongoose");

const ClassSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: [true, "Course code is required"],
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: [true, "Class title is required"],
      trim: true,
    },
    professorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Professor ID is required"],
    },
    studentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    semester: {
      type: String,
      trim: true,
    },
    section: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Class", ClassSchema);
