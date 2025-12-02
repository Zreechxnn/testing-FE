let allKartu = [];

document.addEventListener('DOMContentLoaded', function() {
    checkLogin();
    loadKartu();
    loadKelasOptions();
    loadUserOptions();
    setupUidValidation();

    // Event Listeners
    document.getElementById('searchInput').addEventListener('keyup', filterTable);
    document.getElementById('filterStatus').addEventListener('change', filterTable);
    document.getElementById('kartuForm').addEventListener('submit', handleFormSubmit);

    // Event Listener Radio Button
    const radioButtons = document.querySelectorAll('input[name="ownerType"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', toggleOwnerInput);
    });

    // Event listener untuk input UID - HANYA RESET ERROR (Tanpa filter karakter/uppercase)
    document.getElementById('uid').addEventListener('input', function(e) {
        // Kita biarkan user mengetik apa saja (String biasa)
        // Hanya reset border merah jika ada
        this.style.borderColor = '';
        const valDiv = document.getElementById('uidValidation');
        if(valDiv) valDiv.innerHTML = '';
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/';
    });
});

// --- UTILS ---
function checkLogin() {
    const token = localStorage.getItem('authToken');
    if (!token) window.location.href = '/';
    const userData = JSON.parse(localStorage.getItem('userData'));
    if(userData && document.getElementById('userNameDisplay')) {
        document.getElementById('userNameDisplay').innerText = userData.username;
    }
}

// --- UID VALIDATION ---
// Fungsi helper sederhana untuk membersihkan spasi (tanpa uppercase)
function cleanUid(uid) {
    return uid ? uid.trim() : "";
}

function setupUidValidation() {
    const uidInput = document.getElementById('uid');
    const validationDiv = document.getElementById('uidValidation');
    
    if(!uidInput) return;

    uidInput.addEventListener('blur', function() {
        const uid = cleanUid(this.value);
        
        if (!uid) {
            validationDiv.innerHTML = '<span style="color:orange;">⚠ Masukkan UID/ID kartu</span>';
            this.style.borderColor = 'orange';
        } else {
            // Selalu dianggap valid karena string biasa
            validationDiv.innerHTML = ''; 
            this.style.borderColor = '#ccc';
        }
    });
}

// --- LOAD DATA ---
async function loadKartu() {
    const token = localStorage.getItem('authToken');
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center">Loading data...</td></tr>';

    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/Kartu`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();

        if (result.success) {
            allKartu = result.data;
            renderTable(allKartu);
        } else {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center">${result.message}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading kartu:', error);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red">Gagal mengambil data</td></tr>';
    }
}

// --- RENDER TABLE ---
function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center">Tidak ada data kartu</td></tr>';
        return;
    }

    data.forEach((item, index) => {
        let pemilik = '<span style="color:#888; font-style:italic;">- Tidak Terhubung -</span>';
        if (item.userUsername) {
            pemilik = `
                <div style="font-weight:600;">${item.userUsername}</div>
                <div style="font-size:11px; color:#1976d2; background:#e3f2fd; padding:2px 6px; border-radius:3px; display:inline-block;">USER</div>
            `;
        } else if (item.kelasNama) {
            pemilik = `
                <div style="font-weight:600;">${item.kelasNama}</div>
                <div style="font-size:11px; color:#e65100; background:#ffe0b2; padding:2px 6px; border-radius:3px; display:inline-block;">KELAS</div>
            `;
        }

        // Status badges
        let badgeClass = 'status-blocked';
        
        if (item.status === 'AKTIF') {
            badgeClass = 'status-aktif';
        } else if (item.status === 'NONAKTIF') {
            badgeClass = 'status-nonaktif';
        }

        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${pemilik}</td>
                <td class="uid-text">${item.uid}</td>
                <td>${item.keterangan || '-'}</td>
                <td><span class="status-badge ${badgeClass}">${item.status}</span></td>
                <td>
                    <button class="btn-action" onclick="editKartu(${item.id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteKartu(${item.id})" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// --- LOAD DROPDOWN OPTIONS ---
async function loadKelasOptions() {
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/Kelas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
            const select = document.getElementById('kelasId');
            select.innerHTML = '<option value="0">-- Pilih Kelas --</option>';
            result.data.forEach(k => {
                let opt = document.createElement('option');
                opt.value = k.id;
                opt.text = k.nama;
                select.appendChild(opt);
            });
        }
    } catch (e) { 
        console.error("Gagal load kelas", e); 
    }
}

async function loadUserOptions() {
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/User`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
            const select = document.getElementById('userId');
            select.innerHTML = '<option value="0">-- Pilih User --</option>';
            result.data.forEach(user => {
                let opt = document.createElement('option');
                opt.value = user.id;
                opt.text = `${user.username} (${user.role})`;
                select.appendChild(opt);
            });
        }
    } catch (e) { 
        console.error("Gagal load user", e); 
    }
}

// --- FORM HANDLING ---
async function handleFormSubmit(e) {
    e.preventDefault();
    const token = localStorage.getItem('authToken');

    const id = document.getElementById('kartuId').value;
    let uid = document.getElementById('uid').value;
    const status = document.getElementById('status').value;
    const keterangan = document.getElementById('keterangan').value;

    // Bersihkan spasi, tapi biarkan string apa adanya
    uid = cleanUid(uid);
    
    // Validasi sederhana: hanya cek apakah kosong
    if (!uid) {
        alert("UID/ID kartu harus diisi!");
        return;
    }

    const ownerType = document.querySelector('input[name="ownerType"]:checked').value;
    
    const payload = {
        uid: uid, 
        status: status,
        keterangan: keterangan,
        userId: null,
        kelasId: null
    };

    // Set relasi berdasarkan tipe pemilik
    if (ownerType === 'kelas') {
        const kelasId = parseInt(document.getElementById('kelasId').value);
        if (!kelasId || kelasId === 0) {
            alert("Silakan pilih Kelas!");
            return;
        }
        payload.kelasId = kelasId;
    } else {
        const userId = parseInt(document.getElementById('userId').value);
        if (!userId || userId === 0) {
            alert("Silakan pilih User!");
            return;
        }
        payload.userId = userId;
    }

    console.log("Payload yang dikirim:", payload);

    const isEdit = id ? true : false;
    const url = isEdit ? `${CONFIG.BASE_URL}/api/Kartu/${id}` : `${CONFIG.BASE_URL}/api/Kartu`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert(result.message || "Data berhasil disimpan!");
            closeModal();
            loadKartu();
        } else {
            let errorMsg = result.message || "Gagal menyimpan data";
            if (result.errors) {
                const errorDetails = Object.values(result.errors).flat().join(', ');
                errorMsg += `: ${errorDetails}`;
            }
            alert(errorMsg);
        }
    } catch (error) {
        console.error('Error:', error);
        alert("Terjadi kesalahan koneksi: " + error.message);
    }
}

// --- CRUD OPERATIONS ---
window.cekUidPrompt = async function() {
    // Prompt string biasa
    let uid = prompt("Masukan UID/ID String Kartu untuk dicek:", "");
    if (!uid) return;

    uid = cleanUid(uid);
    // Tidak ada validasi format regex disini

    const token = localStorage.getItem('authToken');
    try {
        // Encode URI supaya karakter spesial aman dikirim lewat URL
        const encodedUid = encodeURIComponent(uid);
        const response = await fetch(`${CONFIG.BASE_URL}/api/Kartu/check/${encodedUid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const result = await response.json();

        if (result.success) {
            const d = result.data;
            let statusInfo = d.terdaftar ? 
                `✅ TERDAFTAR (${d.status || 'Tidak ada status'})` : 
                "❌ BELUM TERDAFTAR";
            
            let pemilikInfo = "Tidak ada pemilik";
            if (d.userUsername) {
                pemilikInfo = `👤 User: ${d.userUsername}`;
            } else if (d.kelasNama) {
                pemilikInfo = `🏫 Kelas: ${d.kelasNama}`;
            }

            const message = `
UID/ID: ${uid}
Status: ${statusInfo}
Pemilik: ${pemilikInfo}
Keterangan: ${d.keterangan || '-'}
Pesan: ${d.message || 'Tidak ada pesan'}
            `.trim();

            alert(message);
        } else {
            alert("Cek Gagal: " + (result.message || "Terjadi kesalahan"));
        }
    } catch (e) { 
        console.error("Error checking UID:", e);
        alert("Error koneksi saat cek UID: " + e.message); 
    }
}

window.deleteKartu = async function(id) {
    if(!confirm("Yakin ingin menghapus kartu ini?\nKartu yang memiliki riwayat akses mungkin tidak dapat dihapus.")) return;
    
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/Kartu/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if(response.ok && result.success) {
            alert(result.message || "Kartu berhasil dihapus");
            loadKartu();
        } else {
            alert("Gagal menghapus: " + (result.message || "Terjadi kesalahan"));
        }
    } catch(e) { 
        console.error("Delete error:", e);
        alert("Error menghapus data"); 
    }
}

// --- UI HELPERS & MODAL ---
function filterTable() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;

    const filtered = allKartu.filter(item => {
        const matchSearch = (item.uid && item.uid.toLowerCase().includes(search)) ||
                            (item.userUsername && item.userUsername.toLowerCase().includes(search)) ||
                            (item.kelasNama && item.kelasNama.toLowerCase().includes(search));

        const matchStatus = statusFilter === "" || item.status === statusFilter;
        return matchSearch && matchStatus;
    });
    renderTable(filtered);
}

window.toggleOwnerInput = function() {
    const type = document.querySelector('input[name="ownerType"]:checked').value;
    const groupKelas = document.getElementById('groupKelas');
    const groupUser = document.getElementById('groupUser');

    if(type === 'kelas') {
        groupKelas.classList.remove('hidden');
        groupUser.classList.add('hidden');
    } else {
        groupKelas.classList.add('hidden');
        groupUser.classList.remove('hidden');
    }
}

window.openModal = function() {
    document.getElementById('kartuModal').style.display = 'block';
    document.getElementById('modalTitle').innerText = "Tambah Kartu";
    document.getElementById('kartuForm').reset();
    document.getElementById('kartuId').value = "";

    // Reset validation
    const uidInput = document.getElementById('uid');
    if(uidInput) uidInput.style.borderColor = '';
    const valDiv = document.getElementById('uidValidation');
    if(valDiv) valDiv.innerHTML = '';

    // Default select Kelas
    const radioKelas = document.querySelector('input[name="ownerType"][value="kelas"]');
    if(radioKelas) {
        radioKelas.checked = true;
        toggleOwnerInput();
    }
}

window.editKartu = function(id) {
    const item = allKartu.find(x => x.id == id);
    if (!item) return;

    document.getElementById('kartuModal').style.display = 'block';
    document.getElementById('modalTitle').innerText = "Edit Kartu";

    // Fill Form - Tampilkan UID apa adanya
    document.getElementById('kartuId').value = item.id;
    document.getElementById('uid').value = item.uid;
    document.getElementById('status').value = item.status;
    document.getElementById('keterangan').value = item.keterangan || "";

    // Reset validation
    document.getElementById('uid').style.borderColor = '';
    const valDiv = document.getElementById('uidValidation');
    if(valDiv) valDiv.innerHTML = '';

    // Set Owner Type logic
    if (item.userId && item.userId > 0) {
        document.querySelector('input[name="ownerType"][value="user"]').checked = true;
        document.getElementById('userId').value = item.userId;
    } else {
        document.querySelector('input[name="ownerType"][value="kelas"]').checked = true;
        document.getElementById('kelasId').value = item.kelasId || 0;
    }
    toggleOwnerInput();
}

window.closeModal = function() {
    document.getElementById('kartuModal').style.display = 'none';
}

window.onclick = function(event) {
    if (event.target == document.getElementById('kartuModal')) {
        closeModal();
    }
}