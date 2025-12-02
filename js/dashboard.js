// js/dashboard.js
document.addEventListener('DOMContentLoaded', async function() {
    // 1. Cek Login (Proteksi Halaman)
    const token = localStorage.getItem('authToken');
    const userDataRaw = localStorage.getItem('userData');
    
    if (!token) {
        alert("Anda harus login terlebih dahulu!");
        window.location.href = '/';
        return;
    }

    // Tampilkan Nama User
    if (userDataRaw) {
        const userData = JSON.parse(userDataRaw);
        document.getElementById('userNameDisplay').innerText = userData.username || "User";
    }

    // 2. Logout Logic
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/';
    });

    // 3. Fetch Dashboard Stats
    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/Dashboard/stats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            const data = result.data;

            // Mapping data API ke UI
            // UI: Total Lab -> API: totalRuangan (asumsi)
            document.getElementById('statTotalLab').innerText = data.totalRuangan || 0;
            
            // UI: Lab Aktif -> API: aktifSekarang
            document.getElementById('statLabAktif').innerText = data.aktifSekarang || 0;
            
            // UI: Total Kelas -> API: totalKelas
            document.getElementById('statTotalKelas').innerText = data.totalKelas || 0;
            
            // UI: Total Akses -> API: totalAkses
            document.getElementById('statTotalAkses').innerText = data.totalAkses || 0;
        } else {
            console.error("Gagal memuat data dashboard:", result.message);
        }

    } catch (error) {
        console.error("Error fetching stats:", error);
    }
});