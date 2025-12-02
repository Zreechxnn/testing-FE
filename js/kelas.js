// js/kelas.js

let allDataKelas = [];
let allDataKartu = [];

document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
    loadDataCombined(); // Load Kelas dan Kartu bersamaan

    document.getElementById('searchInput').addEventListener('keyup', (e) => filterTable(e.target.value));
    document.getElementById('filterKelasDropdown').addEventListener('change', (e) => filterTable(e.target.value));
    document.getElementById('kelasForm').addEventListener('submit', handleFormSubmit);

    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = 'login.html';
    });
});

function checkLogin() {
    const token = localStorage.getItem('authToken');
    if (!token) window.location.href = 'login.html';
    const userData = JSON.parse(localStorage.getItem('userData'));
    if(userData) document.getElementById('userNameDisplay').innerText = userData.username;
}

// 1. Fetch Data Kelas & Kartu Sekaligus
async function loadDataCombined() {
    const token = localStorage.getItem('authToken');
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center">Loading data...</td></tr>';

    try {
        // Jalankan request secara paralel
        const [resKelas, resKartu] = await Promise.all([
            fetch(`${CONFIG.BASE_URL}/api/Kelas`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${CONFIG.BASE_URL}/api/Kartu`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const dataKelas = await resKelas.json();
        const dataKartu = await resKartu.json();

        if (dataKelas.success) {
            allDataKelas = dataKelas.data;
            allDataKartu = dataKartu.success ? dataKartu.data : [];
            
            renderTable(allDataKelas);
            populateDropdown(allDataKelas);
        } else {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center">${dataKelas.message}</td></tr>`;
        }

    } catch (error) {
        console.error("Error loading combined data:", error);
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red">Gagal koneksi ke server</td></tr>';
    }
}

// Render Tabel dengan UID Lookup
function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center">Tidak ada data</td></tr>';
        return;
    }

    data.forEach((item, index) => {
        // Cari kartu yang terhubung dengan kelas ini
        const linkedCard = allDataKartu.find(k => k.kelasId === item.id);
        
        let rfidDisplay = `<span style="color:#ccc; font-style:italic;">Belum terhubung</span>`;
        if (linkedCard) {
            rfidDisplay = `<span style="font-family:monospace; background:#e3f2fd; color:#1565c0; padding:2px 6px; border-radius:4px;">${linkedCard.uid}</span>`;
            if (linkedCard.status !== 'AKTIF') {
                rfidDisplay += ` <span style="font-size:10px; color:red">(${linkedCard.status})</span>`;
            }
        }

        const row = `
            <tr>
                <td>${index + 1}</td>
                <td style="font-weight:bold">${item.nama}</td>
                <td>${rfidDisplay}</td>
                <td>
                    <button class="btn-action" onclick="openEditModal(${item.id}, '${item.nama}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteKelas(${item.id})">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// Handle Submit (Create/Update)
async function handleFormSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    const id = document.getElementById('kelasId').value;
    const nama = document.getElementById('namaKelas').value;

    const isEdit = id ? true : false;
    const url = isEdit ? `${CONFIG.BASE_URL}/api/Kelas/${id}` : `${CONFIG.BASE_URL}/api/Kelas`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nama: nama })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert(isEdit ? "Data berhasil diperbarui!" : "Data berhasil ditambahkan!");
            closeModal();
            loadDataCombined(); // Refresh data agar sinkron
        } else {
            alert("Gagal menyimpan: " + (result.message || "Unknown Error"));
        }
    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan koneksi.");
    }
}

// Delete Data
window.deleteKelas = async function(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus kelas ini?")) return;

    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/Kelas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        if (response.ok && result.success) {
            alert("Data berhasil dihapus.");
            loadDataCombined();
        } else {
            alert("Gagal menghapus: " + result.message);
        }
    } catch (error) {
        console.error(error);
        alert("Gagal menghapus data.");
    }
}

// Helper Functions
function filterTable(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    const filtered = allDataKelas.filter(item => 
        item.nama.toLowerCase().includes(lowerKeyword)
    );
    renderTable(filtered);
}

function populateDropdown(data) {
    const dropdown = document.getElementById('filterKelasDropdown');
    dropdown.innerHTML = '<option value="">Semua Kelas</option>';
    data.forEach(item => {
        let option = document.createElement('option');
        option.value = item.nama;
        option.text = item.nama;
        dropdown.appendChild(option);
    });
}

window.openModal = function() {
    document.getElementById('kelasModal').style.display = 'block';
    document.getElementById('modalTitle').innerText = "Tambah Kelas";
    document.getElementById('kelasForm').reset();
    document.getElementById('kelasId').value = "";
}

window.openEditModal = function(id, nama) {
    document.getElementById('kelasModal').style.display = 'block';
    document.getElementById('modalTitle').innerText = "Edit Kelas";
    document.getElementById('kelasId').value = id;
    document.getElementById('namaKelas').value = nama;
}

window.closeModal = function() {
    document.getElementById('kelasModal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('kelasModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}