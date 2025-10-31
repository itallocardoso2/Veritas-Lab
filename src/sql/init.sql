CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    bio TEXT,
    avatar_url TEXT,
    citations INTEGER DEFAULT 0,
    rating NUMERIC(3, 2),
    publications_count INTEGER DEFAULT 0,
    role VARCHAR(20) DEFAULT 'author',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE TABLE articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    abstract TEXT,
    doi VARCHAR(255),
    content_url TEXT,
    status VARCHAR(30) DEFAULT 'published',
    published_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES users(id) ON DELETE
    SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    abstract TEXT,
    authors JSONB,
    keywords TEXT [],
    area VARCHAR(100),
    file_url TEXT,
    status VARCHAR(30) DEFAULT 'pending',
    submitted_by INTEGER REFERENCES users(id) ON DELETE
    SET NULL,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        decision_at TIMESTAMP WITH TIME ZONE,
        decision_by INTEGER REFERENCES users(id)
);
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);
CREATE TABLE article_tags (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE
    SET NULL,
        parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
ALTER TABLE articles
ADD COLUMN authors JSONB;
CREATE TABLE user_favorites (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, article_id)
);
CREATE TABLE comment_likes (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, comment_id)
);
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    related_id INTEGER,
    related_user_id INTEGER REFERENCES users(id) ON DELETE
    SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_articles_published_at ON articles(published_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_comments_article_id ON comments(article_id);
CREATE INDEX idx_article_tags_article_id ON article_tags(article_id);
CREATE INDEX idx_article_tags_tag_id ON article_tags(tag_id);