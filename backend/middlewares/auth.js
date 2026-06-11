const jwt = require("jsonwebtoken");
const access_key = process.env.JWT_ACCESS_SECRET;
if (!access_key) {
    console.error("FATAL: JWT_ACCESS_SECRET is not set in environment variables");
    process.exit(1);
}

function auth(req, res, next) {
    const h = req.headers.authorization;
    if (!h) return res.sendStatus(401);
    const token = h.split(" ")[1];
    jwt.verify(token, access_key, (err, user) => {
        if (err) return res.status(401).json({ error: "access denied" });
        req.user = user;
        next();
    });
}

function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ msg: "Forbidden: insufficient role" });
        }
        next();
    };
}

module.exports = { auth, authorize };