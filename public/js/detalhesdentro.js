document.addEventListener('DOMContentLoaded', async () => {
    function getQueryParam(name) {
        const url = new URL(window.location.href);
        return url.searchParams.get(name);
    }

    const submissionId = getQueryParam('submissionId');
    if (!submissionId) return;

    try {
        const res = await fetch(`/api/submissions/${submissionId}`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        if (!res.ok) {
            console.error('Não foi possível carregar submissão');
            return;
        }
        const data = await res.json();
        const s = data.submission;
        if (!s) return;

        
        const h1 = document.querySelector('h1');
        if (h1 && s.title) h1.textContent = s.title;

        
        const metaP = document.querySelector('main p');
        if (metaP) {
            let authors = '—';
            try {
                const authorsArr = Array.isArray(s.authors) ? s.authors : JSON.parse(s.authors || '[]');
                authors = authorsArr.map(a => a.name).join(', ');
            } catch (err) { authors = '—'; }
            metaP.innerHTML = `${authors} | Submetido em ${new Date(s.submitted_at).toLocaleDateString('pt-BR')}`;
        }

        
        const summary = document.querySelector('article section p');
        if (summary && s.abstract) summary.textContent = s.abstract;

    } catch (err) {
        console.error('Erro ao carregar detalhes:', err);
    }
});