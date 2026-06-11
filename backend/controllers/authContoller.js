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
    passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
}

function callback(req, res) {
    const payload = { email: req.user.email, role: "Patient", id: req.user._id };
    const at = createAToken(payload);
    const rt = createRToken(payload);
    res.cookie("refreshToken", rt, { httpOnly: true, sameSite: "lax", secure: false });
    // Redirect to frontend with token
    res.redirect(`http://localhost:5173/patient/dash?token=${at}`);
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

function logout(req, res) {
    res.clearCookie("refreshToken", { httpOnly: true, secure: false, sameSite: "strict" });
    res.json({ msg: "logged out" });
}

module.exports = { refreshP, google, callback, logout, loginP, loginS, loginD, loginA, refreshD, refreshS, refreshA };