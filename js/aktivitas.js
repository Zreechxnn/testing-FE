// js/aktivitas.js

let allActivities = []; // Menyimpan data asli untuk filtering client-side

document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
    loadFilters();
    loadData();

    // Event Listeners untuk Filter
    document.getElementById('filterLab').addEventListener('change', applyFilter);
    document.getElementById('filterKelas').addEventListener('change', applyFilter);
    document.getElementById('filterStatus').addEventListener('change', applyFilter);
    document.getElementById('filterStartDate').addEventListener('change', applyFilter);
    document.getElementById('filterEndDate').addEventListener('change', applyFilter);
    document.getElementById('btnReset').addEventListener('click', resetFilter);
});

// 1. Cek Login & Display User
function checkLogin() {
    const token = localStorage.getItem('authToken');
    if (!token) window.location.href = 'login.html';
    
    const userData = JSON.parse(localStorage.getItem('userData'));
    if(userData) document.getElementById('userNameDisplay').innerText = userData.username;
}

async function loadFilters() {
    const token = localStorage.getItem('authToken');
    
    try {
        const resLab = await fetch(`${CONFIG.BASE_URL}/api/Ruangan`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const resultLab = await resLab.json();

        if (resultLab.success && Array.isArray(resultLab.data)) {
            const labSelect = document.getElementById('filterLab');
            
            labSelect.innerHTML = '<option value="">Semua Lab</option>';

            resultLab.data.forEach(lab => {
                let option = document.createElement('option');
                option.value = lab.id;      // Menggunakan ID untuk value
                option.innerText = lab.nama; // Menggunakan "nama" sesuai request
                labSelect.appendChild(option);
            });
        }

        // --- Fetch Data Kelas ---
        const resKelas = await fetch(`${CONFIG.BASE_URL}/api/Kelas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const resultKelas = await resKelas.json();

        if (resultKelas.success && Array.isArray(resultKelas.data)) {
            const kelasSelect = document.getElementById('filterKelas');
            
            kelasSelect.innerHTML = '<option value="">Semua Kelas</option>';

            resultKelas.data.forEach(kelas => {
                let option = document.createElement('option');
                option.value = kelas.id;      
                option.innerText = kelas.nama;
                kelasSelect.appendChild(option);
            });
        }

    } catch (error) {
        console.error("Error loading filters:", error);
    }
}

// 3. Load Main Data (Aktivitas)
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

// 4. Render Table
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
        
        // Format Tanggal & Waktu
        const dateStr = masuk.toLocaleDateString('id-ID');
        const timeMasuk = masuk.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
        const timeKeluar = keluar ? keluar.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '-';

        // Hitung Durasi
        let durasiStr = '-';
        let durasiMenit = 0;
        if (keluar) {
            const diffMs = keluar - masuk;
            durasiMenit = Math.floor(diffMs / 60000);
            durasiStr = `${durasiMenit}m`;
        }

        // Tentukan Badge Status
        // Asumsi API return status: "CHECKIN" atau "CHECKOUT"
        // Jika status mentah dari API berbeda, sesuaikan di sini
        let badgeClass = 'badge-in';
        let statusLabel = 'CHECK IN';
        
        if (item.timestampKeluar && item.timestampMasuk !== item.timestampKeluar) {
             badgeClass = 'badge-out';
             statusLabel = 'CHECK OUT';
        } else {
             // Logic custom jika API statusnya string explicit
             if(item.status.toLowerCase().includes('out')) {
                 badgeClass = 'badge-out';
                 statusLabel = 'CHECK OUT';
             }
        }

        const row = `
            <tr>
                <td>${index + 1}</td>
                <td><span class="uid-badge">${item.kartuUid || 'N/A'}</span></td>
                <td>${item.ruanganNama || '-'}</td>
                <td>${item.kelasNama || '-'}</td>
                <td>${dateStr}, ${timeMasuk}</td>
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

// 5. Kalkulasi Statistik (Client Side dari data yang di-fetch)
function calculateStats(data) {
    // Total Aktivitas
    document.getElementById('statTotalAktivitas').innerText = data.length;

    // Sedang Aktif (yang belum checkout / timestampKeluar kosong atau sama dengan masuk)
    // Logika: Jika timestampKeluar == timestampMasuk (seringkali default value jika blm keluar) atau null
    const activeCount = data.filter(item => !item.timestampKeluar || item.timestampKeluar === item.timestampMasuk).length;
    document.getElementById('statSedangAktif').innerText = activeCount;

    // Rata-rata Durasi (hanya yang sudah selesai)
    let totalDurasi = 0;
    let countSelesai = 0;
    data.forEach(item => {
        if (item.timestampKeluar && item.timestampKeluar !== item.timestampMasuk) {
            const m = new Date(item.timestampMasuk);
            const k = new Date(item.timestampKeluar);
            totalDurasi += (k - m); // miliseconds
            countSelesai++;
        }
    });
    
    const avgMenit = countSelesai > 0 ? (totalDurasi / countSelesai / 60000).toFixed(1) : 0;
    document.getElementById('statRataDurasi').innerText = `${avgMenit} menit`;

    // Lab Terpopuler
    const labCounts = {};
    data.forEach(item => {
        const labName = item.ruanganNama || 'Unknown';
        labCounts[labName] = (labCounts[labName] || 0) + 1;
    });
    
    let popularLab = '-';
    let maxCount = 0;
    for (const [lab, count] of Object.entries(labCounts)) {
        if (count > maxCount) {
            maxCount = count;
            popularLab = lab;
        }
    }
    document.getElementById('statLabPopuler').innerText = popularLab;
}

// 6. Delete Aktivitas
window.deleteAktivitas = async function(id) {
    if(!confirm("Yakin ingin menghapus data ini?")) return;

    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/Aktivitas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Cek status code, karena kadang delete return 204 No Content tanpa JSON
        if (response.ok) {
            alert("Data berhasil dihapus");
            loadData(); // Reload table
        } else {
            alert("Gagal menghapus data");
        }
    } catch (error) {
        console.error("Error deleting:", error);
    }
};

// 7. Filtering Logic
function applyFilter() {
    const labVal = document.getElementById('filterLab').value;
    const kelasVal = document.getElementById('filterKelas').value;
    const statusVal = document.getElementById('filterStatus').value;
    const startVal = document.getElementById('filterStartDate').value;
    const endVal = document.getElementById('filterEndDate').value;

    let filtered = allActivities.filter(item => {
        // Filter Lab (ID)
        if (labVal && item.ruanganId != labVal) return false;
        
        // Filter Kelas (ID - asumsikan di item ada kelasId atau filter by NamaKelas jika API return nama)
        // Di sini kita cek string matching sederhana jika API tidak return ID kelas di object aktivitas
        // Jika API return kelasId, ganti logika ini.
        if (kelasVal) {
             // Karena dropdown value = ID, tapi data aktivitas mungkin cuma string nama kelas. 
             // Untuk demo ini, kita anggap filter jalan jika nama kelas mengandung string tertentu atau logika harus disesuaikan dgn respon API real.
             // Opsi aman: ambil text dropdown
             const kelasText = document.getElementById('filterKelas').options[document.getElementById('filterKelas').selectedIndex].text;
             if (kelasText !== "Semua Kelas" && item.kelasNama !== kelasText) return false;
        }

        // Filter Status
        if (statusVal) {
            const isOut = (item.timestampKeluar && item.timestampMasuk !== item.timestampKeluar);
            if (statusVal === 'CHECKIN' && isOut) return false;
            if (statusVal === 'CHECKOUT' && !isOut) return false;
        }

        // Filter Tanggal
        const itemDate = new Date(item.timestampMasuk).setHours(0,0,0,0);
        if (startVal) {
            const sDate = new Date(startVal).setHours(0,0,0,0);
            if (itemDate < sDate) return false;
        }
        if (endVal) {
            const eDate = new Date(endVal).setHours(0,0,0,0);
            if (itemDate > eDate) return false;
        }

        return true;
    });

    renderTable(filtered);
    // Optional: update stats berdasarkan filtered data atau tetap global
    // calculateStats(filtered); 
}

function resetFilter() {
    document.getElementById('filterLab').value = "";
    document.getElementById('filterKelas').value = "";
    document.getElementById('filterStatus').value = "";
    document.getElementById('filterStartDate').value = "";
    document.getElementById('filterEndDate').value = "";
    renderTable(allActivities);
}