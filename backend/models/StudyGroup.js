const mongoose = require("mongoose");

const StudyGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Study group name is required"],
      trim: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Study group must be linked to a class"],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    memberIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    allowStudentTasks: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StudyGroup", StudyGroupSchema);
