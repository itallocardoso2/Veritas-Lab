const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.generateToken = (user) => {
    const payload = { id: user.id, username: user.username, role: user.role };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.verifyToken = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'missing token' });
    const token = auth.split(' ')[1];
    try {
        const data = jwt.verify(token, process.env.JWT_SECRET);
        req.user = data;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'invalid token' });
    }
};

exports.requireRole = (role) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'unauth' });
    if (req.user.role !== role && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'forbidden' });
    }
    next();
};