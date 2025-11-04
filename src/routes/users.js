const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middlewares/auth');
const router = express.Router();


router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            'SELECT id, username, email, full_name, bio, avatar_url, citations, rating, publications_count, created_at FROM users WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({ user: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});


router.get('/:id/articles', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(
            `SELECT id, title, abstract, published_at, doi 
             FROM articles 
             WHERE created_by = $1 AND status = 'published'
             ORDER BY published_at DESC`,
            [id]
        );

        res.json({ articles: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar artigos' });
    }
});


router.get('/me/favorites', verifyToken, async (req, res) => {
    try {
        const r = await db.query(`
            SELECT a.*, u.full_name as author_name
            FROM articles a
            JOIN user_favorites uf ON uf.article_id = a.id
            LEFT JOIN users u ON a.created_by = u.id
            WHERE uf.user_id = $1
            ORDER BY a.published_at DESC
        `, [req.user.id]);
        res.json({ favorites: r.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar favoritos' });
    }
});

module.exports = router;