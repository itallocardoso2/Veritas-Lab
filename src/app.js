const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const articlesRoutes = require('./routes/articles');
const submissionsRoutes = require('./routes/submissions');
const adminRoutes = require('./routes/admin');
const commentsRoutes = require('./routes/comments');
const usersRoutes = require('./routes/users');
const { router: notificationsRoutes } = require('./routes/notifications');

const app = express();

// Configuração de CORS para permitir requisições do frontend
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);

app.use('/api/articles/:articleId/comments', commentsRoutes);

app.get('/api', (req, res) => res.send({ ok: true, service: 'veritaslab backend' }));

// Para desenvolvimento local
if (require.main === module) {
    const port = process.env.PORT || 4000;
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}

// Exporta o app para o Vercel (serverless)
module.exports = app;
