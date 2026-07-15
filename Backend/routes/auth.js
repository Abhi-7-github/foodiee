const express = require("express");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const TeamSession = require("../models/TeamSession");

const router = express.Router();

const getSecret = () => process.env.JWT_SECRET || "foodiee_secret_key_123456";

// Path to teams JSON file
const teamsPath = path.join(__dirname, "../teams.json");

// Helper to load teams from JSON
const loadTeams = () => {
  try {
    const data = fs.readFileSync(teamsPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading teams.json:", error.message);
    return [];
  }
};

// 1. Team Login Route
router.post("/login", async (req, res) => {
  const { teamName } = req.body;

  if (!teamName) {
    return res.status(400).json({
      success: false,
      message: "Team Name is required."
    });
  }

  // Clean the input team name
  const cleanInputName = teamName.trim().toLowerCase();

  // Load all registered teams
  const registeredTeams = loadTeams();

  // Find team by case-insensitive name comparison
  const matchedTeam = registeredTeams.find(
    (t) => t.teamName.trim().toLowerCase() === cleanInputName
  );

  if (!matchedTeam) {
    return res.status(400).json({
      success: false,
      message: "Invalid Team Name. Please check your registered team name."
    });
  }

  try {
    // Generate an Auth Token
    const token = jwt.sign(
      { id: matchedTeam.id, teamName: matchedTeam.teamName },
      getSecret(),
      { expiresIn: "7d" }
    );

    // Save/Sync the session in MongoDB under Mongoose schema so it can be retrieved for orders later
    const newSession = new TeamSession({
      teamId: matchedTeam.id,
      teamName: matchedTeam.teamName,
      token: token
    });

    await newSession.save();

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      team: {
        id: matchedTeam.id,
        teamName: matchedTeam.teamName
      }
    });
  } catch (error) {
    console.error("Login process error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during login. Please try again."
    });
  }
});

// 2. Team Logout Route
router.post("/logout", async (req, res) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(400).json({
      success: false,
      message: "No token provided."
    });
  }

  try {
    // Clear/Delete session from MongoDB
    await TeamSession.deleteOne({ token });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully."
    });
  } catch (error) {
    console.error("Logout process error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred during logout."
    });
  }
});

// 3. Verify Logged-in Session Route
router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access Denied. No token provided."
    });
  }

  try {
    // Fetch session details from MongoDB to ensure it is active
    const session = await TeamSession.findOne({ token });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Session expired or invalid."
      });
    }

    // Verify token validity
    jwt.verify(token, getSecret());

    return res.status(200).json({
      success: true,
      team: {
        id: session.teamId,
        teamName: session.teamName
      }
    });
  } catch (error) {
    // If token invalid/expired, clean session from MongoDB
    try {
      await TeamSession.deleteOne({ token });
    } catch (_) {}

    return res.status(401).json({
      success: false,
      message: "Session invalid or expired."
    });
  }
});

module.exports = router;
