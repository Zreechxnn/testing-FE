// js/aktivitas.js

let allActivities = []; 

document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
    loadFilters();
    loadData();

    // Event Listeners
    document.getElementById('filterLab').addEventListener('change', applyFilter);
    document.getElementById('filterKelas').addEventListener('change', applyFilter);
    document.getElementById('filterUser').addEventListener('change', applyFilter);
    document.getElementById('filterStatus').addEventListener('change', applyFilter);
    document.getElementById('filterStartDate').addEventListener('change', applyFilter);
    document.getElementById('filterEndDate').addEventListener('change', applyFilter);
    document.getElementById('btnReset').addEventListener('click', resetFilter);
    
    const btnExport = document.getElementById('btnExport');
    if(btnExport) btnExport.addEventListener('click', exportToExcel);
});

function checkLogin() {
    const token = localStorage.getItem('authToken');
    if (!token) window.location.href = '/';
    const userData = JSON.parse(localStorage.getItem('userData'));
    if(userData && document.getElementById('userNameDisplay')) {
        document.getElementById('userNameDisplay').innerText = userData.username;
    }
}

// 1. LOAD DATA FILTER
async function loadFilters() {
    const token = localStorage.getItem('authToken');
    try {
        // --- A. Fetch Lab (Ruangan) ---
        // Lab tetap pakai ID karena di data aktivitas ada 'ruanganId'
        const resLab = await fetch(`${CONFIG.BASE_URL}/api/Ruangan`, { headers: { 'Authorization': `Bearer ${token}` } });
        const resultLab = await resLab.json();
        if (resultLab.success) {
            const labSelect = document.getElementById('filterLab');
            labSelect.innerHTML = '<option value="">Semua Lab</option>';
            resultLab.data.forEach(d => {
                let opt = document.createElement('option');
                opt.value = d.id; // Tetap ID
                opt.innerText = d.nama;
                labSelect.appendChild(opt);
            });
        }

        // --- B. Fetch Kelas ---
        // REVISI: Gunakan NAMA sebagai value, bukan ID
        const resKelas = await fetch(`${CONFIG.BASE_URL}/api/Kelas`, { headers: { 'Authorization': `Bearer ${token}` } });
        const resultKelas = await resKelas.json();
        if (resultKelas.success) {
            const kelasSelect = document.getElementById('filterKelas');
            kelasSelect.innerHTML = '<option value="">Semua Kelas</option>';
            resultKelas.data.forEach(d => {
                let opt = document.createElement('option');
                opt.value = d.nama; // <--- PENTING: Value adalah String Nama
                opt.innerText = d.nama;
                kelasSelect.appendChild(opt);
            });
        }

        // --- C. Fetch User ---
        // REVISI: Gunakan USERNAME sebagai value, bukan ID
        const resUser = await fetch(`${CONFIG.BASE_URL}/api/User`, { headers: { 'Authorization': `Bearer ${token}` } });
        const resultUser = await resUser.json();
        if (resultUser.success) {
            const userSelect = document.getElementById('filterUser');
            userSelect.innerHTML = '<option value="">Semua User</option>';
            resultUser.data.forEach(d => {
                let opt = document.createElement('option');
                opt.value = d.username; // <--- PENTING: Value adalah String Username
                opt.innerText = `${d.username} (${d.role})`;
                userSelect.appendChild(opt);
            });
        }

    } catch (error) {
        console.error("Error loading filters:", error);
    }
}

// 2. LOAD DATA UTAMA
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
            // Sorting descending (terbaru diatas)
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

// 3. RENDER TABLE
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

        // Tampilan Pemilik
        let ownerDisplay = '-';
        if (item.userUsername) {
            ownerDisplay = `
                <div style="display:flex; align-items:center; gap:5px;">
                    <i class="fas fa-user-circle" style="color:#1976d2;"></i>
                    <span style="font-weight:bold; color:#0d47a1;">${item.userUsername}</span>
                </div>
            `;
        } else if (item.kelasNama) {
            ownerDisplay = `
                <div style="display:flex; align-items:center; gap:5px;">
                    <i class="fas fa-users" style="color:#e65100;"></i>
                    <span>${item.kelasNama}</span>
                </div>
            `;
        } else {
             ownerDisplay = '<span style="color:#999; font-style:italic;">Tidak diketahui</span>';
        }

        const row = `
            <tr>
                <td>${index + 1}</td>
                <td><span class="uid-badge">${item.kartuUid || 'N/A'}</span></td>
                <td>${item.ruanganNama || '-'}</td>
                <td>${ownerDisplay}</td> 
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

// 4. LOGIC FILTER REVISI (STRICT STRING MATCHING)
function applyFilter() {
    const labVal = document.getElementById('filterLab').value;
    const kelasVal = document.getElementById('filterKelas').value; // Ini String Nama
    const userVal = document.getElementById('filterUser').value;   // Ini String Username
    const statusVal = document.getElementById('filterStatus').value;
    const startVal = document.getElementById('filterStartDate').value;
    const endVal = document.getElementById('filterEndDate').value;

    let filtered = allActivities.filter(item => {
        // A. Filter Lab (ID Comparison - Aman karena ruanganId angka)
        if (labVal && item.ruanganId != labVal) return false;
        
        // B. Filter Kelas (String Matching)
        if (kelasVal) {
            // Jika data tidak punya kelasNama, atau namanya beda -> Hapus
            // Gunakan trim() untuk membersihkan spasi tak terlihat
            if (!item.kelasNama || item.kelasNama.trim() !== kelasVal.trim()) return false;
        }
        
        // C. Filter User (String Matching)
        if (userVal) {
            // Jika data tidak punya userUsername, atau username beda -> Hapus
            if (!item.userUsername || item.userUsername.trim() !== userVal.trim()) return false;
        }

        // D. Filter Status
        if (statusVal) {
            const isOut = (item.timestampKeluar && item.timestampMasuk !== item.timestampKeluar);
            if (statusVal === 'CHECKIN' && isOut) return false;
            if (statusVal === 'CHECKOUT' && !isOut) return false;
        }

        // E. Filter Tanggal
        const itemDate = new Date(item.timestampMasuk).setHours(0,0,0,0);
        if (startVal) {
            const startDate = new Date(startVal).setHours(0,0,0,0);
            if (itemDate < startDate) return false;
        }
        if (endVal) {
            const endDate = new Date(endVal).setHours(0,0,0,0);
            if (itemDate > endDate) return false;
        }

        return true;
    });

    renderTable(filtered);
    calculateStats(filtered);
}

// 5. STATISTIK
function calculateStats(data) {
    if(document.getElementById('statTotalAktivitas')) {
        document.getElementById('statTotalAktivitas').innerText = data.length;
    }
    
    // Sedang Aktif
    const activeCount = data.filter(item => !item.timestampKeluar || item.timestampMasuk === item.timestampKeluar).length;
    if(document.getElementById('statSedangAktif')) {
        document.getElementById('statSedangAktif').innerText = activeCount;
    }

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
    if(document.getElementById('statRataDurasi')) {
        document.getElementById('statRataDurasi').innerText = `${avgMenit} menit`;
    }

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
    if(document.getElementById('statLabPopuler')) {
        document.getElementById('statLabPopuler').innerText = popularLab;
    }
}

// 6. DELETE & RESET
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

function resetFilter() {
    document.getElementById('filterLab').value = "";
    document.getElementById('filterKelas').value = "";
    document.getElementById('filterUser').value = "";
    document.getElementById('filterStatus').value = "";
    document.getElementById('filterStartDate').value = "";
    document.getElementById('filterEndDate').value = "";
    renderTable(allActivities);
    calculateStats(allActivities);
}

// 7. EXPORT EXCEL
function exportToExcel() {
    if (allActivities.length === 0) {
        alert("Tidak ada data untuk diexport");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "No,UID Kartu,Lab,Pemilik,Tanggal,Jam Masuk,Jam Keluar,Status\n";

    allActivities.forEach((item, index) => {
        const masuk = new Date(item.timestampMasuk);
        const keluar = item.timestampKeluar ? new Date(item.timestampKeluar) : null;
        
        const dateStr = masuk.toLocaleDateString('id-ID');
        const timeMasuk = masuk.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
        const timeKeluar = keluar ? keluar.toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) : '-';
        
        let status = (item.timestampKeluar && item.timestampMasuk !== item.timestampKeluar) ? "CHECK OUT" : "CHECK IN";

        let pemilik = "-";
        if (item.userUsername) pemilik = `User: ${item.userUsername}`;
        else if (item.kelasNama) pemilik = `Kelas: ${item.kelasNama}`;

        const safeLab = `"${item.ruanganNama || ''}"`;
        const safePemilik = `"${pemilik}"`;

        const row = [
            index + 1,
            `'${item.kartuUid || ''}`,
            safeLab,
            safePemilik,
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
    link.setAttribute("download", `laporan_aktivitas_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
