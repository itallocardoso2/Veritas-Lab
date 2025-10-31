## 🚀 Tecnologias

- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **Frontend:** HTML5, Tailwind CSS, JavaScript Vanilla
- **Autenticação:** JWT (JSON Web Tokens)
- **Upload de Arquivos:** Multer

## 📋 Funcionalidades

### Para Usuários
- ✅ Registro e autenticação de conta
- ✅ Perfil personalizável com avatar e biografia
- ✅ Submissão de artigos científicos
- ✅ Sistema de rascunhos (drafts)
- ✅ Feed de artigos publicados
- ✅ Sistema de favoritos
- ✅ Comentários e respostas em artigos
- ✅ Curtidas em comentários
- ✅ Sistema de notificações em tempo real
- ✅ Busca e filtros avançados
- ✅ Visualização de perfis de outros usuários

### Para Administradores
- ✅ Painel administrativo
- ✅ Aprovação/rejeição de submissões
- ✅ Gestão de artigos publicados
- ✅ Sistema de notificações para autores

## 🛠️ Instalação

### Pré-requisitos
- Node.js (v14 ou superior)
- PostgreSQL (v12 ou superior)
- npm ou yarn

### Passos

1. Entre no Projeto
```bash
cd VeritasLab
```

2. Instale as dependências
```bash
npm install
```

3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
PORT=3000
DATABASE_URL=url-do-seu-banco-de-dados
JWT_SECRET=sua_chave_secreta_jwt
UPLOAD_DIR=./uploads(pasta-de-uploads)
```

5. Execute a aplicação

```bash
npm start
```

Para desenvolvimento, você pode usar:

```bash
npm run dev
```

Isso iniciará o servidor com auto-reload usando nodemon (se configurado).

A aplicação estará disponível em `http://localhost:3000`

## 📁 Estrutura do Projeto

```
VeritasLab/
├── public/              # Arquivos estáticos (HTML, CSS, JS)
│   ├── js/             # Scripts JavaScript do frontend
│   ├── *.html          # Páginas HTML
│   └── uploads/        # Arquivos enviados pelos usuários
├── src/
│   ├── controllers/    # Controladores da aplicação
│   ├── middlewares/    # Middlewares (auth, upload)
│   ├── routes/         # Rotas da API
│   ├── sql/           # Scripts SQL
│   ├── app.js         # Configuração do Express
│   ├── db.js          # Conexão com PostgreSQL
│   └── server.js      # Servidor HTTP
├── .env               # Variáveis de ambiente
├── .gitignore        # Arquivos ignorados pelo Git
├── package.json      # Dependências do projeto
└── README.md         # Este arquivo
```

## 🔐 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Obter perfil do usuário logado
- `PATCH /api/auth/me` - Atualizar perfil
- `POST /api/auth/avatar` - Upload de avatar

### Artigos
- `GET /api/articles` - Listar artigos (com filtros)
- `GET /api/articles/:id` - Obter artigo por ID
- `POST /api/articles/:id/favorite` - Favoritar artigo
- `DELETE /api/articles/:id/favorite` - Desfavoritar artigo
- `DELETE /api/articles/:id` - Deletar artigo (autor/admin)

### Submissões
- `POST /api/submissions` - Criar submissão
- `GET /api/submissions/mine` - Listar minhas submissões
- `GET /api/submissions/drafts` - Listar rascunhos
- `PATCH /api/submissions/:id` - Atualizar submissão
- `DELETE /api/submissions/:id` - Deletar submissão

### Comentários
- `GET /api/articles/:articleId/comments` - Listar comentários
- `POST /api/articles/:articleId/comments` - Criar comentário
- `POST /api/comments/:id/like` - Curtir comentário
- `DELETE /api/comments/:id/like` - Descurtir comentário

### Notificações
- `GET /api/notifications` - Listar notificações
- `GET /api/notifications/unread-count` - Contador de não lidas
- `PATCH /api/notifications/:id/read` - Marcar como lida
- `PATCH /api/notifications/read-all` - Marcar todas como lidas
- `DELETE /api/notifications/:id` - Deletar notificação

### Admin
- `GET /api/admin/submissions` - Listar submissões pendentes
- `POST /api/admin/approve/:id` - Aprovar submissão
- `POST /api/admin/reject/:id` - Rejeitar submissão

### Usuários
- `GET /api/users/:id` - Obter perfil público
- `GET /api/users/:id/articles` - Listar artigos do usuário
- `GET /api/users/me/favorites` - Listar favoritos

## 🔒 Autenticação

A API utiliza JWT (JSON Web Tokens) para autenticação. Após o login, inclua o token no header das requisições:

```
Authorization: Bearer seu_token_jwt
```

## 👥 Tipos de Usuário

- **Usuário Comum:** Pode submeter artigos, comentar, favoritar
- **Admin:** Pode aprovar/rejeitar submissões, deletar artigos

## 🎨 Temas e Cores

- **Primary:** #3498DB
- **Background Dark:** #121212
- **Card Dark:** #1E1E1E
- **Text Main:** #FFFFFF
- **Text Secondary:** #9DABB8

