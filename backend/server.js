const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const path = require("path");
const Patient = require("./models/Patient.js");
const bcrypt = require("bcryptjs");
require('dotenv').config();
const cookieParser = require("cookie-parser");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";
const frontendDistPath = path.join(__dirname, "..", "frontend", "dist");
const localOrigins = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];
const configuredOrigins = (process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
const allowedOrigins = [...new Set([...localOrigins, ...configuredOrigins])];

app.set("trust proxy", 1);
app.use(cors((req, callback) => {
    const origin = req.header("Origin");
    const host = req.get("host");
    const isSameHost = origin && host && (
        origin === `https://${host}` ||
        origin === `http://${host}`
    );

    if (!origin || isSameHost || allowedOrigins.includes(origin)) {
        return callback(null, { origin: true, credentials: true });
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(passport.initialize());


if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const serverUrl = process.env.SERVER_URL || `http://localhost:${PORT}`;

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `${serverUrl}/auth/google/callback`
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            let user = await Patient.findOne({ email });

            if (!user) {
                const hashedPassword = await bcrypt.hash("google_oauth_user", 10);

                let dummyPhone;
                let isUnique = false;
                while (!isUnique) {
                    const randomDigits = Math.floor(1000000000 + Math.random() * 9000000000);
                    dummyPhone = `+91${randomDigits}`;
                    const existing = await Patient.findOne({ phone: dummyPhone });
                    if (!existing) isUnique = true;
                }

                user = new Patient({
                    password: hashedPassword,
                    name: profile.displayName,
                    email,
                    gender: "other",
                    age: 0,
                    phone: dummyPhone
                });
                await user.save();
                console.log("New Google OAuth patient created:", user.email);
            }
            return done(null, user);
        } catch (err) {
            console.error("Google OAuth error:", err);
            return done(err, null);
        }
    }));
}


const route = require('./routes/patientRoutes.js');
const authRouter = require("./routes/authRoutes.js");
const adminRouter = require("./routes/adminRoutes.js");
const doctorRouter = require("./routes/doctorRoutes.js");
const staffRouter = require("./routes/staffRoutes.js");
const { startAutoSkipJob } = require("./jobs/autoSkip.js");

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smartcarequeue")
    .then(() => {
        console.log("✅ MongoDB Connected");
        startAutoSkipJob(); 
    })
    .catch(err => console.log("❌ MongoDB Error:", err));

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        dbState: mongoose.connection.readyState
    });
});

app.use("/api/patients", route);
app.use("/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/staff", staffRouter);
app.use("/api/doctor", doctorRouter);

if (isProduction) {
    app.use(express.static(frontendDistPath));
    app.use((req, res, next) => {
        if (req.method !== "GET" || req.path.startsWith("/api") || req.path.startsWith("/auth")) {
            return next();
        }

        return res.sendFile(path.join(frontendDistPath, "index.html"));
    });
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = passport;
