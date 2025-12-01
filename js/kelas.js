// js/kelas.js

let allDataKelas = [];

document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
    loadKelas();

    // Event Listener untuk Search
    document.getElementById('searchInput').addEventListener('keyup', function(e) {
        filterTable(e.target.value);
    });

    // Event Listener untuk Dropdown Filter
    document.getElementById('filterKelasDropdown').addEventListener('change', function(e) {
        filterTable(e.target.value);
    });

    // Handle Form Submit (Tambah / Edit)
    document.getElementById('kelasForm').addEventListener('submit', handleFormSubmit);
    
    // Logout
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

// --- CRUD FUNCTIONS ---

// 1. GET: Load Data Kelas
async function loadKelas() {
    const token = localStorage.getItem('authToken');
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center">Loading...</td></tr>';

    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/Kelas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success) {
            allDataKelas = result.data; // Simpan ke variabel global
            renderTable(allDataKelas);
            populateDropdown(allDataKelas);
        } else {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center">${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error(error);
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red">Gagal mengambil data</td></tr>';
    }
}

// Render Tabel
function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center">Tidak ada data</td></tr>';
        return;
    }

    data.forEach((item, index) => {
        // Catatan: API hanya return id dan nama. RFID UID tidak ada di API Kelas, jadi di-set default.
        const rfidUid = "-"; 

        const row = `
            <tr>
                <td>${index + 1}</td>
                <td style="font-weight:bold">${item.nama}</td>
                <td style="font-family: monospace;">${rfidUid}</td>
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

// 2. POST & PUT: Handle Submit
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
            loadKelas(); // Refresh tabel
        } else {
            alert("Gagal menyimpan: " + (result.message || "Unknown Error"));
        }
    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan koneksi.");
    }
}

// 3. DELETE: Hapus Data
window.deleteKelas = async function(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus kelas ini?")) return;

    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/Kelas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Cek result
        const result = await response.json();
        if (response.ok && result.success) {
            alert("Data berhasil dihapus.");
            loadKelas();
        } else {
            alert("Gagal menghapus: " + result.message);
        }
    } catch (error) {
        console.error(error);
        alert("Gagal menghapus data.");
    }
}

// --- HELPER FUNCTIONS ---

// Filter Table (Client Side)
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
        option.value = item.nama; // Filter by nama text
        option.text = item.nama;
        dropdown.appendChild(option);
    });
}

// Modal Logic
window.openModal = function() {
    document.getElementById('kelasModal').style.display = 'block';
    document.getElementById('modalTitle').innerText = "Tambah Kelas";
    document.getElementById('kelasForm').reset();
    document.getElementById('kelasId').value = ""; // Clear ID for Add mode
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

// Close modal click outside
window.onclick = function(event) {
    const modal = document.getElementById('kelasModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}