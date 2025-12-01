// js/Ruangan.js

let allDataLab = [];

document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
    loadLab();

    // Event Listener Search
    document.getElementById('searchInput').addEventListener('keyup', function(e) {
        filterTable(e.target.value);
    });

    // Event Listener Dropdown
    document.getElementById('filterLabDropdown').addEventListener('change', function(e) {
        filterTable(e.target.value);
    });

    // Handle Submit
    document.getElementById('labForm').addEventListener('submit', handleFormSubmit);

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

// 1. GET: Load Data Lab
async function loadLab() {
    const token = localStorage.getItem('authToken');
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center">Loading...</td></tr>';

    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/Ruangan`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success) {
            allDataLab = result.data;
            renderTable(allDataLab);
            populateDropdown(allDataLab);
        } else {
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align:center">${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error(error);
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red">Gagal mengambil data</td></tr>';
    }
}

function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center">Tidak ada data</td></tr>';
        return;
    }

    data.forEach((item, index) => {
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td style="font-weight:bold">${item.nama}</td>
                <td>
                    <button class="btn-action" onclick="openEditModal(${item.id}, '${item.nama}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteLab(${item.id})">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// 2. POST & PUT
async function handleFormSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');
    const id = document.getElementById('labId').value;
    const nama = document.getElementById('namaLab').value;

    const isEdit = id ? true : false;
    const url = isEdit ? `${CONFIG.BASE_URL}/api/Ruangan/${id}` : `${CONFIG.BASE_URL}/api/Ruangan`;
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
            alert(isEdit ? "Lab berhasil diperbarui!" : "Lab berhasil ditambahkan!");
            closeModal();
            loadLab();
        } else {
            alert("Gagal menyimpan: " + (result.message || "Unknown Error"));
        }
    } catch (error) {
        console.error(error);
        alert("Terjadi kesalahan koneksi.");
    }
}

// 3. DELETE
window.deleteLab = async function(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus lab ini?")) return;

    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/Ruangan/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        if (response.ok && result.success) {
            alert("Data berhasil dihapus.");
            loadLab();
        } else {
            alert("Gagal menghapus: " + result.message);
        }
    } catch (error) {
        console.error(error);
        alert("Gagal menghapus data.");
    }
}

// --- Helpers ---

function filterTable(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    const filtered = allDataLab.filter(item => 
        item.nama.toLowerCase().includes(lowerKeyword)
    );
    renderTable(filtered);
}

function populateDropdown(data) {
    const dropdown = document.getElementById('filterLabDropdown');
    dropdown.innerHTML = '<option value="">Semua Lab</option>';
    data.forEach(item => {
        let option = document.createElement('option');
        option.value = item.nama; 
        option.text = item.nama;
        dropdown.appendChild(option);
    });
}

// Modal Logic
window.openModal = function() {
    document.getElementById('labModal').style.display = 'block';
    document.getElementById('modalTitle').innerText = "Tambah Lab";
    document.getElementById('labForm').reset();
    document.getElementById('labId').value = "";
}

window.openEditModal = function(id, nama) {
    document.getElementById('labModal').style.display = 'block';
    document.getElementById('modalTitle').innerText = "Edit Lab";
    document.getElementById('labId').value = id;
    document.getElementById('namaLab').value = nama;
}

window.closeModal = function() {
    document.getElementById('labModal').style.display = 'none';
}

window.onclick = function(event) {
    const modal = document.getElementById('labModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}