// js/login.js
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const usernameInput = document.getElementById('username').value;
    const passwordInput = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMessage');

    errorMsg.innerText = "Loading...";

    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/Auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: usernameInput,
                password: passwordInput
            })
        });

        const result = await response.json();

        if (result.success) {
            // Simpan token ke localStorage
            localStorage.setItem('authToken', result.data.token);
            localStorage.setItem('userData', JSON.stringify(result.data));
            
            // Redirect ke dashboard
            window.location.href = 'dashboard.html';
        } else {
            // Tampilkan pesan error dari API atau default
            errorMsg.innerText = result.message || "Login gagal. Periksa username/password.";
        }

    } catch (error) {
        console.error('Error:', error);
        errorMsg.innerText = "Terjadi kesalahan koneksi ke server.";
    }
});