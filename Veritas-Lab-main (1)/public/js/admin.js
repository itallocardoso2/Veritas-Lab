document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/logincadastro.html';
        return;
    }


    const userString = localStorage.getItem('user');
    let user = null;
    if (userString) {
        try {
            user = JSON.parse(userString);
            if (user.role !== 'admin') {
                alert('Acesso negado. Você não tem permissão para acessar o painel admin.');
                window.location.href = '/feed.html';
                return;
            }
        } catch (e) {
            console.error('Erro ao verificar role:', e);
            window.location.href = '/feed.html';
            return;
        }
    } else {
        window.location.href = '/logincadastro.html';
        return;
    }


    const headerAvatar = document.getElementById('header-avatar');
    if (headerAvatar && user && user.avatar_url) {
        headerAvatar.style.backgroundImage = `url("${user.avatar_url}")`;
    }


    const submissionsTbody = document.getElementById('submissions-tbody');
    const logoutButton = document.getElementById('logout-button');


    const tabPending = document.getElementById('tab-pending');
    const tabApproved = document.getElementById('tab-approved');
    const tabRejected = document.getElementById('tab-rejected');


    const submissionModal = document.getElementById('submission-modal');
    const closeModalButton = document.getElementById('close-modal');
    const modalTitle = document.getElementById('modal-submission-title');
    const modalAuthors = document.getElementById('modal-submission-authors');
    const modalAbstract = document.getElementById('modal-submission-abstract');
    const modalArea = document.getElementById('modal-submission-area');
    const modalKeywords = document.getElementById('modal-submission-keywords');
    const modalFile = document.getElementById('modal-submission-file');
    const modalSubmitter = document.getElementById('modal-submission-submitter');
    const modalDate = document.getElementById('modal-submission-date');
    const modalActions = document.getElementById('modal-actions');
    const approveButton = document.getElementById('approve-button');
    const rejectButton = document.getElementById('reject-button');

    let currentFilter = 'pending';
    let currentSubmissionId = null;


    async function fetchWithAuth(url, options = {}) {
        const defaultHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        options.headers = { ...defaultHeaders, ...options.headers };

        const response = await fetch(url, options);
        if (response.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/logincadastro.html';
            throw new Error('Não autorizado');
        }
        return response;
    }

    async function loadSubmissions(status = 'pending') {
        submissionsTbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Carregando submissões...</td></tr>';
        try {
            const response = await fetchWithAuth(`/api/admin/submissions?status=${status}`);
            const data = await response.json();
            submissionsTbody.innerHTML = '';

            if (data.submissions && data.submissions.length > 0) {
                data.submissions.forEach(sub => {
                    const authorsText = sub.authors
                        ? (Array.isArray(sub.authors)
                            ? sub.authors.map(a => a.name || a).join(', ')
                            : sub.author_name || '—')
                        : sub.author_name || '—';

                    const row = `
                        <tr class="border-t border-t-border-dark hover:bg-[#283039]/50">
                            <td class="h-[72px] px-6 py-2 text-text-main-dark text-base font-normal leading-normal max-w-0"><div class="truncate" title="${sub.title}">${sub.title}</div></td>
                            <td class="h-[72px] px-6 py-2 text-text-secondary-dark text-base font-normal leading-normal max-w-0"><div class="truncate" title="${authorsText}">${authorsText}</div></td>
                            <td class="h-[72px] px-6 py-2 text-text-secondary-dark text-base font-normal leading-normal">${sub.area || '—'}</td>
                            <td class="h-[72px] px-6 py-2 text-text-secondary-dark text-base font-normal leading-normal">
                                ${new Date(sub.submitted_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td class="h-[72px] px-6 py-2">
                                <button onclick="window.viewSubmission(${sub.id})" class="text-primary hover:underline font-semibold">
                                    Ver Detalhes
                                </button>
                            </td>
                        </tr>`;
                    submissionsTbody.innerHTML += row;
                });
            } else {
                const statusMessages = {
                    pending: 'Nenhuma submissão pendente.',
                    approved: 'Nenhuma submissão aprovada.',
                    rejected: 'Nenhuma submissão rejeitada.'
                };
                submissionsTbody.innerHTML = `<tr><td colspan="5" class="text-center p-4">${statusMessages[status] || 'Nenhuma submissão encontrada.'}</td></tr>`;
            }
        } catch (error) {
            console.error('Erro ao carregar submissões:', error);
            submissionsTbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-500">Erro ao carregar submissões.</td></tr>';
        }
    }

    async function loadSubmissionDetails(id) {
        try {
            const response = await fetchWithAuth(`/api/submissions/${id}`);
            const data = await response.json();

            if (data.submission) {
                const sub = data.submission;
                currentSubmissionId = id;

                modalTitle.textContent = sub.title;

                const authorsText = sub.authors
                    ? (Array.isArray(sub.authors)
                        ? sub.authors.map(a => a.name || a).join(', ')
                        : sub.author_name || 'Não informado')
                    : sub.author_name || 'Não informado';
                modalAuthors.textContent = authorsText;

                modalAbstract.textContent = sub.abstract || 'Sem resumo';
                modalArea.textContent = sub.area || '—';
                modalKeywords.textContent = (sub.keywords && sub.keywords.length > 0) ? sub.keywords.join(', ') : '—';

                if (sub.file_url) {
                    modalFile.href = sub.file_url;
                    modalFile.style.display = 'inline';
                } else {
                    modalFile.style.display = 'none';
                }

                modalSubmitter.textContent = sub.submitter_name || 'Não informado';
                modalDate.textContent = new Date(sub.submitted_at).toLocaleString('pt-BR');


                if (sub.status === 'pending') {
                    modalActions.style.display = 'flex';
                } else {
                    modalActions.style.display = 'none';
                }

                submissionModal.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
            alert('Erro ao carregar detalhes da submissão');
        }
    }

    async function approveSubmission(id) {
        if (!confirm('Tem certeza que deseja aprovar esta submissão?')) return;

        try {
            const response = await fetchWithAuth(`/api/admin/approve/${id}`, {
                method: 'POST'
            });

            if (response.ok) {
                alert('Submissão aprovada com sucesso!');
                submissionModal.classList.add('hidden');
                loadSubmissions(currentFilter);
            } else {
                const data = await response.json();
                alert(data.error || 'Erro ao aprovar submissão');
            }
        } catch (error) {
            console.error('Erro ao aprovar:', error);
            alert('Erro ao aprovar submissão');
        }
    }

    async function rejectSubmission(id) {
        const reason = prompt('Motivo da rejeição (opcional):');
        if (reason === null) return;

        try {
            const response = await fetchWithAuth(`/api/admin/reject/${id}`, {
                method: 'POST',
                body: JSON.stringify({ reason })
            });

            if (response.ok) {
                alert('Submissão rejeitada.');
                submissionModal.classList.add('hidden');
                loadSubmissions(currentFilter);
            } else {
                const data = await response.json();
                alert(data.error || 'Erro ao rejeitar submissão');
            }
        } catch (error) {
            console.error('Erro ao rejeitar:', error);
            alert('Erro ao rejeitar submissão');
        }
    }


    function setActiveTab(activeTab, status) {

        [tabPending, tabApproved, tabRejected].forEach(tab => {
            if (tab) {
                tab.classList.remove('border-b-primary', 'text-text-main-dark');
                tab.classList.add('border-b-transparent', 'text-text-secondary-dark');
            }
        });


        if (activeTab) {
            activeTab.classList.remove('border-b-transparent', 'text-text-secondary-dark');
            activeTab.classList.add('border-b-primary', 'text-text-main-dark');
        }

        currentFilter = status;
        loadSubmissions(status);
    }


    tabPending.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveTab(tabPending, 'pending');
    });

    tabApproved.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveTab(tabApproved, 'approved');
    });

    tabRejected.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveTab(tabRejected, 'rejected');
    });

    closeModalButton.addEventListener('click', () => {
        submissionModal.classList.add('hidden');
    });

    approveButton.addEventListener('click', () => {
        if (currentSubmissionId) {
            approveSubmission(currentSubmissionId);
        }
    });

    rejectButton.addEventListener('click', () => {
        if (currentSubmissionId) {
            rejectSubmission(currentSubmissionId);
        }
    });


    submissionModal.addEventListener('click', (e) => {
        if (e.target === submissionModal) {
            submissionModal.classList.add('hidden');
        }
    });



    window.viewSubmission = loadSubmissionDetails;


    loadSubmissions('pending');
});
