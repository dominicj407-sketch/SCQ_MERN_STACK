const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const Patient = require("./models/Patient.js");
const bcrypt = require("bcryptjs");
require('dotenv').config();
const cookieParser = require("cookie-parser");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();

app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(passport.initialize());

// ── Google OAuth Strategy ──────────────────────────────────────────────────
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        let user = await Patient.findOne({ email });

        if (!user) {
            const hashedPassword = await bcrypt.hash("google_oauth_user", 10);
            
            // Generate a unique dummy phone number to satisfy the unique phone requirement
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

// ── Routes ─────────────────────────────────────────────────────────────────
const route = require('./routes/patientRoutes.js');
const authRouter = require("./routes/authRoutes.js");
const adminRouter = require("./routes/adminRoutes.js");
const doctorRouter = require("./routes/doctorRoutes.js");
const staffRouter = require("./routes/staffRoutes.js");
const { startAutoSkipJob } = require("./jobs/autoSkip.js");

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/smartcarequeue")
    .then(() => {
        console.log("✅ MongoDB Connected");
        startAutoSkipJob(); // Start the 2-minute no-show auto-skip background job
    })
    .catch(err => console.log("❌ MongoDB Error:", err));

app.use("/api/patients", route);
app.use("/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/staff", staffRouter);
app.use("/api/doctor", doctorRouter);

app.listen(3000, () => {
    console.log("🚀 Server running on port 3000");
});

module.exports = passport;