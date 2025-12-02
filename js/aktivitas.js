// js/aktivitas.js

let allActivities = []; 

document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
    loadFilters(); // Memuat Lab, Kelas, DAN User
    loadData();

    // Event Listeners
    document.getElementById('filterLab').addEventListener('change', applyFilter);
    document.getElementById('filterKelas').addEventListener('change', applyFilter);
    document.getElementById('filterUser').addEventListener('change', applyFilter); // Listener Baru
    document.getElementById('filterStatus').addEventListener('change', applyFilter);
    document.getElementById('filterStartDate').addEventListener('change', applyFilter);
    document.getElementById('filterEndDate').addEventListener('change', applyFilter);
    document.getElementById('btnReset').addEventListener('click', resetFilter);
    
    const btnExport = document.getElementById('btnExport');
    if(btnExport) btnExport.addEventListener('click', exportToExcel);
});

function checkLogin() {
    const token = localStorage.getItem('authToken');
    if (!token) window.location.href = 'login.html';
    const userData = JSON.parse(localStorage.getItem('userData'));
    if(userData) document.getElementById('userNameDisplay').innerText = userData.username;
}

// 1. Load Filter (Lab, Kelas, User)
async function loadFilters() {
    const token = localStorage.getItem('authToken');
    try {
        // --- Fetch Lab ---
        const resLab = await fetch(`${CONFIG.BASE_URL}/api/Ruangan`, { headers: { 'Authorization': `Bearer ${token}` } });
        const resultLab = await resLab.json();
        if (resultLab.success) {
            const labSelect = document.getElementById('filterLab');
            labSelect.innerHTML = '<option value="">Semua Lab</option>';
            resultLab.data.forEach(d => {
                let opt = document.createElement('option');
                opt.value = d.id; opt.innerText = d.nama;
                labSelect.appendChild(opt);
            });
        }

        // --- Fetch Kelas ---
        const resKelas = await fetch(`${CONFIG.BASE_URL}/api/Kelas`, { headers: { 'Authorization': `Bearer ${token}` } });
        const resultKelas = await resKelas.json();
        if (resultKelas.success) {
            const kelasSelect = document.getElementById('filterKelas');
            kelasSelect.innerHTML = '<option value="">Semua Kelas</option>';
            resultKelas.data.forEach(d => {
                let opt = document.createElement('option');
                opt.value = d.id; opt.innerText = d.nama;
                kelasSelect.appendChild(opt);
            });
        }

        // --- Fetch User (BARU) ---
        const resUser = await fetch(`${CONFIG.BASE_URL}/api/User`, { headers: { 'Authorization': `Bearer ${token}` } });
        const resultUser = await resUser.json();
        if (resultUser.success) {
            const userSelect = document.getElementById('filterUser');
            userSelect.innerHTML = '<option value="">Semua User</option>';
            resultUser.data.forEach(d => {
                let opt = document.createElement('option');
                opt.value = d.id; 
                opt.innerText = `${d.username} (${d.role})`;
                userSelect.appendChild(opt);
            });
        }

    } catch (error) {
        console.error("Error loading filters:", error);
    }
}

// 2. Load Data Utama
async function loadData() {
    const token = localStorage.getItem('authToken');
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center">Loading data...</td></tr>';

    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/Aktivitas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success) {
            allActivities = result.data;
            allActivities.sort((a, b) => new Date(b.timestampMasuk) - new Date(a.timestampMasuk));
            renderTable(allActivities);
            calculateStats(allActivities);
        } else {
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center">${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error("Error fetching aktivitas:", error);
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:red">Gagal mengambil data</td></tr>';
    }
}

// 3. Render Table (Logika Tampilan User vs Kelas)
function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align:center">Tidak ada data</td></tr>';
        return;
    }

    data.forEach((item, index) => {
        const masuk = new Date(item.timestampMasuk);
        const keluar = item.timestampKeluar ? new Date(item.timestampKeluar) : null;
        
        const dateStr = masuk.toLocaleDateString('id-ID');
        const timeMasuk = masuk.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
        const timeKeluar = keluar ? keluar.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '-';

        // Hitung Durasi
        let durasiStr = '-';
        if (keluar && item.timestampMasuk !== item.timestampKeluar) {
            const diffMs = keluar - masuk;
            const durasiMenit = Math.floor(diffMs / 60000);
            durasiStr = `${durasiMenit}m`;
        }

        // Status Badge
        let badgeClass = 'badge-in';
        let statusLabel = 'CHECK IN';
        if (item.timestampKeluar && item.timestampMasuk !== item.timestampKeluar) {
             badgeClass = 'badge-out';
             statusLabel = 'CHECK OUT';
        }

        // LOGIKA BARU: Menentukan Tampilan Pemilik (User atau Kelas)
        let ownerDisplay = '-';
        
        if (item.userUsername) {
            // Jika milik User
            ownerDisplay = `
                <div style="display:flex; align-items:center; gap:5px;">
                    <i class="fas fa-user-circle" style="color:#1976d2;"></i>
                    <span style="font-weight:bold; color:#0d47a1;">${item.userUsername}</span>
                </div>
            `;
        } else if (item.kelasNama) {
            // Jika milik Kelas
            ownerDisplay = `
                <div style="display:flex; align-items:center; gap:5px;">
                    <i class="fas fa-users" style="color:#e65100;"></i>
                    <span>${item.kelasNama}</span>
                </div>
            `;
        } else {
             // Fallback
             ownerDisplay = '<span style="color:#999; font-style:italic;">Tidak diketahui</span>';
        }

        const row = `
            <tr>
                <td>${index + 1}</td>
                <td><span class="uid-badge">${item.kartuUid || 'N/A'}</span></td>
                <td>${item.ruanganNama || '-'}</td>
                <td>${ownerDisplay}</td> <td>${dateStr}, ${timeMasuk}</td>
                <td>${keluar ? `${dateStr}, ${timeKeluar}` : '-'}</td>
                <td>${durasiStr}</td>
                <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
                <td>
                    <button class="btn-delete" onclick="deleteAktivitas(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

function calculateStats(data) {
    document.getElementById('statTotalAktivitas').innerText = data.length;
    
    // Sedang Aktif
    const activeCount = data.filter(item => !item.timestampKeluar || item.timestampMasuk === item.timestampKeluar).length;
    document.getElementById('statSedangAktif').innerText = activeCount;

    // Rata Durasi
    let totalDurasi = 0;
    let countSelesai = 0;
    data.forEach(item => {
        if (item.timestampKeluar && item.timestampMasuk !== item.timestampKeluar) {
            totalDurasi += (new Date(item.timestampKeluar) - new Date(item.timestampMasuk));
            countSelesai++;
        }
    });
    const avgMenit = countSelesai > 0 ? (totalDurasi / countSelesai / 60000).toFixed(1) : 0;
    document.getElementById('statRataDurasi').innerText = `${avgMenit} menit`;

    // Lab Populer
    const labCounts = {};
    data.forEach(item => {
        const labName = item.ruanganNama || 'Unknown';
        labCounts[labName] = (labCounts[labName] || 0) + 1;
    });
    let popularLab = '-';
    let maxCount = 0;
    for (const [lab, count] of Object.entries(labCounts)) {
        if (count > maxCount) { maxCount = count; popularLab = lab; }
    }
    document.getElementById('statLabPopuler').innerText = popularLab;
}

window.deleteAktivitas = async function(id) {
    if(!confirm("Hapus data aktivitas ini?")) return;
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/Aktivitas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) loadData();
        else alert("Gagal menghapus data");
    } catch (error) {
        console.error("Error deleting:", error);
    }
};

// 4. Update Filter Logic (Cakup User)
function applyFilter() {
    const labVal = document.getElementById('filterLab').value;
    const kelasVal = document.getElementById('filterKelas').value;
    const userVal = document.getElementById('filterUser').value; // Ambil nilai filter user
    const statusVal = document.getElementById('filterStatus').value;
    const startVal = document.getElementById('filterStartDate').value;
    const endVal = document.getElementById('filterEndDate').value;

    let filtered = allActivities.filter(item => {
        // Filter Lab
        if (labVal && item.ruanganId != labVal) return false;
        
        // Filter Kelas
        if (kelasVal && item.kelasId != kelasVal) return false;
        
        // Filter User (BARU)
        // Cek userId (jika API menyediakan userId di object aktivitas)
        // Atau fallback ke userUsername matching jika userId tidak tersedia langsung
        if (userVal) {
             // Asumsi: item.userId tersedia. Jika tidak, sesuaikan dengan item.userUsername
             if (item.userId && item.userId != userVal) return false;
             // Jika item.userId tidak ada, kita skip logic ini atau perlu cari cara matching lain
        }

        // Filter Status
        if (statusVal) {
            const isOut = (item.timestampKeluar && item.timestampMasuk !== item.timestampKeluar);
            if (statusVal === 'CHECKIN' && isOut) return false;
            if (statusVal === 'CHECKOUT' && !isOut) return false;
        }

        // Filter Tanggal
        const itemDate = new Date(item.timestampMasuk).setHours(0,0,0,0);
        if (startVal && itemDate < new Date(startVal).setHours(0,0,0,0)) return false;
        if (endVal && itemDate > new Date(endVal).setHours(0,0,0,0)) return false;

        return true;
    });

    renderTable(filtered);
}

// 5. Update Export Excel (Cakup User)
function exportToExcel() {
    if (allActivities.length === 0) {
        alert("Tidak ada data untuk diexport");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    // Header
    csvContent += "No,UID Kartu,Lab,Pemilik (User/Kelas),Tanggal,Jam Masuk,Jam Keluar,Status\n";

    allActivities.forEach((item, index) => {
        const masuk = new Date(item.timestampMasuk);
        const keluar = item.timestampKeluar ? new Date(item.timestampKeluar) : null;
        
        const dateStr = masuk.toLocaleDateString('id-ID');
        const timeMasuk = masuk.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
        const timeKeluar = keluar ? keluar.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '-';
        
        let status = (item.timestampKeluar && item.timestampMasuk !== item.timestampKeluar) ? "CHECK OUT" : "CHECK IN";

        // Tentukan Pemilik untuk CSV
        let pemilik = "-";
        if (item.userUsername) pemilik = `User: ${item.userUsername}`;
        else if (item.kelasNama) pemilik = `Kelas: ${item.kelasNama}`;

        const row = [
            index + 1,
            `'${item.kartuUid}`, 
            `"${item.ruanganNama || ''}"`, // Pakai kutip dua untuk safety koma
            `"${pemilik}"`,
            dateStr,
            timeMasuk,
            timeKeluar,
            status
        ].join(",");
        csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "laporan_aktivitas_lengkap.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function resetFilter() {
    document.getElementById('filterLab').value = "";
    document.getElementById('filterKelas').value = "";
    document.getElementById('filterUser').value = "";
    document.getElementById('filterStatus').value = "";
    document.getElementById('filterStartDate').value = "";
    document.getElementById('filterEndDate').value = "";
    renderTable(allActivities);
}