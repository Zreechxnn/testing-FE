// js/aktivitas.js

let allActivities = []; 

document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
    loadFilters();
    loadData();

    // Event Listeners
    document.getElementById('filterLab').addEventListener('change', applyFilter);
    document.getElementById('filterKelas').addEventListener('change', applyFilter);
    document.getElementById('filterStatus').addEventListener('change', applyFilter);
    document.getElementById('filterStartDate').addEventListener('change', applyFilter);
    document.getElementById('filterEndDate').addEventListener('change', applyFilter);
    document.getElementById('btnReset').addEventListener('click', resetFilter);
    
    // Event Listener Export
    const btnExport = document.getElementById('btnExport');
    if(btnExport) btnExport.addEventListener('click', exportToExcel);
});

function checkLogin() {
    const token = localStorage.getItem('authToken');
    if (!token) window.location.href = 'login.html';
    const userData = JSON.parse(localStorage.getItem('userData'));
    if(userData) document.getElementById('userNameDisplay').innerText = userData.username;
}

async function loadFilters() {
    const token = localStorage.getItem('authToken');
    try {
        // Fetch Lab
        const resLab = await fetch(`${CONFIG.BASE_URL}/api/Ruangan`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const resultLab = await resLab.json();
        if (resultLab.success) {
            const labSelect = document.getElementById('filterLab');
            labSelect.innerHTML = '<option value="">Semua Lab</option>';
            resultLab.data.forEach(lab => {
                let option = document.createElement('option');
                option.value = lab.id; 
                option.innerText = lab.nama;
                labSelect.appendChild(option);
            });
        }

        // Fetch Kelas
        const resKelas = await fetch(`${CONFIG.BASE_URL}/api/Kelas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const resultKelas = await resKelas.json();
        if (resultKelas.success) {
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
            // Urutkan dari yang terbaru (descending)
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

        let durasiStr = '-';
        if (keluar && item.timestampMasuk !== item.timestampKeluar) {
            const diffMs = keluar - masuk;
            const durasiMenit = Math.floor(diffMs / 60000);
            durasiStr = `${durasiMenit}m`;
        }

        let badgeClass = 'badge-in';
        let statusLabel = 'CHECK IN';

        // Logika status: Jika ada waktu keluar DAN waktu keluar != waktu masuk
        if (item.timestampKeluar && item.timestampMasuk !== item.timestampKeluar) {
             badgeClass = 'badge-out';
             statusLabel = 'CHECK OUT';
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

function calculateStats(data) {
    document.getElementById('statTotalAktivitas').innerText = data.length;

    // Sedang Aktif: Belum check out
    const activeCount = data.filter(item => !item.timestampKeluar || item.timestampMasuk === item.timestampKeluar).length;
    document.getElementById('statSedangAktif').innerText = activeCount;

    // Rata-rata Durasi
    let totalDurasi = 0;
    let countSelesai = 0;
    data.forEach(item => {
        if (item.timestampKeluar && item.timestampMasuk !== item.timestampKeluar) {
            const m = new Date(item.timestampMasuk);
            const k = new Date(item.timestampKeluar);
            totalDurasi += (k - m);
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
        if (count > maxCount) {
            maxCount = count;
            popularLab = lab;
        }
    }
    document.getElementById('statLabPopuler').innerText = popularLab;
}

window.deleteAktivitas = async function(id) {
    if(!confirm("Yakin ingin menghapus data ini?")) return;
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/Aktivitas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            loadData();
        } else {
            alert("Gagal menghapus data");
        }
    } catch (error) {
        console.error("Error deleting:", error);
    }
};

// Fungsi Export ke CSV
function exportToExcel() {
    if (allActivities.length === 0) {
        alert("Tidak ada data untuk diexport");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    // Header CSV
    csvContent += "No,UID Kartu,Lab,Kelas,Tanggal,Jam Masuk,Jam Keluar,Status\n";

    allActivities.forEach((item, index) => {
        const masuk = new Date(item.timestampMasuk);
        const keluar = item.timestampKeluar ? new Date(item.timestampKeluar) : null;
        
        const dateStr = masuk.toLocaleDateString('id-ID');
        const timeMasuk = masuk.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
        const timeKeluar = keluar ? keluar.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '-';
        
        let status = "CHECK IN";
        if (item.timestampKeluar && item.timestampMasuk !== item.timestampKeluar) {
            status = "CHECK OUT";
        }

        const row = [
            index + 1,
            `'${item.kartuUid}`, // Tambah petik agar excel baca sbg string
            item.ruanganNama,
            item.kelasNama,
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
    link.setAttribute("download", "laporan_aktivitas_lab.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function applyFilter() {
    const labVal = document.getElementById('filterLab').value;
    const kelasVal = document.getElementById('filterKelas').value;
    const statusVal = document.getElementById('filterStatus').value;
    const startVal = document.getElementById('filterStartDate').value;
    const endVal = document.getElementById('filterEndDate').value;

    let filtered = allActivities.filter(item => {
        // Filter Lab (ID)
        if (labVal && item.ruanganId != labVal) return false;
        // Filter Kelas (ID) - asumsi API return kelasId, jika tidak, pakai Nama
        if (kelasVal && item.kelasId != kelasVal) {
             // Fallback jika API tidak return kelasId tapi return kelasNama
             // Kita bisa cek apakah element select text-nya cocok
             const sel = document.getElementById('filterKelas');
             const text = sel.options[sel.selectedIndex].text;
             if(item.kelasNama !== text) return false;
        }

        if (statusVal) {
            const isOut = (item.timestampKeluar && item.timestampMasuk !== item.timestampKeluar);
            if (statusVal === 'CHECKIN' && isOut) return false;
            if (statusVal === 'CHECKOUT' && !isOut) return false;
        }

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
}

function resetFilter() {
    document.getElementById('filterLab').value = "";
    document.getElementById('filterKelas').value = "";
    document.getElementById('filterStatus').value = "";
    document.getElementById('filterStartDate').value = "";
    document.getElementById('filterEndDate').value = "";
    renderTable(allActivities);
}