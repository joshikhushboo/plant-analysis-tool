const mongoose = require("mongoose");

const plantAnalysisSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plantName: {
      type: String,
      default: "Unknown Plant",
    },
    scientificName: {
      type: String,
      default: "Not available",
    },
    confidence: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: "No description available.",
    },
    healthStatus: {
      type: String,
      default: "No health assessment available.",
    },
    visibleSymptoms: {
      type: [String],
      default: [],
    },
    watering: {
      type: String,
      default: "Not available",
    },
    sunlight: {
      type: String,
      default: "Not available",
    },
    soil: {
      type: String,
      default: "Not available",
    },
    temperature: {
      type: String,
      default: "Not available",
    },
    fertilizer: {
      type: String,
      default: "Not available",
    },
    commonProblems: {
      type: [String],
      default: [],
    },
    recommendations: {
      type: [String],
      default: [],
    },
    interestingFacts: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PlantAnalysis", plantAnalysisSchema);
