const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token.",
    });
  }
};

module.exports = authMiddleware;
const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Guest user — continue without authentication
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;
  } catch (error) {
    console.log(
      "Optional auth: invalid token, continuing as guest."
    );
  }

  next();
};

module.exports.optionalAuthMiddleware =
  optionalAuthMiddleware;