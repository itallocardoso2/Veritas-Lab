document.addEventListener('DOMContentLoaded', () => {
    
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const welcomeMessage = document.getElementById('welcome-message');
    const messageContainer = document.getElementById('message-container');

    
    function showForm(formToShow) {
        if (formToShow === 'login') {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            loginTab.classList.add('border-b-primary', 'text-text-light');
            loginTab.classList.remove('border-b-transparent', 'text-text-light/70');
            registerTab.classList.add('border-b-transparent', 'text-text-light/70');
            registerTab.classList.remove('border-b-primary', 'text-text-light');
            welcomeMessage.textContent = 'Bem-vindo de volta! Faça o login para continuar.';
        } else {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            registerTab.classList.add('border-b-primary', 'text-text-light');
            registerTab.classList.remove('border-b-transparent', 'text-text-light/70');
            loginTab.classList.add('border-b-transparent', 'text-text-light/70');
            loginTab.classList.remove('border-b-primary', 'text-text-light');
            welcomeMessage.textContent = 'Crie sua conta para começar a explorar.';
        }
    }

    loginTab.addEventListener('click', () => showForm('login'));
    registerTab.addEventListener('click', () => showForm('register'));

    
    function showMessage(message, isError = true) {
        messageContainer.innerHTML = `<p class="${isError ? 'text-error' : 'text-success'}">${message}</p>`;
    }

    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage(''); 

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.error || (data.errors ? data.errors[0].msg : 'Erro ao fazer login.');
                throw new Error(errorMsg);
            }

            
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/perfil.html'; 

        } catch (error) {
            showMessage(error.message);
        }
    });

    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage('');

        const full_name = document.getElementById('register-fullname').value;
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name, username, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.error || (data.errors ? data.errors[0].msg : 'Erro ao criar conta.');
                throw new Error(errorMsg);
            }

            
            showMessage('Conta criada com sucesso! Redirecionando para login...', false);
            setTimeout(() => {
                showForm('login'); 
                document.getElementById('login-email').value = email; 
            }, 2000);

        } catch (error) {
            showMessage(error.message);
        }
    });
});