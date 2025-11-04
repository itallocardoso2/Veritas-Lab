document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/logincadastro.html';
        return;
    }


    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'admin') {
        const adminLink = document.getElementById('admin-link');
        if (adminLink) adminLink.classList.remove('hidden');
    }


    const headerAvatar = document.getElementById('header-avatar');
    if (headerAvatar && user.avatar_url) {
        headerAvatar.style.backgroundImage = `url("${user.avatar_url}")`;
    }

    const submissionForm = document.getElementById('submission-form');
    const fileInput = document.getElementById('file-upload');
    const fileNameDisplay = document.getElementById('file-name');
    const messageContainer = document.getElementById('message-container');

    const keywordsInput = document.getElementById('keywords');
    const keywordsChips = document.getElementById('keywords-chips');
    const previewKeywords = document.getElementById('preview-keywords');

    const authorName = document.getElementById('author-name');
    const authorAffiliation = document.getElementById('author-affiliation');
    const authorEmail = document.getElementById('author-email');
    const addCoauthorBtn = document.getElementById('add-coauthor');
    const coauthorsList = document.getElementById('coauthors-list');
    const clearCoauthorFieldsBtn = document.getElementById('clear-coauthor-fields');
    const coauthorNameInput = document.getElementById('coauthor-name');
    const coauthorAffInput = document.getElementById('coauthor-affiliation');
    const coauthorEmailInput = document.getElementById('coauthor-email');
    const previewAuthors = document.getElementById('preview-authors');

    const fileDropArea = document.getElementById('file-drop-area');
    const fileInfo = document.getElementById('file-info');
    const fileNameDisplayFull = document.getElementById('file-name-display');
    const uploadProgress = document.getElementById('upload-progress');
    const fileSelect = document.getElementById('file-select');

    const previewTitle = document.getElementById('preview-title');
    const previewAbstract = document.getElementById('preview-abstract');
    const previewFileText = document.getElementById('preview-file-text');

    const submitButton = document.getElementById('submit-button');
    const headerSubmit = document.getElementById('header-submit-button');
    const saveDraftBtn = document.getElementById('save-draft');

    let currentUserData = null;
    let coauthors = [];
    let selectedFile = null;

    function showMessage(message, isError = true) {
        messageContainer.innerHTML = `<p class="font-bold ${isError ? 'text-error' : 'text-success'}">${message}</p>`;
    }


    async function fetchUser() {
        try {
            const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Sessão inválida');
            const data = await res.json();
            currentUserData = data.user;


            if (currentUserData) {
                if (!authorName.value) authorName.value = currentUserData.full_name || '';

                authorEmail.value = currentUserData.email || '';
            }
            syncPreview();
        } catch (err) {
            localStorage.removeItem('token');
            window.location.href = '/logincadastro.html';
        }
    }


    function renderKeywordsChips() {
        keywordsChips.innerHTML = '';
        const raw = keywordsInput.value || '';
        const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
        parts.forEach((k, idx) => {
            const el = document.createElement('div');
            el.className = 'flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#283039] pl-3 pr-2';
            el.innerHTML = `<p class="text-white text-sm font-medium leading-normal">${k}</p><span data-idx="${idx}" class="material-symbols-outlined text-base cursor-pointer remove-keyword">close</span>`;
            keywordsChips.appendChild(el);
        });

        previewKeywords.innerHTML = '';
        parts.forEach(k => {
            const s = document.createElement('div');
            s.className = 'flex h-7 shrink-0 items-center justify-center gap-x-2 rounded-md bg-[#283039] px-3';
            s.innerHTML = `<p class="text-white text-xs font-medium">${k}</p>`;
            previewKeywords.appendChild(s);
        });
    }

    keywordsInput.addEventListener('input', () => {
        renderKeywordsChips();
        syncPreview();
    });

    keywordsChips.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-keyword')) {
            const idx = Number(e.target.dataset.idx);
            const parts = (keywordsInput.value || '').split(',').map(p => p.trim()).filter(Boolean);
            parts.splice(idx, 1);
            keywordsInput.value = parts.join(', ');
            renderKeywordsChips();
            syncPreview();
        }
    });


    function renderCoauthors() {
        coauthorsList.innerHTML = '';
        previewAuthors.innerHTML = '';
        coauthors.forEach((c, i) => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between bg-[#283039]/20 p-2 rounded-md';
            item.innerHTML = `<div><div class="font-medium">${c.name}</div><div class="text-sm text-gray-400">${c.affiliation} • ${c.email}</div></div><button data-i="${i}" class="ml-4 text-error remove-coauthor">Remover</button>`;
            coauthorsList.appendChild(item);

            const li = document.createElement('li');
            li.textContent = `${c.name} (${c.affiliation || '—'})`;
            previewAuthors.appendChild(li);
        });
    }

    addCoauthorBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const name = (coauthorNameInput.value || '').trim();
        const affiliation = (coauthorAffInput.value || '').trim();
        const email = (coauthorEmailInput.value || '').trim();
        if (!name) return showMessage('Nome do coautor é obrigatório.');
        coauthors.push({ name, affiliation, email });

        coauthorNameInput.value = '';
        coauthorAffInput.value = '';
        coauthorEmailInput.value = '';
        renderCoauthors();
        syncPreview();
    });

    clearCoauthorFieldsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        coauthorNameInput.value = '';
        coauthorAffInput.value = '';
        coauthorEmailInput.value = '';
    });

    coauthorsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-coauthor')) {
            const i = Number(e.target.dataset.i);
            coauthors.splice(i, 1);
            renderCoauthors();
            syncPreview();
        }
    });


    fileDropArea.addEventListener('click', () => fileInput.click());
    fileSelect.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            selectedFile = fileInput.files[0];

            const maxBytes = 30 * 1024 * 1024;
            if (selectedFile.size > maxBytes) {
                showMessage('Arquivo muito grande. O tamanho máximo permitido é 30MB.');

                fileInput.value = '';
                selectedFile = null;
                fileNameDisplay.textContent = 'Arraste e solte o arquivo aqui ou';
                fileInfo.classList.add('hidden');
                previewFileText.textContent = 'Nenhum arquivo';
                return;
            }
            fileNameDisplay.textContent = selectedFile.name;
            fileInfo.classList.remove('hidden');
            fileNameDisplayFull.textContent = selectedFile.name + ` (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB)`;
            previewFileText.textContent = selectedFile.name;
        } else {
            selectedFile = null;
            fileNameDisplay.textContent = 'Arraste e solte o arquivo aqui ou';
            fileInfo.classList.add('hidden');
            previewFileText.textContent = 'Nenhum arquivo';
        }
    });

    ;['dragenter', 'dragover'].forEach(evt => fileDropArea.addEventListener(evt, (e) => { e.preventDefault(); fileDropArea.classList.add('border-primary'); }));
    ;['dragleave', 'drop'].forEach(evt => fileDropArea.addEventListener(evt, (e) => { e.preventDefault(); fileDropArea.classList.remove('border-primary'); }));

    fileDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) {
            fileInput.files = e.dataTransfer.files;
            const ev = new Event('change');
            fileInput.dispatchEvent(ev);
        }
    });


    function syncPreview() {
        previewTitle.textContent = document.getElementById('title').value || '-';
        previewAbstract.textContent = document.getElementById('abstract').value || '-';
        renderKeywordsChips();

        previewAuthors.innerHTML = '';
        const primaryName = (authorName.value && authorName.value.trim()) || (currentUserData && user.full_name) || null;
        const primaryAff = (authorAffiliation.value && authorAffiliation.value.trim()) || '';
        if (primaryName) {
            const li = document.createElement('li');
            li.textContent = `${primaryName} ${primaryAff ? '(' + primaryAff + ')' : ''}`;
            previewAuthors.appendChild(li);
        }
        coauthors.forEach(c => {
            const li = document.createElement('li');
            li.textContent = `${c.name} ${c.affiliation ? '(' + c.affiliation + ')' : ''}`;
            previewAuthors.appendChild(li);
        });
    }



    function getQueryParam(name) {
        const url = new URL(window.location.href);
        return url.searchParams.get(name);
    }

    let currentDraftId = getQueryParam('draftId') || null;

    async function saveDraftToServer() {
        const fd = new FormData();
        fd.append('title', document.getElementById('title').value);
        fd.append('abstract', document.getElementById('abstract').value);
        fd.append('keywords', document.getElementById('keywords').value);
        fd.append('area', document.getElementById('area').value);
        const authorsArr = [];
        const primary = { name: authorName.value || (currentUserData && user.full_name) || '', affiliation: authorAffiliation.value || '', email: (currentUserData && user.email) || authorEmail.value || '' };
        authorsArr.push(primary);
        coauthors.forEach(c => authorsArr.push(c));
        fd.append('authors', JSON.stringify(authorsArr));
        if (selectedFile) fd.append('file', selectedFile);
        fd.append('status', 'draft');

        try {
            let res, data;
            if (currentDraftId) {

                res = await fetch(`/api/submissions/${currentDraftId}`, { method: 'PATCH', body: fd, headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                data = await res.json();
            } else {
                res = await fetch('/api/submissions', { method: 'POST', body: fd, headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                data = await res.json();
                if (res.ok && data.submission && data.submission.id) {
                    currentDraftId = data.submission.id;

                    const u = new URL(window.location.href);
                    u.searchParams.set('draftId', String(currentDraftId));
                    window.history.replaceState({}, '', u.toString());
                }
            }

            if (!res.ok) throw new Error(data.error || 'Falha ao salvar rascunho');
            showMessage('Rascunho salvo no servidor.', false);
            return data.submission || data;
        } catch (err) {
            showMessage(err.message || 'Erro ao salvar rascunho');
            throw err;
        }
    }

    saveDraftBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await saveDraftToServer();
    });


    async function doSubmit() {
        if (!document.getElementById('terms').checked) return showMessage('Você precisa aceitar os termos.');
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';


        const primaryNameCheck = (authorName.value || '').trim();
        if (!primaryNameCheck) {
            submitButton.disabled = false;
            submitButton.textContent = 'Submeter Artigo';
            return showMessage('Nome do autor principal é obrigatório.');
        }


        if (currentUserData && user.email) {
            authorEmail.value = currentUserData.email;
        }

        const fd = new FormData();
        fd.append('title', document.getElementById('title').value);
        fd.append('abstract', document.getElementById('abstract').value);
        fd.append('keywords', document.getElementById('keywords').value);
        fd.append('area', document.getElementById('area').value);


        const authorsArr = [];
        const primary = { name: authorName.value || (currentUserData && user.full_name) || '', affiliation: authorAffiliation.value || '', email: (currentUserData && user.email) || authorEmail.value || '' };
        authorsArr.push(primary);
        coauthors.forEach(c => authorsArr.push(c));
        fd.append('authors', JSON.stringify(authorsArr));

        if (selectedFile) fd.append('file', selectedFile);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/submissions');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                uploadProgress.style.width = pct + '%';
                fileInfo.classList.remove('hidden');
            }
        });

        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                submitButton.disabled = false;
                submitButton.textContent = 'Submeter Artigo';
                try {
                    const res = JSON.parse(xhr.responseText || '{}');
                    if (xhr.status >= 200 && xhr.status < 300) {
                        showMessage('Artigo submetido com sucesso! Redirecionando...', false);


                        if (currentDraftId) {
                            fetch(`/api/submissions/${currentDraftId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            }).catch(err => console.error('Erro ao deletar rascunho:', err));
                        }

                        setTimeout(() => window.location.href = '/perfil.html', 1500);
                    } else {
                        showMessage(res.error || 'Erro ao enviar submissão.');
                    }
                } catch (err) {
                    showMessage('Resposta inválida do servidor.');
                }
            }
        };

        xhr.send(fd);
    }

    submitButton.addEventListener('click', (e) => { e.preventDefault(); doSubmit(); });
    headerSubmit.addEventListener('click', (e) => { e.preventDefault(); doSubmit(); });


    ['input', 'change'].forEach(ev => {
        document.getElementById('title').addEventListener(ev, syncPreview);
        document.getElementById('abstract').addEventListener(ev, syncPreview);
        authorName.addEventListener(ev, syncPreview);
        authorAffiliation.addEventListener(ev, syncPreview);
    });


    async function loadDraftFromServer() {
        try {
            if (currentDraftId) {
                const resp = await fetch(`/api/submissions/${currentDraftId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
                if (!resp.ok) return;
                const payload = await resp.json();
                const draft = payload.submission;
                if (!draft) return;

                populateDraftToForm(draft);
                return;
            }

            const res = await fetch('/api/submissions/drafts', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
            if (!res.ok) return;
            const data = await res.json();
            if (!data.drafts || data.drafts.length === 0) return;

            const draft = data.drafts[0];
            if (draft.title) document.getElementById('title').value = draft.title;
            if (draft.abstract) document.getElementById('abstract').value = draft.abstract;
            if (draft.keywords) document.getElementById('keywords').value = (Array.isArray(draft.keywords) ? draft.keywords.join(', ') : draft.keywords);
            if (draft.area) document.getElementById('area').value = draft.area;
            if (draft.authors) {
                try {
                    const authorsArr = Array.isArray(draft.authors) ? draft.authors : JSON.parse(draft.authors);
                    if (authorsArr && authorsArr.length > 0) {
                        const primary = authorsArr[0];
                        authorName.value = primary.name || authorName.value;
                        authorAffiliation.value = primary.affiliation || authorAffiliation.value;

                        if (authorsArr.length > 1) coauthors = authorsArr.slice(1);
                    }
                } catch (err) { }
            }
            renderCoauthors();
            renderKeywordsChips();
            syncPreview();

            if (draft.id) {
                currentDraftId = draft.id;
                const u = new URL(window.location.href);
                u.searchParams.set('draftId', String(currentDraftId));
                window.history.replaceState({}, '', u.toString());
            }
        } catch (err) { }
    }

    function populateDraftToForm(draft) {
        if (draft.title) document.getElementById('title').value = draft.title;
        if (draft.abstract) document.getElementById('abstract').value = draft.abstract;
        if (draft.keywords) document.getElementById('keywords').value = (Array.isArray(draft.keywords) ? draft.keywords.join(', ') : draft.keywords);
        if (draft.area) document.getElementById('area').value = draft.area;
        if (draft.authors) {
            try {
                const authorsArr = Array.isArray(draft.authors) ? draft.authors : JSON.parse(draft.authors);
                if (authorsArr && authorsArr.length > 0) {
                    const primary = authorsArr[0];
                    authorName.value = primary.name || authorName.value;
                    authorAffiliation.value = primary.affiliation || authorAffiliation.value;
                    if (authorsArr.length > 1) coauthors = authorsArr.slice(1);
                }
            } catch (err) { }
        }
        renderCoauthors();
        renderKeywordsChips();
        syncPreview();
        if (draft.id) {
            currentDraftId = draft.id;
            const u = new URL(window.location.href);
            u.searchParams.set('draftId', String(currentDraftId));
            window.history.replaceState({}, '', u.toString());
        }
    }


    (function initDraftLoad() { loadDraftFromServer(); })();


    fetchUser();
});
