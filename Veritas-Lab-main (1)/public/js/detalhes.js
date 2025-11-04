document.addEventListener('DOMContentLoaded', () => {

    const articleContentContainer = document.getElementById('article-content');
    const commentsSection = document.getElementById('comments-section');
    const commentForm = document.getElementById('comment-form');
    const commentTextarea = document.getElementById('comment-textarea');
    const commentSubmitButton = document.getElementById('comment-submit-button');
    const commentsContainer = document.getElementById('comments-container');

    const token = localStorage.getItem('token');
    if (!token) {
        commentTextarea.placeholder = 'Você precisa estar logado para comentar.';
        commentTextarea.disabled = true;
        commentSubmitButton.disabled = true;
    }

    const params = new URLSearchParams(window.location.search);
    const articleId = params.get('id');

    let isFavorited = false;
    let currentArticle = null;

    if (!articleId) {
        articleContentContainer.innerHTML = '<p class="text-center text-red-500 text-xl">Artigo não encontrado. ID inválido.</p>';
        commentsSection.style.display = 'none';
        return;
    }


    function timeAgo(date) {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        const intervals = [
            { label: 'ano', seconds: 31536000 },
            { label: 'mês', seconds: 2592000 },
            { label: 'dia', seconds: 86400 },
            { label: 'hora', seconds: 3600 },
            { label: 'min', seconds: 60 },
            { label: 'seg', seconds: 1 }
        ];
        for (const i of intervals) {
            const count = Math.floor(seconds / i.seconds);
            if (count >= 1) return `há ${count} ${i.label}${count > 1 && i.label !== 'min' ? 's' : ''}`;
        }
        return 'agora';
    }

    function createArticleHtml(article) {
        const publishedDate = new Date(article.published_at).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });


        let authorsHtml = '';
        if (article.author_user_id) {
            authorsHtml = `<a href="/perfil-usuario.html?id=${article.author_user_id}" class="hover:underline text-primary">${article.author_name || 'Autor Principal'}</a>`;
        } else {
            authorsHtml = article.author_name || 'Autor não informado';
        }


        if (article.authors && article.authors.length > 0) {
            const coAuthorsHtml = article.authors.map(a => {
                if (a.user_id) {
                    return `<a href="/perfil-usuario.html?id=${a.user_id}" class="hover:underline text-primary">${a.name}</a>`;
                }
                return a.name;
            }).join(', ');
            authorsHtml += ', ' + coAuthorsHtml;
        }


        const university = article.journal || "VeritasLab Journal";
        const doi = article.doi ? article.doi : `10.1234/vlab.${article.id}`; // Simulação de DOI
        const doiLink = doi ? `<a class="text-primary hover:underline" href="https://doi.org/${doi}" target="_blank">DOI: ${doi}</a>` : '';
        const articleContent = article.content || '<p class="font-body text-base font-normal leading-relaxed text-gray-200">Conteúdo completo não disponível nesta versão de demonstração. Baixe o arquivo ou consulte o resumo acima.</p>';
        const keywordsList = (article.keywords && article.keywords.length > 0) ? article.keywords.join(', ') : '';


        return `
            <div class="flex flex-wrap justify-between gap-4 py-4">
                <div class="flex flex-col gap-3 min-w-0 flex-1">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="size-8 text-primary flex-shrink-0">
                            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <g clip-path="url(#clip0_6_543_2)">
                                    <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor"></path>
                                    <path clip-rule="evenodd" d="M7.24189 26.4066C7.31369 26.4411 7.64204 26.5637 8.52504 26.3738C9.59462 26.1438 11.0343 25.5311 12.7183 24.4963C14.7583 23.2426 17.0256 21.4503 19.238 19.238C21.4503 17.0256 23.2426 14.7583 24.4963 12.7183C25.5311 11.0343 26.1438 9.59463 26.3738 8.52504C26.5637 7.64204 26.4411 7.31369 26.4066 7.24189C26.345 7.21246 26.143 7.14535 25.6664 7.1918C24.9745 7.25925 23.9954 7.5498 22.7699 8.14278C20.3369 9.32007 17.3369 11.4915 14.4142 14.4142C11.4915 17.3369 9.32007 20.3369 8.14278 22.7699C7.5498 23.9954 7.25925 24.9745 7.1918 25.6664C7.14534 26.143 7.21246 26.345 7.24189 26.4066ZM29.9001 10.7285C29.4519 12.0322 28.7617 13.4172 27.9042 14.8126C26.465 17.1544 24.4686 19.6641 22.0664 22.0664C19.6641 24.4686 17.1544 26.465 14.8126 27.9042C13.4172 28.7617 12.0322 29.4519 10.7285 29.9001L21.5754 40.747C21.6001 40.7606 21.8995 40.931 22.8729 40.7217C23.9424 40.4916 25.3821 39.879 27.0661 38.8441C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor" fill-rule="evenodd"></path>
                                </g>
                                <defs>
                                    <clipPath id="clip0_6_543_2"><rect fill="white" height="48" width="48"></rect></clipPath>
                                </defs>
                            </svg>
                        </div>
                        <h1 class="text-gray-100 text-4xl font-black leading-tight tracking-[-0.033em] font-display break-words overflow-wrap-anywhere min-w-0">${article.title}</h1>
                    </div>
                    <p class="text-gray-300 text-base font-normal leading-normal font-display break-words">
                        ${authorsHtml} | ${university} | Publicado em ${publishedDate} ${doiLink ? `| ${doiLink}` : ''}
                    </p>
                </div>
            </div>

            <div class="flex justify-start gap-2 border-y border-[#2C2C2C] my-4 py-2">
                <button id="favorite-button" class="p-2 text-gray-200 hover:text-primary transition-colors rounded-lg flex items-center gap-2">
                    <span id="favorite-icon" class="material-symbols-outlined text-2xl">bookmark_add</span> 
                    <span id="favorite-text" class="text-sm hidden sm:inline">Salvar</span>
                </button>
                <button id="cite-button" class="p-2 text-gray-200 hover:text-primary transition-colors rounded-lg flex items-center gap-2">
                    <span class="material-symbols-outlined text-2xl">format_quote</span> <span class="text-sm hidden sm:inline">Citar</span>
                </button>
                <a href="${article.content_url}" target="_blank" rel="noopener noreferrer" id="download-button" class="p-2 text-gray-200 hover:text-primary transition-colors rounded-lg flex items-center gap-2">
                    <span class="material-symbols-outlined text-2xl">download</span><span class="text-sm hidden sm:inline">Baixar Arquivo</span>
                </a>
                <button id="share-button" class="p-2 text-gray-200 hover:text-primary transition-colors rounded-lg flex items-center gap-2">
                    <span class="material-symbols-outlined text-2xl">share</span><span class="text-sm hidden sm:inline">Compartilhar</span>
                </button>
            </div>
            
            <article class="prose prose-invert prose-p:font-body prose-headings:font-display prose-headings:text-gray-100 prose-p:text-gray-200 max-w-none space-y-6">
                <section>
                    <h2 class="text-[22px] font-bold leading-tight tracking-[-0.015em]">Resumo</h2>
                    <p class="font-body text-base font-normal leading-relaxed text-gray-200 break-words">${article.abstract}</p>
                    ${keywordsList ? `<p class="font-body text-base font-normal leading-relaxed text-gray-200 break-words"><strong>Palavras-chave:</strong> ${keywordsList}</p>` : ''}
                </section>
                <section>
                    <h2 class="text-[22px] font-bold leading-tight tracking-[-0.015em]">Conteúdo Completo</h2>
                    <div class="font-body text-base font-normal leading-relaxed text-gray-200 break-words">${articleContent}</div>
                </section>
            </article>
        `;
    }


    function createCommentHtml(comment) {

        const isArticleAuthor = comment.is_article_author || false;

        const commentDate = timeAgo(new Date(comment.created_at));
        const avatarUrl = comment.avatar_url ? comment.avatar_url : `https://i.pravatar.cc/40?u=${comment.username}`;
        function escapeHtml(s) { return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }


        const indentationClass = comment.parent_id ? 'ml-8 sm:ml-14' : '';


        const authorTag = isArticleAuthor
            ? '<span class="text-xs font-normal text-primary">(Autor)</span>'
            : '';

        const liked = comment.liked_by_me ? true : false;
        return `
            <div class="comment-item flex items-start gap-4 ${indentationClass} mb-4" data-comment-id="${comment.id}">
                <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 flex-shrink-0" style="background-image: url('${avatarUrl}');"></div>
                <div class="flex-1">
                    <div class="bg-[#1A1A1A] p-4 rounded-lg">
                        <div class="flex items-center justify-between mb-2">
                            <p class="font-bold text-gray-100 font-display break-words">
                                ${comment.user_id ? `<a href="/perfil-usuario.html?id=${comment.user_id}" class="hover:underline text-primary">${escapeHtml(comment.full_name)}</a>` : escapeHtml(comment.full_name)} ${authorTag}
                            </p>
                            <p class="text-xs text-gray-400 font-display">${commentDate}</p>
                        </div>
                        <p class="text-gray-200 font-body leading-relaxed break-words">${escapeHtml(comment.content)}</p>
                    </div>
                    
                    <div class="mt-2 flex gap-4 text-sm text-gray-400 items-center">
                        <button class="reply-button hover:text-primary" data-comment-id="${comment.id}">Responder</button>
                        <button class="like-button hover:text-primary ${liked ? 'liked text-primary' : ''}" data-comment-id="${comment.id}" data-liked="${liked}">${liked ? 'Descurtir' : 'Curtir'}</button>
                        <span class="likes-count text-xs text-gray-400 ml-2">${comment.likes_count || 0} curtida(s)</span>
                    </div>
                    
                    <!-- container para inserir o formulário de resposta dinamicamente -->
                    <div class="reply-form-container mt-2"></div>
                </div>
            </div>`;
    }



    function setupActionButtons() {
        const favoriteButton = document.getElementById('favorite-button');
        const citeButton = document.getElementById('cite-button');
        const shareButton = document.getElementById('share-button');

        if (favoriteButton) favoriteButton.addEventListener('click', toggleFavorite);
        if (citeButton) citeButton.addEventListener('click', openCiteModal);
        if (shareButton) shareButton.addEventListener('click', openShareModal);

        if (!token) {
            if (favoriteButton) favoriteButton.style.display = 'none';
        }
    }

    function updateFavoriteButtonUI() {
        const favoriteButton = document.getElementById('favorite-button');
        const favoriteIcon = document.getElementById('favorite-icon');
        const favoriteText = document.getElementById('favorite-text');

        if (!favoriteButton || !favoriteIcon || !favoriteText) return;

        if (isFavorited) {
            favoriteIcon.textContent = 'bookmark_added';
            favoriteText.textContent = 'Salvo';
            favoriteButton.classList.add('text-primary');
        } else {
            favoriteIcon.textContent = 'bookmark_add';
            favoriteText.textContent = 'Salvar';
            favoriteButton.classList.remove('text-primary');
        }
    }

    async function toggleFavorite() {
        if (!token) return;

        const method = isFavorited ? 'DELETE' : 'POST';

        try {
            const response = await fetch(`/api/articles/${articleId}/favorite`, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Não foi possível alterar o status de favorito.');

            isFavorited = !isFavorited;
            updateFavoriteButtonUI();

        } catch (error) {
            alert(error.message);
        }
    }

    async function loadPageContent() {
        try {

            const articleResponse = await fetch(`/api/articles/${articleId}`);
            if (!articleResponse.ok) throw new Error('Artigo não encontrado');
            const articleData = await articleResponse.json();
            currentArticle = articleData.article;


            articleContentContainer.innerHTML = createArticleHtml(currentArticle);


            setupActionButtons();


            if (token) {
                const favResponse = await fetch(`/api/articles/${articleId}/favorite-status`, { headers: { 'Authorization': `Bearer ${token}` } });
                const favData = await favResponse.json();
                isFavorited = favData.isFavorited;
                updateFavoriteButtonUI();
            }


            const commentsResponse = await fetch(`/api/articles/${articleId}/comments`, token ? { headers: { 'Authorization': `Bearer ${token}` } } : {});
            if (!commentsResponse.ok) throw new Error('Não foi possível carregar comentários');
            const commentsData = await commentsResponse.json();
            commentsContainer.innerHTML = '';
            if (commentsData.comments && commentsData.comments.length > 0) {
                commentsData.comments.forEach(comment => { commentsContainer.innerHTML += createCommentHtml(comment); });

                attachCommentInteractionHandlers();
            } else {
                commentsContainer.innerHTML = '<p class="no-comments-message text-center text-gray-400">Nenhum comentário ainda. Seja o primeiro a comentar!</p>';
            }
        } catch (error) {
            console.error(error);
            articleContentContainer.innerHTML = `<p class="text-center text-red-500 text-xl">${error.message}.</p>`;
            commentsSection.style.display = 'none';
        }
    }

    commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = commentTextarea.value.trim();
        if (!content || !token) return;

        commentSubmitButton.disabled = true;
        commentSubmitButton.textContent = 'Enviando...';

        try {
            const response = await fetch(`/api/articles/${articleId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Não foi possível postar o comentário.');
            }

            const newCommentHtml = createCommentHtml(data.comment);

            const noCommentsMessage = commentsContainer.querySelector('.no-comments-message');
            if (noCommentsMessage) noCommentsMessage.remove();
            commentsContainer.insertAdjacentHTML('afterbegin', newCommentHtml);

            attachCommentInteractionHandlers();

            commentTextarea.value = '';

        } catch (error) {
            alert(error.message);
        } finally {
            commentSubmitButton.disabled = false;
            commentSubmitButton.textContent = 'Comentar';
        }
    });



    loadPageContent();


    function attachCommentInteractionHandlers() {

        document.querySelectorAll('.reply-button').forEach(btn => {
            btn.removeEventListener('click', onReplyClick);
            btn.addEventListener('click', onReplyClick);
        });


        document.querySelectorAll('.like-button').forEach(btn => {
            btn.removeEventListener('click', onLikeClick);
            btn.addEventListener('click', onLikeClick);
        });
    }

    function onReplyClick(e) {
        const commentId = e.currentTarget.dataset.commentId;
        const wrapper = e.currentTarget.closest('div').parentElement.querySelector('.reply-form-container');
        if (!wrapper) return;


        if (wrapper.querySelector('form')) return;

        const formHtml = `
            <form class="reply-form flex items-start gap-4" data-parent-id="${commentId}">
                <div class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-8 flex-shrink-0" style='background-image: url("https://i.pravatar.cc/32?u=reply");'></div>
                <div class="flex-1">
                    <textarea class="reply-textarea w-full bg-[#1A1A1A] text-gray-200 p-2 rounded-lg border border-[#2C2C2C]" rows="2" placeholder="Escreva sua resposta..."></textarea>
                    <div class="flex gap-2 mt-2">
                        <button type="submit" class="px-3 py-1 bg-primary text-white rounded">Responder</button>
                        <button type="button" class="cancel-reply px-3 py-1 bg-gray-700 text-white rounded">Cancelar</button>
                    </div>
                </div>
            </form>`;

        wrapper.innerHTML = formHtml;

        const form = wrapper.querySelector('.reply-form');
        form.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const textarea = form.querySelector('.reply-textarea');
            const content = textarea.value.trim();
            if (!content || !token) return alert('Você precisa estar logado para responder.');

            try {
                const response = await fetch(`/api/articles/${articleId}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ content, parent_id: form.dataset.parentId })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Erro ao enviar resposta');


                const newHtml = createCommentHtml(data.comment);

                const parentCommentDiv = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
                if (parentCommentDiv) {
                    parentCommentDiv.insertAdjacentHTML('afterend', newHtml);
                } else {
                    commentsContainer.insertAdjacentHTML('beforeend', newHtml);
                }


                wrapper.innerHTML = '';
                attachCommentInteractionHandlers();
            } catch (err) {
                alert(err.message);
            }
        });

        wrapper.querySelector('.cancel-reply').addEventListener('click', () => { wrapper.innerHTML = ''; });
    }

    async function onLikeClick(e) {
        const btn = e.currentTarget;
        const commentId = btn.dataset.commentId;
        if (!token) return alert('Você precisa estar logado para curtir.');

        try {

            const liked = btn.dataset.liked === 'true' || btn.classList.contains('liked');
            const method = liked ? 'DELETE' : 'POST';
            const response = await fetch(`/api/articles/${articleId}/comments/${commentId}/like`, {
                method,
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Erro ao alterar curtida');
            const data = await response.json();

            const container = btn.closest('.flex-1');
            const likesSpan = container.querySelector('.likes-count');
            if (likesSpan) likesSpan.textContent = `${data.likes_count} curtida(s)`;

            if (method === 'POST') {
                btn.dataset.liked = 'true';
                btn.classList.add('liked', 'text-primary');
                btn.textContent = 'Descurtir';
            } else {
                btn.dataset.liked = 'false';
                btn.classList.remove('liked', 'text-primary');
                btn.textContent = 'Curtir';
            }
        } catch (err) {
            alert(err.message);
        }
    }




    const citeModal = document.getElementById('cite-modal');
    const closeCiteModalButton = document.getElementById('close-cite-modal');
    if (closeCiteModalButton) closeCiteModalButton.addEventListener('click', () => citeModal.classList.add('hidden'));

    function formatAuthors(authors) {
        if (!authors || authors.length === 0) return 'Aut. Desconhecido';

        // ABNT: SOBRENOME, N. N.; SOBRENOME, N. N.
        const abntAuthors = authors.map(author => {
            const parts = author.name.split(' ');
            const lastName = parts.pop().toUpperCase();
            const firstInitials = parts.map(p => p.charAt(0).toUpperCase() + '.').join(' ');
            return `${lastName}, ${firstInitials}`;
        }).join('; ');

        // APA: Sobrenome, N. N., & Sobrenome, N. N.
        let apaAuthors = authors.map(author => {
            const parts = author.name.split(' ');
            const lastName = parts.pop();
            const firstInitials = parts.map(p => p.charAt(0) + '.').join('');
            return `${lastName}, ${firstInitials}`;
        });

        if (apaAuthors.length > 1) {
            const lastAuthor = apaAuthors.pop();
            apaAuthors = apaAuthors.join(', ') + `, & ${lastAuthor}`;
        } else {
            apaAuthors = apaAuthors.join('');
        }

        return { abnt: abntAuthors, apa: apaAuthors };
    }

    function openCiteModal() {
        if (!currentArticle) return;

        const year = new Date(currentArticle.published_at).getFullYear() || new Date().getFullYear();
        const authors = formatAuthors(currentArticle.authors);
        const title = currentArticle.title;
        const journal = currentArticle.journal || 'VeritasLab Journal';
        const url = window.location.href;

        // Formato ABNT: SOBRENOME, N. N. Título do Artigo. Journal, ano, p. [DOI:...] Disponível em: ...
        const abntCitation = `${authors.abnt}. ${title.toUpperCase()}. ${journal}, ${year}. Disponível em: ${url}. Acesso em: ${new Date().toLocaleDateString('pt-BR')}.`;

        // Formato APA: Sobrenome, N. N. (Ano). Título do artigo. Nome da Revista/Journal. Link ou DOI.
        const apaCitation = `${authors.apa} (${year}). ${title}. ${journal}. Recuperado de ${url}`;

        document.getElementById('abnt-citation').textContent = abntCitation;
        document.getElementById('apa-citation').textContent = apaCitation;

        citeModal.classList.remove('hidden');
    }


    const shareModal = document.getElementById('share-modal');
    const closeShareModalButton = document.getElementById('close-share-modal');
    if (closeShareModalButton) closeShareModalButton.addEventListener('click', () => shareModal.classList.add('hidden'));

    function openShareModal() {
        if (!currentArticle) return;

        const shareUrl = window.location.href;
        const title = encodeURIComponent(currentArticle.title + ' | VeritasLab');
        const encodedUrl = encodeURIComponent(shareUrl);


        document.getElementById('share-link-input').value = shareUrl;


        document.getElementById('share-twitter').href = `https://twitter.com/intent/tweet?text=${title}&url=${encodedUrl}`;
        document.getElementById('share-linkedin').href = `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${title}`;
        document.getElementById('share-whatsapp').href = `whatsapp://send?text=${title} - ${encodedUrl}`;

        shareModal.classList.remove('hidden');
    }


    document.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.copyTarget || 'share-link-input';
            let textToCopy;

            if (targetId === 'share-link-input') {
                textToCopy = document.getElementById(targetId).value;
            } else {
                textToCopy = document.getElementById(targetId).textContent;
            }

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = button.textContent;
                button.textContent = 'Copiado!';
                setTimeout(() => { button.textContent = originalText; }, 2000);
            }).catch(err => {
                console.error('Falha ao copiar:', err);
                alert('Erro ao copiar o texto. Tente novamente.');
            });
        });
    });


    document.getElementById('copy-link-button').addEventListener('click', () => {
        const button = document.getElementById('copy-link-button');
        const textToCopy = document.getElementById('share-link-input').value;

        navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = button.textContent;
            button.textContent = 'Copiado!';
            setTimeout(() => { button.textContent = originalText; }, 2000);
        }).catch(err => {
            console.error('Falha ao copiar o link:', err);
            alert('Erro ao copiar o link. Tente novamente.');
        });
    });

});