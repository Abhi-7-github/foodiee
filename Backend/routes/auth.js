const express = require("express");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const dotenv = require("dotenv");

// Load .env explicitly from the Backend root folder
dotenv.config({
  path: path.resolve(__dirname, "../.env")
});

const TeamSession = require("../Models/TeamSession");

const router = express.Router();

/* =========================================================
   ENVIRONMENT CONFIGURATION
========================================================= */

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error(
    "JWT_SECRET is missing. Check your Backend/.env file."
  );

  throw new Error(
    "JWT_SECRET is missing. Please add JWT_SECRET to your .env file."
  );
}

/* =========================================================
   TEAMS JSON CONFIGURATION
========================================================= */

const teamsPath = path.join(__dirname, "../teams.json");

/**
 * Load registered teams from teams.json
 */
const loadTeams = () => {
  try {
    const data = fs.readFileSync(teamsPath, "utf8");

    const teams = JSON.parse(data);

    if (!Array.isArray(teams)) {
      console.error(
        "teams.json must contain an array of teams."
      );

      return [];
    }

    return teams;
  } catch (error) {
    console.error(
      "Error reading teams.json:",
      error.message
    );

    return [];
  }
};

/* =========================================================
   TOKEN EXTRACTION HELPER
========================================================= */

const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    return null;
  }

  const token = authHeader
    .substring(7)
    .trim();

  return token || null;
};

/* =========================================================
   TEAM AUTHENTICATION MIDDLEWARE
========================================================= */

const verifyTeamToken = async (
  req,
  res,
  next
) => {
  const token = getTokenFromHeader(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message:
        "Access denied. No authentication token provided."
    });
  }

  try {
    /* --------------------------------
       Verify JWT signature + expiry
    -------------------------------- */

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    /* --------------------------------
       Make sure this is a team token
    -------------------------------- */

    if (decoded.role !== "team") {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Invalid account role."
      });
    }

    /* --------------------------------
       Find active MongoDB session
    -------------------------------- */

    const session =
      await TeamSession.findOne({
        token
      });

    if (!session) {
      return res.status(401).json({
        success: false,
        message:
          "Session expired or invalid. Please login again."
      });
    }

    /* --------------------------------
       Validate session ownership
    -------------------------------- */

    if (
      String(decoded.id) !==
        String(session.teamId) ||
      decoded.teamName !==
        session.teamName
    ) {
      await TeamSession.deleteOne({
        _id: session._id
      });

      return res.status(401).json({
        success: false,
        message:
          "Session validation failed. Please login again."
      });
    }

    /* --------------------------------
       Attach team information
    -------------------------------- */

    req.team = {
      id: session.teamId,
      teamName: session.teamName
    };

    req.teamSession = session;
    req.token = token;

    next();
  } catch (error) {
    /* --------------------------------
       Remove invalid/expired session
    -------------------------------- */

    try {
      await TeamSession.deleteOne({
        token
      });
    } catch (cleanupError) {
      console.error(
        "Session cleanup error:",
        cleanupError.message
      );
    }

    if (
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Session expired. Please login again."
      });
    }

    return res.status(401).json({
      success: false,
      message:
        "Invalid authentication token. Please login again."
    });
  }
};

/* =========================================================
   1. TEAM LOGIN
   POST /api/team/login
========================================================= */

router.post(
  "/login",
  async (req, res) => {
    try {
      const { teamName } = req.body;

      /* -----------------------------
         Validate team name
      ----------------------------- */

      if (
        !teamName ||
        typeof teamName !== "string" ||
        !teamName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Team Name is required."
        });
      }

      const cleanInputName =
        teamName
          .trim()
          .toLowerCase();

      /* -----------------------------
         Load teams.json
      ----------------------------- */

      const registeredTeams =
        loadTeams();

      if (
        registeredTeams.length === 0
      ) {
        console.error(
          "No teams found in teams.json."
        );

        return res.status(500).json({
          success: false,
          message:
            "Unable to verify registered teams."
        });
      }

      /* -----------------------------
         Find matching team
      ----------------------------- */

      const matchedTeam =
        registeredTeams.find(
          (team) =>
            team &&
            typeof team.teamName ===
              "string" &&
            team.teamName
              .trim()
              .toLowerCase() ===
              cleanInputName
        );

      if (!matchedTeam) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid Team Name. Please check your registered team name."
        });
      }

      /* -----------------------------
         Validate team ID
      ----------------------------- */

      if (
        matchedTeam.id === undefined ||
        matchedTeam.id === null
      ) {
        console.error(
          `Team ID missing for: ${matchedTeam.teamName}`
        );

        return res.status(500).json({
          success: false,
          message:
            "Team configuration is invalid."
        });
      }

      /* -----------------------------
         Generate unique JWT
      ----------------------------- */

      const token = jwt.sign(
        {
          id: String(
            matchedTeam.id
          ),

          teamName:
            matchedTeam.teamName,

          role: "team",

          jti: crypto.randomUUID()
        },

        JWT_SECRET,

        {
          expiresIn: "7d"
        }
      );

      /* -----------------------------
         Save session to MongoDB
      ----------------------------- */

      const session =
        await TeamSession.create({
          teamId: String(
            matchedTeam.id
          ),

          teamName:
            matchedTeam.teamName,

          token
        });

      /* -----------------------------
         Successful response
      ----------------------------- */

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Login successful.",

          token,

          team: {
            id: session.teamId,

            teamName:
              session.teamName
          }
        });
    } catch (error) {
      console.error(
        "Team login error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "An error occurred during login. Please try again."
        });
    }
  }
);

/* =========================================================
   2. TEAM LOGOUT
   POST /api/team/logout
========================================================= */

router.post(
  "/logout",
  async (req, res) => {
    const token =
      getTokenFromHeader(req);

    if (!token) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "No authentication token provided."
        });
    }

    try {
      /*
        Delete only the current
        active session.
      */

      await TeamSession.deleteOne({
        token
      });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Logged out successfully."
        });
    } catch (error) {
      console.error(
        "Team logout error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            "An error occurred during logout."
        });
    }
  }
);

/* =========================================================
   3. GET CURRENT LOGGED-IN TEAM
   GET /api/team/me
========================================================= */

router.get(
  "/me",
  verifyTeamToken,
  (req, res) => {
    return res
      .status(200)
      .json({
        success: true,

        team: {
          id: req.team.id,

          teamName:
            req.team.teamName
        }
      });
  }
);

module.exports = router;