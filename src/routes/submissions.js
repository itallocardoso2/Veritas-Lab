const express = require('express');
const db = require('../db');
const { verifyToken } = require('../middlewares/auth');
const { upload, uploadToBlob, deleteFromBlob } = require('../middlewares/uploadBlob');
const router = express.Router();

router.post('/', verifyToken, upload.single('file'), uploadToBlob, async (req, res) => {
    const { title, abstract, keywords, area, authors, status } = req.body;

    // O uploadToBlob já coloca a URL em req.file.path
    const fileUrl = req.file ? req.file.path : null;
    const keywordsArr = keywords ? keywords.split(',').map(s => s.trim()) : [];

    try {



        const finalStatus = status === 'draft' ? 'draft' : 'pending';
        const q = `INSERT INTO submissions
            (title, abstract, authors, keywords, area, file_url, status, submitted_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;


        const r = await db.query(q, [title, abstract, authors, keywordsArr, area, fileUrl, finalStatus, req.user.id]);

        res.status(201).json({ submission: r.rows[0] });
    } catch (err) {
        console.error(err);

        if (err.code === '22P02') {
            return res.status(400).json({ error: 'Erro de formato nos dados enviados.' });
        }
        res.status(500).json({ error: 'Erro ao salvar no banco de dados.' });
    }
});

router.get('/mine', verifyToken, async (req, res) => {
    const r = await db.query(`
        SELECT s.*, a.id as article_id 
        FROM submissions s 
        LEFT JOIN articles a ON s.id = a.submission_id 
        WHERE s.submitted_by=$1 
        ORDER BY s.submitted_at DESC
    `, [req.user.id]);
    res.json({ submissions: r.rows });
});


router.get('/drafts', verifyToken, async (req, res) => {
    const r = await db.query("SELECT * FROM submissions WHERE submitted_by=$1 AND status='draft' ORDER BY submitted_at DESC", [req.user.id]);
    res.json({ drafts: r.rows });
});


router.patch('/:id', verifyToken, upload.single('file'), uploadToBlob, async (req, res) => {
    const { id } = req.params;
    const { title, abstract, keywords, area, authors, status } = req.body;
    const fileUrl = req.file ? req.file.path : null;
    const keywordsArr = keywords ? keywords.split(',').map(s => s.trim()) : null;


    const sets = [];
    const vals = [];
    let idx = 1;
    if (title != null) { sets.push(`title=$${idx++}`); vals.push(title); }
    if (abstract != null) { sets.push(`abstract=$${idx++}`); vals.push(abstract); }
    if (authors != null) { sets.push(`authors=$${idx++}`); vals.push(authors); }
    if (keywordsArr != null) { sets.push(`keywords=$${idx++}`); vals.push(keywordsArr); }
    if (area != null) { sets.push(`area=$${idx++}`); vals.push(area); }
    if (fileUrl) { sets.push(`file_url=$${idx++}`); vals.push(fileUrl); }
    if (status != null) { sets.push(`status=$${idx++}`); vals.push(status); }

    if (sets.length === 0) return res.status(400).json({ error: 'Nada para atualizar' });
    vals.push(id);

    const q = `UPDATE submissions SET ${sets.join(', ')} WHERE id=$${idx} RETURNING *`;
    try {

        const ownerCheck = await db.query('SELECT submitted_by FROM submissions WHERE id=$1', [id]);
        if (!ownerCheck.rows.length) return res.status(404).json({ error: 'Submissão não encontrada' });
        const ownerId = ownerCheck.rows[0].submitted_by;
        if (ownerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Não autorizado' });

        const r = await db.query(q, vals);
        res.json({ submission: r.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar submissão' });
    }
});


router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const r = await db.query('SELECT * FROM submissions WHERE id=$1', [id]);
        if (!r.rows.length) return res.status(404).json({ error: 'Submissão não encontrada' });
        const s = r.rows[0];


        if (s.status === 'approved') return res.json({ submission: s });


        const auth = req.headers.authorization;
        if (!auth) return res.status(403).json({ error: 'Não autorizado' });
        try {
            const jwt = require('jsonwebtoken');
            const token = auth.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (s.submitted_by === decoded.id || decoded.role === 'admin') {
                return res.json({ submission: s });
            }
            return res.status(403).json({ error: 'Não autorizado' });
        } catch (err) {
            return res.status(403).json({ error: 'Não autorizado' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});


router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    try {
        const r = await db.query('SELECT * FROM submissions WHERE id=$1', [id]);
        if (!r.rows.length) return res.status(404).json({ error: 'Submissão não encontrada' });

        const s = r.rows[0];


        if (s.submitted_by !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Não autorizado' });
        }

        // Deletar arquivo do Blob se existir
        if (s.file_url) {
            await deleteFromBlob(s.file_url);
        }

        await db.query('DELETE FROM submissions WHERE id=$1', [id]);
        res.json({ message: 'Submissão deletada com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

module.exports = router;
