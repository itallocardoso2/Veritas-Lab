const express = require('express');
const db = require('../db');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
require('dotenv').config();
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
    // 1. Capturamos os parâmetros da URL. Se não existirem, usamos valores padrão.
    const { page = 1, search = '', area, date, type, impact } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Construímos a query dinamicamente
    // Selecionamos tags agregadas para cada artigo
    let baseQuery = `
        SELECT a.id,
               a.title,
               a.abstract,
               a.published_at,
               a.doi,
               a.content_url,
               a.authors,
               u.full_name as author_name,
               COALESCE(json_agg(t.name) FILTER (WHERE t.name IS NOT NULL), '[]') AS tags
        FROM articles a
        JOIN users u ON a.created_by = u.id
        LEFT JOIN article_tags at ON at.article_id = a.id
        LEFT JOIN tags t ON t.id = at.tag_id
        WHERE a.status = $1
    `;
    const params = ['published'];

    // Busca por termo no título, abstract ou nome do autor
    if (search) {
        baseQuery += ` AND (a.title ILIKE $${params.length + 1} OR a.abstract ILIKE $${params.length + 1} OR u.full_name ILIKE $${params.length + 1})`;
        params.push(`%${search}%`);
    }

    // Filtros simples baseados em tags (área, type, impact) ou data
    const addArrayOrSingleFilter = (val, aliasIndexBase) => {
        if (!val) return;
        // aliasIndexBase is unused here but kept for readability if needed
        if (Array.isArray(val)) {
            // use ILIKE ANY with array of patterns
            baseQuery += ` AND EXISTS (SELECT 1 FROM article_tags atf JOIN tags ttf ON ttf.id = atf.tag_id WHERE atf.article_id = a.id AND ttf.name ILIKE ANY($${params.length + 1}::text[]))`;
            params.push(val.map(v => `%${v}%`));
        } else {
            baseQuery += ` AND EXISTS (SELECT 1 FROM article_tags atf JOIN tags ttf ON ttf.id = atf.tag_id WHERE atf.article_id = a.id AND ttf.name ILIKE $${params.length + 1})`;
            params.push(`%${val}%`);
        }
    };

    addArrayOrSingleFilter(area);
    addArrayOrSingleFilter(type);
    addArrayOrSingleFilter(impact);

    if (date === 'recent') {
        baseQuery += ` AND a.published_at > now() - interval '30 days'`;
    }

    // Agrupamos para poder agregar tags
    baseQuery += ` GROUP BY a.id, u.full_name`;

    // Ordenação e paginação
    baseQuery += ` ORDER BY a.published_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    try {
        const r = await db.query(baseQuery, params);
        // r.rows[].tags é JSON array of names -> converter para JS array
        let articles = r.rows.map(row => ({
            ...row,
            tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags)
        }));

        // try to read optional user from Authorization header to include isFavorited
        let userId = null;
        const auth = req.headers.authorization;
        if (auth) {
            try {
                const token = auth.split(' ')[1];
                const data = jwt.verify(token, process.env.JWT_SECRET);
                userId = data.id;
            } catch (e) {
                // invalid token -> ignore, treat as anonymous
                userId = null;
            }
        }

        if (userId && articles.length > 0) {
            // fetch favorites for all returned articles in a single query
            const ids = articles.map(a => a.id);
            try {
                const favRes = await db.query('SELECT article_id FROM user_favorites WHERE user_id = $1 AND article_id = ANY($2::int[])', [userId, ids]);
                const favSet = new Set(favRes.rows.map(r => r.article_id));
                articles = articles.map(a => ({ ...a, isFavorited: favSet.has(a.id) }));
            } catch (e) {
                console.error('Erro ao buscar favoritos do usuário:', e);
                articles = articles.map(a => ({ ...a, isFavorited: false }));
            }
        } else {
            articles = articles.map(a => ({ ...a, isFavorited: false }));
        }

        res.json({ articles });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no banco de dados' });
    }
});

router.get('/:id', async (req, res) => {
    const r = await db.query(`
        SELECT a.*, u.full_name as author_name, u.id as author_user_id
        FROM articles a
        JOIN users u ON a.created_by = u.id
        WHERE a.id=$1
    `, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json({ article: r.rows[0] });
});

router.get('/:id/favorite-status', verifyToken, async (req, res) => {
    const { id: articleId } = req.params;
    const { id: userId } = req.user;

    try {
        const result = await db.query('SELECT * FROM user_favorites WHERE user_id = $1 AND article_id = $2', [userId, articleId]);
        res.json({ isFavorited: result.rows.length > 0 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// ROTA PARA FAVORITAR UM ARTIGO
router.post('/:id/favorite', verifyToken, async (req, res) => {
    const { id: articleId } = req.params;
    const { id: userId } = req.user;

    try {
        await db.query('INSERT INTO user_favorites (user_id, article_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, articleId]);
        res.status(201).json({ message: 'Artigo favoritado com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// ROTA PARA DESFAVORITAR UM ARTIGO
router.delete('/:id/favorite', verifyToken, async (req, res) => {
    const { id: articleId } = req.params;
    const { id: userId } = req.user;

    try {
        await db.query('DELETE FROM user_favorites WHERE user_id = $1 AND article_id = $2', [userId, articleId]);
        res.status(200).json({ message: 'Artigo removido dos favoritos.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

module.exports = router;

