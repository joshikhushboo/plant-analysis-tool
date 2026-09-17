const path = require("path");
require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const fsPromises = fs.promises;
const PDFDocument = require("pdfkit");
const { GoogleGenAI } = require("@google/genai");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const PlantAnalysis = require("./models/PlantAnalysis");
const authMiddleware =
  require("./middleware/authMiddleware");

const {
  optionalAuthMiddleware,
} = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;
// ===============================
// MONGODB
// ===============================

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
// ===============================
// CHECK ENVIRONMENT
// ===============================

console.log("=================================");
console.log(
  "Gemini API key loaded:",
  !!process.env.GEMINI_API_KEY
);
console.log("=================================");

if (!process.env.GEMINI_API_KEY) {
  console.error(
    "ERROR: GEMINI_API_KEY is missing from .env"
  );
}

// ===============================
// DIRECTORIES
// ===============================

const uploadsDir = path.join(__dirname, "uploads");
const publicDir = path.join(__dirname, "public");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());

app.use(
  express.json({
    limit: "15mb",
  })
);

app.use(express.urlencoded({ extended: true }));

app.use(express.static(publicDir));

// ===============================
// MULTER
// ===============================

const upload = multer({
  dest: uploadsDir,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(
        new Error("Only image files are allowed.")
      );
    }

    cb(null, true);
  },
});

// ===============================
// GEMINI
// ===============================

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(publicDir, "index.html")
  );
});

// ===============================
// HEALTH CHECK
// ===============================

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "PlantScan server is running",
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// ===============================
// SIGNUP
// ===============================

app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Name, email and password are required.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 6 characters.",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const token = jwt.sign(
      {
        userId: user._id,
        name: user.name,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);

    res.status(500).json({
      success: false,
      error: "Signup failed.",
    });
  }
});
// ===============================
// LOGIN
// ===============================

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        name: user.name,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      error: "Login failed.",
    });
  }
});
// ===============================
// ANALYZE PLANT
// ===============================

// ===============================
// ANALYZE PLANT
// ===============================

app.post(
  "/analyze",
  optionalAuthMiddleware,
  upload.single("image"),
  async (req, res) => {
    console.log("");
    console.log("=================================");
    console.log("Plant analysis request received");
    console.log("=================================");

    let imagePath = null;

    try {
      // Check API key
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          success: false,
          error:
            "Gemini API key is not configured. Check your .env file.",
        });
      }

      // Check file
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No image uploaded.",
        });
      }

      imagePath = req.file.path;

      console.log("Image received:", req.file.originalname);
      console.log("MIME type:", req.file.mimetype);

      // Convert image to Base64
      const imageData = await fsPromises.readFile(imagePath, {
        encoding: "base64",
      });

      console.log("Image converted to Base64");

      // ===============================
      // GEMINI REQUEST
      // ===============================

      const prompt = `
Analyze the plant shown in this image.

Return ONLY valid JSON.

Do not use Markdown.

Do not use code fences.

Do not add any explanation outside the JSON.

Use exactly this structure:

{
  "plantName": "",
  "scientificName": "",
  "confidence": 0,
  "description": "",
  "healthStatus": "",
  "visibleSymptoms": [],
  "watering": "",
  "sunlight": "",
  "soil": "",
  "temperature": "",
  "fertilizer": "",
  "commonProblems": [],
  "recommendations": [],
  "interestingFacts": []
}

Instructions:

1. Identify the most likely plant.
2. Give the scientific name if possible.
3. confidence must be a number between 0 and 100.
4. Describe the visible appearance.
5. Assess visible health condition.
6. Only mention symptoms that can actually be observed.
7. Give practical watering recommendations.
8. Give sunlight requirements.
9. Give soil requirements.
10. Give temperature requirements.
11. Give fertilizer recommendations.
12. Mention common problems for this plant.
13. Give useful recommendations.
14. Give interesting facts.
15. If the image is unclear, lower the confidence rather than guessing with certainty.
`;

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt,
              },
              {
                inlineData: {
                  mimeType: req.file.mimetype,
                  data: imageData,
                },
              },
            ],
          },
        ],
      });

      console.log("Gemini response received");

      // ===============================
      // GET TEXT
      // ===============================

      let rawText = "";

      if (typeof response.text === "string") {
        rawText = response.text;
      } else if (typeof response.text === "function") {
        rawText = response.text();
      }

      rawText = rawText.trim();

      console.log("Gemini raw response:");
      console.log(rawText);

      if (!rawText) {
        throw new Error("Gemini returned an empty response.");
      }

      // ===============================
      // CLEAN JSON
      // ===============================

      let cleanedText = rawText;

      cleanedText = cleanedText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      let plantInfo;

      try {
        plantInfo = JSON.parse(cleanedText);
      } catch (jsonError) {
        console.error("Gemini JSON parsing failed:");
        console.error(cleanedText);

        const start = cleanedText.indexOf("{");
        const end = cleanedText.lastIndexOf("}");

        if (start !== -1 && end !== -1) {
          const possibleJSON = cleanedText.substring(
            start,
            end + 1
          );

          try {
            plantInfo = JSON.parse(possibleJSON);
          } catch (secondError) {
            throw new Error("Gemini returned invalid JSON.");
          }
        } else {
          throw new Error(
            "Gemini returned an invalid analysis format."
          );
        }
      }

      // ===============================
      // NORMALIZE RESULT
      // ===============================

      plantInfo = {
        plantName:
          plantInfo.plantName || "Unknown Plant",

        scientificName:
          plantInfo.scientificName || "Not available",

        confidence:
          Number(plantInfo.confidence) || 0,

        description:
          plantInfo.description ||
          "No description available.",

        healthStatus:
          plantInfo.healthStatus ||
          "No health assessment available.",

        visibleSymptoms:
          Array.isArray(plantInfo.visibleSymptoms)
            ? plantInfo.visibleSymptoms
            : [],

        watering:
          plantInfo.watering || "Not available",

        sunlight:
          plantInfo.sunlight || "Not available",

        soil:
          plantInfo.soil || "Not available",

        temperature:
          plantInfo.temperature || "Not available",

        fertilizer:
          plantInfo.fertilizer || "Not available",

        commonProblems:
          Array.isArray(plantInfo.commonProblems)
            ? plantInfo.commonProblems
            : [],

        recommendations:
          Array.isArray(plantInfo.recommendations)
            ? plantInfo.recommendations
            : [],

        interestingFacts:
          Array.isArray(plantInfo.interestingFacts)
            ? plantInfo.interestingFacts
            : [],
      };

      console.log("Analysis completed successfully");
      console.log("Plant:", plantInfo.plantName);

      // ===============================
      // SAVE HISTORY ONLY IF LOGGED IN
      // ===============================

      if (req.user?.userId) {
        try {
          await PlantAnalysis.create({
            userId: req.user.userId,
            ...plantInfo,
          });

          console.log(
            "Analysis saved to history for user:",
            req.user.userId
          );
        } catch (historyError) {
          console.error(
            "Failed to save analysis to history:",
            historyError
          );
        }
      } else {
        console.log(
          "Guest analysis - not saving to history."
        );
      }

      // ===============================
      // DELETE TEMP IMAGE
      // ===============================

      await fsPromises.unlink(imagePath);
      imagePath = null;

      // ===============================
      // SEND RESPONSE
      // ===============================

      return res.status(200).json({
        success: true,
        results: plantInfo,
        image: `data:${req.file.mimetype};base64,${imageData}`,
        savedToHistory: !!req.user?.userId,
      });

    } catch (error) {
      console.error("");
      console.error("=================================");
      console.error("PLANT ANALYSIS ERROR");
      console.error("=================================");
      console.error(error);

      // Delete temporary file
      if (imagePath) {
        try {
          await fsPromises.unlink(imagePath);
        } catch (deleteError) {
          console.error(
            "Could not delete uploaded file:",
            deleteError.message
          );
        }
      }

      return res.status(500).json({
        success: false,
        error:
          error.message || "Plant analysis failed.",
      });
    }
  }
);

// ===============================
// USER HISTORY
// ===============================

app.get("/history", authMiddleware, async (req, res) => {
  try {
    const history = await PlantAnalysis.find({
      userId: req.user.userId,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("History fetch error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to fetch history.",
    });
  }
});

app.delete(
  "/history/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const deletedAnalysis = await PlantAnalysis.findOneAndDelete({
        _id: req.params.id,
        userId: req.user.userId,
      });

      if (!deletedAnalysis) {
        return res.status(404).json({
          success: false,
          error: "History item not found.",
        });
      }

      return res.json({
        success: true,
        message: "History item deleted successfully.",
      });
    } catch (error) {
      console.error("History delete error:", error);

      return res.status(500).json({
        success: false,
        error: "Failed to delete history item.",
      });
    }
  }
);

// ===============================
// DOWNLOAD PDF
// ===============================

app.post("/download", async (req, res) => {
  try {
    const { result, image } = req.body;

    if (!result) {
      return res.status(400).json({
        success: false,
        error: "No analysis result provided.",
      });
    }

    const doc = new PDFDocument({
      margin: 50,
    });

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Plant_Analysis_Report.pdf"'
    );

    doc.pipe(res);

    doc
      .fontSize(24)
      .text("PlantScan Analysis Report", {
        align: "center",
      });

    doc.moveDown();

    if (result.plantName) {
      doc
        .fontSize(20)
        .text(result.plantName);
    }

    if (result.scientificName) {
      doc
        .fontSize(12)
        .text(
          result.scientificName
        );
    }

    doc.moveDown();

    doc
      .fontSize(14)
      .text("Identification Confidence");

    doc
      .fontSize(11)
      .text(
        `${result.confidence || 0}%`
      );

    doc.moveDown();

    const addSection = (
      title,
      content
    ) => {
      doc
        .fontSize(14)
        .text(title);

      doc
        .fontSize(11)
        .text(
          Array.isArray(content)
            ? content
                .map(
                  (item) => `• ${item}`
                )
                .join("\n")
            : content ||
                "Not available"
        );

      doc.moveDown();
    };

    addSection(
      "Description",
      result.description
    );

    addSection(
      "Health Status",
      result.healthStatus
    );

    addSection(
      "Visible Symptoms",
      result.visibleSymptoms
    );

    addSection(
      "Watering",
      result.watering
    );

    addSection(
      "Sunlight",
      result.sunlight
    );

    addSection(
      "Soil",
      result.soil
    );

    addSection(
      "Temperature",
      result.temperature
    );

    addSection(
      "Fertilizer",
      result.fertilizer
    );

    addSection(
      "Common Problems",
      result.commonProblems
    );

    addSection(
      "Recommendations",
      result.recommendations
    );

    addSection(
      "Interesting Facts",
      result.interestingFacts
    );

    doc.end();
  } catch (error) {
    console.error(
      "PDF error:",
      error
    );

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error:
          "Failed to generate PDF.",
      });
    }
  }
});

// ===============================
// ERROR HANDLER
// ===============================

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Server error:",
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      success: false,
      error:
        error.message ||
        "Server error",
    });
  }
);

// ===============================
// START SERVER
// ===============================

app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log(
    "================================="
  );
  console.log(
    `Server is running on port ${PORT}`
  );
  console.log(
    `http://localhost:${PORT}`
  );
  console.log(
    "================================="
  );
});