const bcrypt = require("bcryptjs");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const Staff = require("../models/staff");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const Admin = require("../models/Admin");

const access_key = process.env.JWT_ACCESS_SECRET;
const refresh_key = process.env.JWT_REFRESH_SECRET;

function createAToken(user) {
    return jwt.sign(user, access_key, { expiresIn: "15m" });
}

function createRToken(user) {
    return jwt.sign(user, refresh_key, { expiresIn: "1d" });
}

async function loginP(req, res) {
    try {

        const { email, password } = req.body;
        const u = await Patient.findOne({ email });
        if (!u) return res.status(401).json({ msg: "Invalid email" });

        const match = await bcrypt.compare(password, u.password);

        if (!match) return res.status(401).json({ msg: "Password incorrect" });

        const payload = { role: "Patient", email: u.email, id: u._id };
        const at = createAToken(payload);
        const rt = createRToken(payload);
        res.cookie("refreshToken", rt, { httpOnly: true, sameSite: "lax", secure: false });
        res.json({ accessToken: at, role: payload.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function loginS(req, res) {
    try {
        const { staffId, password } = req.body;
        const u = await Staff.findOne({ staffId });
        if (!u) return res.status(400).json({ msg: "Invalid staff ID" });

        const match = await bcrypt.compare(password, u.password);
        if (!match) return res.status(400).json({ msg: "Password incorrect" });

        const payload = { role: "Staff", staffId, id: u._id };
        const at = createAToken(payload);
        const rt = createRToken(payload);
        res.cookie("refreshToken", rt, { httpOnly: true, sameSite: "lax", secure: false });
        res.json({ accessToken: at, role: payload.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function loginD(req, res) {
    try {
        const { doctorId, password } = req.body;
        const u = await Doctor.findOne({ id: doctorId });
        if (!u) return res.status(401).json({ msg: "Invalid doctor ID" });

        const match = await bcrypt.compare(password, u.password);
        if (!match) return res.status(401).json({ msg: "Password incorrect" });

        const payload = { role: "Doctor", id: doctorId, _id: u._id };
        const at = createAToken(payload);
        const rt = createRToken(payload);
        res.cookie("refreshToken", rt, { httpOnly: true, sameSite: "lax", secure: false });
        res.json({ accessToken: at, role: payload.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function loginA(req, res) {
    try {
        const { email, password } = req.body;

        const u = await Admin.findOne({ email });
        if (!u) return res.status(401).json({ msg: "Invalid credentials" });

        const match = await bcrypt.compare(password, u.password);
        if (!match) return res.status(401).json({ msg: "Password incorrect" });

        const payload = { role: "Admin", email: u.email, id: u._id };
        const at = createAToken(payload);
        const rt = createRToken(payload);
        res.cookie("refreshToken", rt, { httpOnly: true, sameSite: "lax", secure: false });
        res.json({ accessToken: at, role: payload.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

function google(req, res, next) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(503).json({ msg: "Google OAuth is not configured" });
    }

    const forwardedProto = req.get("x-forwarded-proto");
    const forwardedHost = req.get("x-forwarded-host");
    const protocol = forwardedProto ? forwardedProto.split(",")[0].trim() : req.protocol;
    const host = forwardedHost ? forwardedHost.split(",")[0].trim() : req.get("host");
    console.log(`Google OAuth redirect URI: ${protocol}://${host}/auth/google/callback`);
    passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
}

function callback(req, res) {
    const payload = { email: req.user.email, role: "Patient", id: req.user._id };
    const at = createAToken(payload);
    const rt = createRToken(payload);
    res.cookie("refreshToken", rt, { httpOnly: true, sameSite: "lax", secure: false });
    
    res.redirect(`/patient/dash?token=${at}`);
}

function refreshP(req, res) {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ msg: "logout" });
    jwt.verify(token, refresh_key, (err, user) => {
        if (err) return res.status(403).json({ msg: "logout" });
        const payload = { email: user.email, role: user.role, id: user.id };
        const at = createAToken(payload);
        res.status(200).json({ accessToken: at });
    });
}

function refreshS(req, res) {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ msg: "logout" });
    jwt.verify(token, refresh_key, (err, user) => {
        if (err) return res.status(403).json({ msg: "logout" });
        const payload = { staffId: user.staffId, role: user.role, id: user.id };
        const at = createAToken(payload);
        res.json({ accessToken: at });
    });
}

function refreshD(req, res) {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ msg: "logout" });
    jwt.verify(token, refresh_key, (err, user) => {
        if (err) return res.status(403).json({ msg: "logout" });
        const payload = { id: user.id, role: user.role, _id: user._id };
        const at = createAToken(payload);
        res.json({ accessToken: at });
    });
}

function refreshA(req, res) {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ msg: "logout" });
    jwt.verify(token, refresh_key, (err, user) => {
        if (err) return res.status(403).json({ msg: "logout" });
        const payload = { email: user.email, role: user.role };
        const at = createAToken(payload);
        res.json({ accessToken: at });
    });
}

async function forgotPassword(req, res) {
    try {
        const { role, email, identifier, masterPassword, newPassword } = req.body;
        if (!role || !masterPassword || !newPassword) {
            return res.status(400).json({ msg: "Missing required fields" });
        }

        let user;
        const normalizedRole = role.toLowerCase();

        if (normalizedRole === 'patient') {
            user = await Patient.findOne({ email: email ? email.toLowerCase() : "" });
        } else if (normalizedRole === 'doctor') {
            const query = {};
            if (email) query.email = email.toLowerCase();
            else if (identifier) query.id = identifier;
            else return res.status(400).json({ msg: "Email or Doctor ID is required" });
            user = await Doctor.findOne(query);
        } else if (normalizedRole === 'staff') {
            const query = {};
            if (email) query.email = email.toLowerCase();
            else if (identifier) query.staffId = identifier;
            else return res.status(400).json({ msg: "Email or Staff ID is required" });
            user = await Staff.findOne(query);
        } else {
            return res.status(400).json({ msg: "Invalid role" });
        }

        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        if (!user.masterPassword) {
            return res.status(400).json({ msg: "Master password recovery is not set up for this user" });
        }

        
        const isMatch = await bcrypt.compare(masterPassword, user.masterPassword);
        if (!isMatch) {
            
            if (user.masterPassword !== masterPassword) {
                return res.status(401).json({ msg: "Incorrect master password" });
            }
        }

        
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();

        return res.json({ msg: "Password updated successfully" });
    } catch (err) {
        console.error("forgotPassword error:", err);
        return res.status(500).json({ error: err.message });
    }
}

function logout(req, res) {
    res.clearCookie("refreshToken", { httpOnly: true, secure: false, sameSite: "strict" });
    res.json({ msg: "logged out" });
}

module.exports = { refreshP, google, callback, logout, loginP, loginS, loginD, loginA, refreshD, refreshS, refreshA, forgotPassword };
