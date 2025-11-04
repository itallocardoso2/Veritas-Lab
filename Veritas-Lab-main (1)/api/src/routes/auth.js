const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const { generateToken, verifyToken } = require('../middlewares/auth');
const { body, validationResult } = require('express-validator');
const upload = require('../middlewares/upload');
const router = express.Router();

const registerValidationRules = [
    body('email', 'Por favor, insira um email válido.').isEmail().normalizeEmail(),
    body('username', 'O nome de usuário é obrigatório.').notEmpty().trim().escape(),
    body('password', 'A senha precisa ter no mínimo 6 caracteres.').isLength({ min: 6 }),
    body('full_name').optional().trim().escape()
];

router.post('/register', registerValidationRules, async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, full_name } = req.body;

    const pwHash = await bcrypt.hash(password, 10);
    try {
        const result = await db.query(
            'INSERT INTO users (username,email,password_hash,full_name) VALUES ($1,$2,$3,$4) RETURNING id, username, email, role',
            [username, email, pwHash, full_name]
        );
        const user = result.rows[0];
        const token = generateToken(user);
        res.status(201).json({ user, token });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Email ou nome de usuário já cadastrado.' });
        }
        console.error(err);
        res.status(500).json({ error: 'db error' });
    }
});

router.post('/login', [
    body('email', 'Email inválido').isEmail().normalizeEmail(),
    body('password', 'Senha não pode ser vazia').notEmpty()
], async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ error: 'missing fields' });
    try {
        const result = await db.query('SELECT id,username,email,password_hash,role,avatar_url FROM users WHERE email=$1', [email]);
        const u = result.rows[0];
        if (!u) return res.status(400).json({ error: 'invalid credentials' });
        const ok = await bcrypt.compare(password, u.password_hash);
        if (!ok) return res.status(400).json({ error: 'invalid credentials' });
        const token = generateToken(u);
        res.json({ user: { id: u.id, username: u.username, email: u.email, role: u.role, avatar_url: u.avatar_url }, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'db error' });
    }
});

router.get('/me', require('../middlewares/auth').verifyToken, async (req, res) => {
    const { id } = req.user;
    const r = await db.query('SELECT id,username,email,full_name,role,created_at,avatar_url,bio,citations,rating,publications_count FROM users WHERE id=$1', [id]);
    res.json({ user: r.rows[0] });
});

router.patch('/me', verifyToken, async (req, res) => {
    const { id } = req.user;
    const { full_name, bio } = req.body;
    if (!full_name || full_name.trim() === '') {
        return res.status(400).json({ error: 'O nome completo não pode ser vazio.' });
    }

    try {
        const result = await db.query(
            'UPDATE users SET full_name = $1, bio = COALESCE($2, bio) WHERE id = $3 RETURNING id, username, email, full_name, role, created_at, avatar_url, bio, citations, rating, publications_count',
            [full_name, bio, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

router.post('/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const { id } = req.user;
    const avatarUrl = `/uploads/${req.file.filename}`;

    try {
        await db.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarUrl, id]);
        res.json({ message: 'Imagem de perfil atualizada com sucesso!', avatar_url: avatarUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

module.exports = router;
