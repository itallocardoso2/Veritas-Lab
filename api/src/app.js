const express = require('express');
const path = require('path');
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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);

app.use('/api/articles/:articleId/comments', commentsRoutes);

app.get('/api', (req, res) => res.send({ ok: true, service: 'veritaslab backend' }));

module.exports = app;
