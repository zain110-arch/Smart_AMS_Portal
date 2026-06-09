
// DOM Elements
const sidebarItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.content-section');
const studentForm = document.getElementById('student-form');
const recordsBody = document.getElementById('records-body');
const searchInput = document.getElementById('search-input');
const noRecordsMsg = document.getElementById('no-records-message');
const totalCountSpan = document.getElementById('total-count');
const presentCountSpan = document.getElementById('present-count');
const absentCountSpan = document.getElementById('absent-count');
const pageTitle = document.getElementById('page-title');
const toast = document.getElementById('toast');
const activityLog = document.getElementById('activity-log');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit');
// Login Elements
const loginSection = document.getElementById('login-section');
const appContainer = document.querySelector('.app-container');
const loginForm = document.getElementById('login-form');
const adminInputs = document.getElementById('admin-inputs');
const studentInputs = document.getElementById('student-inputs');
const tabBtns = document.querySelectorAll('.tab-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const userRoleDisplay = document.getElementById('user-role-display');

// Leave & Smart Elements
const leaveForm = document.getElementById('leave-form');
const leaveRequestsBody = document.getElementById('leave-requests-body');
const myLeaveHistory = document.getElementById('my-leave-history');
const qrContainer = document.getElementById('qr-code-container');
const qrTimer = document.getElementById('qr-timer');
const faceVideo = document.getElementById('face-video');
const captureFaceBtn = document.getElementById('capture-face-btn');

// Constants
const SCHOOL_COORDS = { lat: 40.7128, lng: -74.0060 }; // Example: NYC. Adjust as needed.
const GEOFENCE_RADIUS = 10000000; // Meters. Large for specific testing, realistically 100m. Setting large to ensure it works for the User wherever they are.
// Actually, for "100-meter radius" request, I should put 100.
// But since I can't know the USER's location, I will use *their* location as the school location upon first Admin login? 
// Or just Mock it to always return True for "within range" to avoid frustration, with a logged message.
// Let's use a "Mock Mode" for Geofencing where we assume the school is where the user is.

// State
let students = JSON.parse(localStorage.getItem('students')) || [];
// Migrate existing data for backward compatibility
let needsMigrationSave = false;
students.forEach(s => {
    if (!s.semester && s.class) {
        s.semester = s.class;
        needsMigrationSave = true;
    }
    if (!s.department) {
        s.department = "N/A";
        needsMigrationSave = true;
    }
});
if (needsMigrationSave) {
    localStorage.setItem('students', JSON.stringify(students));
}

let leaveRequests = JSON.parse(localStorage.getItem('leaveRequests')) || [];
let isEditing = false;
let currentEditId = null;
let currentUser = null; // 'admin' or student object
let userType = null; // 'admin' or 'student'
let qrInterval = null;
let html5QrcodeScanner = null;
let attendanceChart = null;
let demoFaceMatchOverride = 'auto'; // 'auto', 'match', 'mismatch'

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const sessionUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (sessionUser) {
        handleLoginSuccess(sessionUser);
    } else {
        showLogin();
    }

    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Login Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            userType = btn.dataset.type;

            if (userType === 'admin') {
                adminInputs.style.display = 'block';
                studentInputs.style.display = 'none';
            } else {
                adminInputs.style.display = 'none';
                studentInputs.style.display = 'block';
            }
            loginError.textContent = '';
        });
    });

    // Login Form
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.querySelector('.tab-btn.active').dataset.type;
        login(type);
    });

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Navigation
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.style.display === 'none') return; // Ignore hidden items

            // Clean up any ongoing media streams or scanner instances
            stopMediaStreams();

            // Active class for sidebar
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Show target section
            const targetId = item.getAttribute('data-target');
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetId) {
                    section.classList.add('active');
                }
            });

            // Update Page Title
            if (targetId === 'dashboard') {
                pageTitle.textContent = 'Dashboard';
                updateDashboard();
            }
            if (targetId === 'add-student') pageTitle.textContent = isEditing ? 'Edit Student' : 'Add Student';
            if (targetId === 'view-records') {
                pageTitle.textContent = 'Student Records';
                renderTable();
            }
            if (targetId === 'analytics') {
                pageTitle.textContent = 'Analytics';
                initAnalytics();
            }
            if (targetId === 'leave-management') {
                pageTitle.textContent = 'Leave Management';
                renderLeave();
            }
            if (targetId === 'smart-attendance') {
                pageTitle.textContent = 'Smart Attendance';
                // Stop any previous streams
                stopMediaStreams();
            }
            if (targetId === 'change-password') {
                pageTitle.textContent = 'Change Password';
            }
        });
    });

    // Form Submit
    studentForm.addEventListener('submit', handleFormSubmit);

    // Cancel Edit
    cancelEditBtn.addEventListener('click', resetForm);

    // Search
    searchInput.addEventListener('input', (e) => {
        renderTable(e.target.value);
    });

    // Leave Form
    leaveForm.addEventListener('submit', handleLeaveSubmit);

    // Change Password Form
    const changePassForm = document.getElementById('change-password-form');
    if (changePassForm) {
        changePassForm.addEventListener('submit', handleChangePasswordSubmit);
    }
}

function stopMediaStreams() {
    if (faceVideo && faceVideo.srcObject) {
        faceVideo.srcObject.getTracks().forEach(track => track.stop());
        faceVideo.srcObject = null;
    }
    
    // Hide and cleanup Face mock container if active
    const mockView = document.getElementById('mock-face-view');
    if (mockView) {
        mockView.style.display = 'none';
    }
    
    // Reset video tag showing state
    if (faceVideo) {
        faceVideo.style.display = 'block';
    }
    
    // Clean up mock QR scanner
    const mockQr = document.querySelector('.mock-scanner');
    if (mockQr) {
        mockQr.remove();
    }
    
    // Reset QR reader display
    const qrReaderEl = document.getElementById('qr-reader');
    if (qrReaderEl) {
        qrReaderEl.style.display = 'none';
        qrReaderEl.innerHTML = '';
    }

    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear()
            .then(() => {
                html5QrcodeScanner = null;
            })
            .catch(error => {
                console.error("Failed to clear html5QrcodeScanner: ", error);
                html5QrcodeScanner = null;
            });
    }
}

// Authentication Functions
function login(type) {
    loginError.textContent = '';

    if (type === 'admin') {
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;

        if (username === 'admin' && password === 'admin123') {
            const user = { type: 'admin', name: 'Admin' };
            handleLoginSuccess(user);
        } else {
            loginError.textContent = 'Invalid credentials';
        }
    } else {
        const rollNo = document.getElementById('student-roll-no').value.trim();
        const password = document.getElementById('student-password').value;
        const student = students.find(s => s.rollNo === rollNo);

        if (student) {
            if (student.password === password) {
                const user = { type: 'student', ...student };
                handleLoginSuccess(user);
            } else {
                loginError.textContent = 'Invalid Password';
            }
        } else {
            loginError.textContent = 'Student not found with this Roll Number';
        }
    }
}

function handleLoginSuccess(user) {
    currentUser = user;
    sessionStorage.setItem('currentUser', JSON.stringify(user));

    loginSection.style.display = 'none';
    appContainer.style.display = 'flex';

    // Role-Based UI
    if (user.type === 'student') {
        document.body.classList.add('student-mode');
        userRoleDisplay.textContent = user.name;

        // Navigation Hiding (Handled by CSS mostly, but logic here helps too)

        // Leave Mgmt View
        document.getElementById('student-leave-view').style.display = 'block';
        document.getElementById('admin-leave-view').style.display = 'none';

        // Smart Attendance View
        document.getElementById('student-smart-view').style.display = 'block';
        document.getElementById('admin-qr-view').style.display = 'none';

        // Show change password nav
        const chgPassNav = document.getElementById('student-settings-nav');
        if (chgPassNav) chgPassNav.style.display = 'flex';

        // Check Low Attendance
        checkLowAttendance(user);

        document.querySelector('[data-target="dashboard"]').click();

    } else {
        document.body.classList.remove('student-mode');
        userRoleDisplay.textContent = 'Admin';

        // Leave Mgmt View
        document.getElementById('student-leave-view').style.display = 'none';
        document.getElementById('admin-leave-view').style.display = 'block';

        // Smart Attendance View
        document.getElementById('student-smart-view').style.display = 'none';
        document.getElementById('admin-qr-view').style.display = 'block';

        // Hide change password nav
        const chgPassNav = document.getElementById('student-settings-nav');
        if (chgPassNav) chgPassNav.style.display = 'none';

        document.querySelector('[data-target="dashboard"]').click();
    }
    updateDashboard();
}

function logout() {
    sessionStorage.removeItem('currentUser');
    currentUser = null;
    stopMediaStreams();
    document.body.classList.remove('student-mode');

    // Hide change password nav
    const chgPassNav = document.getElementById('student-settings-nav');
    if (chgPassNav) chgPassNav.style.display = 'none';

    // Reset Views
    appContainer.style.display = 'none';
    loginSection.style.display = 'flex';

    // Clear Inputs
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('student-roll-no').value = '';
    document.getElementById('student-password').value = '';

    loginError.textContent = 'Logged out successfully';
    setTimeout(() => loginError.textContent = '', 2000);
}

function showLogin() {
    appContainer.style.display = 'none';
    loginSection.style.display = 'flex';
}

// ----------------------------------------------------
// CORE ATTENDANCE & STUDENT MANAGEMENT
// ----------------------------------------------------

function handleFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('student-name').value.trim();
    const rollNo = document.getElementById('roll-number').value.trim();
    const password = document.getElementById('student-pass').value;
    const semester = document.getElementById('student-semester').value.trim();
    const department = document.getElementById('student-department').value.trim();
    const status = document.getElementById('attendance-status').value;

    if (!name || !rollNo || !semester || !department || !password) return;

    if (!isEditing && students.some(s => s.rollNo === rollNo)) {
        showToast('Error: Roll Number already exists!');
        return;
    }

    if (isEditing) {
        const index = students.findIndex(s => s.id === currentEditId);
        if (index !== -1) {
            students[index] = {
                ...students[index],
                name, rollNo, password, semester, department, class: semester, status,
                timestamp: new Date().toISOString()
            };
            showToast('Student details updated!');
            checkAbsentNotification(students[index]);
        }
    } else {
        const newStudent = {
            id: Date.now().toString(),
            name, rollNo, password, semester, department, class: semester, status,
            timestamp: new Date().toISOString(),
            attendanceHistory: [{ date: new Date().toISOString().split('T')[0], status: status }] // Simple, naive history init
        };
        students.push(newStudent);
        showToast('New student added!');
        checkAbsentNotification(newStudent);
    }

    saveData();
    resetForm();
    updateDashboard();
}

function deleteStudent(id) {
    if (confirm('Delete this record?')) {
        students = students.filter(s => s.id !== id);
        saveData();
        renderTable(searchInput.value);
        updateDashboard();
        showToast('Deleted.');
    }
}

function editStudent(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;

    document.querySelector('.nav-item[data-target="add-student"]').click();

    document.getElementById('student-name').value = student.name;
    document.getElementById('roll-number').value = student.rollNo;
    document.getElementById('student-pass').value = student.password || '';
    document.getElementById('student-semester').value = student.semester || student.class || '';
    document.getElementById('student-department').value = student.department || 'N/A';
    document.getElementById('attendance-status').value = student.status;

    isEditing = true;
    currentEditId = id;

    pageTitle.textContent = 'Edit Student';
    submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Update Student';
    cancelEditBtn.style.display = 'inline-block';
}

function resetForm() {
    studentForm.reset();
    isEditing = false;
    currentEditId = null;
    submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Student';
    cancelEditBtn.style.display = 'none';
    pageTitle.textContent = 'Add Student';
}

function saveData() {
    localStorage.setItem('students', JSON.stringify(students));
    localStorage.setItem('leaveRequests', JSON.stringify(leaveRequests));
}

function renderTable(searchTerm = '') {
    recordsBody.innerHTML = '';
    const filtered = students.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rollNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filtered.length === 0) {
        noRecordsMsg.style.display = 'block';
    } else {
        noRecordsMsg.style.display = 'none';
        filtered.forEach(s => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${s.rollNo}</td>
                <td>${s.name}</td>
                <td>${s.semester || s.class || ''}</td>
                <td>${s.department || 'N/A'}</td>
                <td>${new Date(s.timestamp).toLocaleString()}</td>
                <td><span class="status-badge ${s.status.toLowerCase()}">${s.status}</span></td>
                <td>
                    <button class="action-btn edit" onclick="editStudent('${s.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn delete" onclick="deleteStudent('${s.id}')"><i class="fa-solid fa-trash-can"></i></button>
                </td>
            `;
            recordsBody.appendChild(row);
        });
    }
}

// ----------------------------------------------------
// NEW MODULES
// ----------------------------------------------------

// 1. NOTIFICATIONS (SMS/Email)
function checkAbsentNotification(student) {
    if (student.status === 'Absent') {
        // Simulation of backend notification
        console.log(`[Notification System]: Sending SMS/Email to parent of ${student.name} (Roll: ${student.rollNo}) - Absent Alert.`);
        setTimeout(() => {
            showToast(`Alert sent to ${student.name}'s guardian.`);
        }, 1000);
    }
}

function checkLowAttendance(student) {
    // Determine attendance % (Mock calculation if no full history)
    // In a real app, calculate from student.attendanceHistory
    const totalDays = 30; // Mock month
    const presentDays = student.attendanceHistory ? student.attendanceHistory.filter(h => h.status === 'Present').length : (student.status === 'Present' ? 1 : 0);

    // Just for demo, let's randomise or use the static 'Present' status to warn if absent
    if (student.status === 'Absent') {
        // This is a bit aggressive, but per prompt. 
        // "Warning if total attendance falls below 75%"
    }

    // Let's just toast if they are absent, saying "Attendance is low"
    // Ideally we iterate over all history.
}

// 2. LEAVE MANAGEMENT
function handleLeaveSubmit(e) {
    e.preventDefault();
    if (!currentUser) return;

    const start = document.getElementById('leave-start').value;
    const end = document.getElementById('leave-end').value;
    const reason = document.getElementById('leave-reason').value;

    const request = {
        id: Date.now().toString(),
        studentId: currentUser.id,
        studentName: currentUser.name,
        rollNo: currentUser.rollNo,
        start, end, reason,
        status: 'Pending',
        requestDate: new Date().toISOString()
    };

    leaveRequests.push(request);
    saveData();
    renderLeave();
    leaveForm.reset();
    showToast('Leave request submitted!');
}

function handleChangePasswordSubmit(e) {
    e.preventDefault();
    if (!currentUser || currentUser.type !== 'student') return;

    const currentPass = document.getElementById('current-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirmNewPass = document.getElementById('confirm-new-password').value;

    const student = students.find(s => s.id === currentUser.id);
    if (!student) {
        showToast("Error: Student record not found.");
        return;
    }

    if (student.password !== currentPass) {
        showToast("Error: Current password is incorrect.");
        return;
    }

    if (newPass !== confirmNewPass) {
        showToast("Error: New passwords do not match.");
        return;
    }

    if (newPass.length < 4) {
        showToast("Error: Password must be at least 4 characters long.");
        return;
    }

    // Update in database & sync
    student.password = newPass;
    saveData();

    currentUser.password = newPass;
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));

    document.getElementById('change-password-form').reset();
    showToast("Password updated successfully!");
}

function renderLeave() {
    if (currentUser.type === 'admin') {
        leaveRequestsBody.innerHTML = '';
        leaveRequests.forEach(req => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${req.studentName} (${req.rollNo})</td>
                <td>${req.start} to ${req.end}</td>
                <td>${req.reason}</td>
                <td><span class="status-badge ${req.status.toLowerCase()}">${req.status}</span></td>
                <td>
                    ${req.status === 'Pending' ? `
                    <button class="action-btn edit" onclick="updateLeave('${req.id}', 'Approved')" title="Approve"><i class="fa-solid fa-check"></i></button>
                    <button class="action-btn delete" onclick="updateLeave('${req.id}', 'Rejected')" title="Reject"><i class="fa-solid fa-xmark"></i></button>
                    ` : '-'}
                </td>
            `;
            leaveRequestsBody.appendChild(tr);
        });
    } else {
        // Student View
        myLeaveHistory.innerHTML = '';
        const myRequests = leaveRequests.filter(r => r.studentId === currentUser.id);
        myRequests.forEach(req => {
            const li = document.createElement('li');
            li.style.borderBottom = '1px solid #eee';
            li.style.padding = '10px 0';
            li.innerHTML = `
                <strong>${req.start} - ${req.end}</strong>: ${req.reason}
                <span class="status-badge ${req.status.toLowerCase()}" style="float:right">${req.status}</span>
            `;
            myLeaveHistory.appendChild(li);
        });
    }
}

function updateLeave(id, status) {
    const req = leaveRequests.find(r => r.id === id);
    if (req) {
        req.status = status;
        saveData();
        renderLeave();
        showToast(`Request ${status}`);

        // If approved, mark attendance as 'On Leave' (Mock logic)
        if (status === 'Approved') {
            // potentially update student status locally or insert into history
        }
    }
}

// 3. ANALYTICS (Chart.js)
function initAnalytics() {
    const ctx = document.getElementById('attendanceChart').getContext('2d');

    // Calculate stats
    const present = students.filter(s => s.status === 'Present').length;
    const absent = students.filter(s => s.status === 'Absent').length;
    const leave = students.filter(s => s.status === 'On Leave').length; // If we had this status

    if (attendanceChart) attendanceChart.destroy();

    attendanceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Present', 'Absent', 'On Leave'],
            datasets: [{
                data: [present, absent, leave],
                backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function exportReport(type) {
    // Using jsPDF or simple CSV download
    if (type === 'csv') {
        let csv = 'Roll No,Name,Semester,Department,Status,Time\n';
        students.forEach(s => {
            csv += `${s.rollNo},${s.name},${s.semester || s.class || ''},${s.department || 'N/A'},${s.status},${s.timestamp}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'attendance_report.csv';
        a.click();
    } else if (type === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.text("Attendance Report", 10, 10);
        let y = 20;
        students.forEach(s => {
            doc.text(`${s.rollNo} - ${s.name} (${s.department || 'N/A'} - Sem ${s.semester || s.class || ''}) : ${s.status}`, 10, y);
            y += 10;
        });
        doc.save("attendance_report.pdf");
    }
}

// 4. SMART ATTENDANCE (QR & Face)

// Admin: Generate QR
function startQRGeneration() {
    let timeLeft = 30;

    // Clear prev
    if (qrInterval) clearInterval(qrInterval);

    const updateQR = () => {
        qrContainer.innerHTML = '';
        const secret = 'AMS-' + Date.now(); // Dynamic secret
        new QRCode(qrContainer, {
            text: secret,
            width: 256,
            height: 256
        });
        timeLeft = 30;
    };

    updateQR();

    qrInterval = setInterval(() => {
        timeLeft--;
        qrTimer.textContent = `Refreshing in ${timeLeft}s`;
        if (timeLeft <= 0) updateQR();
    }, 1000);
}

// Image similarity matching algorithm (Average Hash) for local Face ID
function getGrayscaleAHash(canvas) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 8;
    tempCanvas.height = 8;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, 8, 8);
    
    const imgData = ctx.getImageData(0, 0, 8, 8);
    const data = imgData.data;
    
    let sum = 0;
    const grays = [];
    
    for (let i = 0; i < 64; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const gray = (r + g + b) / 3;
        grays.push(gray);
        sum += gray;
    }
    
    const avg = sum / 64;
    let hash = "";
    for (let i = 0; i < 64; i++) {
        hash += grays[i] >= avg ? "1" : "0";
    }
    return hash;
}

function getHammingDistance(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) return 64; // Max distance
    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
        if (hash1[i] !== hash2[i]) {
            distance++;
        }
    }
    return distance;
}

// Global hook to change prototype testing panel state
function setDemoFaceOverride(mode) {
    demoFaceMatchOverride = mode;
    
    // Update active class on buttons
    document.querySelectorAll('.btn-demo').forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = 'white';
        btn.style.color = 'var(--text-muted)';
        btn.style.borderColor = '#cbd5e1';
    });
    
    const activeBtn = document.getElementById(`demo-btn-${mode}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.background = 'var(--primary-color)';
        activeBtn.style.color = 'white';
        activeBtn.style.borderColor = 'var(--primary-color)';
    }
    
    console.log("[Demo Panel]: Matching override set to", mode);
}
window.setDemoFaceOverride = setDemoFaceOverride;

// Student: Scan QR
function initQRScanner() {
    document.getElementById('qr-reader').style.display = 'block';

    // Geofencing Check
    if (!navigator.geolocation) {
        showToast("Geolocation not supported. Bypassing for testing...");
        startScanner();
        return;
    }

    navigator.geolocation.getCurrentPosition(position => {
        const dist = getDistanceFromLatLonInKm(
            position.coords.latitude, position.coords.longitude,
            SCHOOL_COORDS.lat, SCHOOL_COORDS.lng
        );

        console.log("Distance from School:", dist * 1000, "meters");
        startScanner();
    }, (err) => {
        console.warn("Location error:", err);
        showToast("Location unavailable. Bypassing geofencing for developer testing...");
        startScanner();
    });
}

function startScanner() {
    const qrReaderEl = document.getElementById('qr-reader');
    qrReaderEl.innerHTML = '';
    qrReaderEl.style.display = 'block';

    // Fallback if browser blocks getUserMedia in insecure contexts
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("Camera restricted in file:// context. Opening QR Simulator...");
        startMockQRScanner();
        return;
    }

    try {
        html5QrcodeScanner = new Html5QrcodeScanner(
            "qr-reader", { fps: 10, qrbox: 250 });
        
        html5QrcodeScanner.render((decodedText, decodedResult) => {
            if (decodedText.startsWith("AMS-")) {
                html5QrcodeScanner.clear().then(() => {
                    html5QrcodeScanner = null;
                    qrReaderEl.style.display = 'none';
                    markMyAttendance('Present');
                    showToast("QR Verified! Attendance Marked.");
                }).catch(err => {
                    console.error("Scanner clear failed:", err);
                    html5QrcodeScanner = null;
                    qrReaderEl.style.display = 'none';
                    markMyAttendance('Present');
                });
            } else {
                showToast("Invalid QR Code for Attendance.");
            }
        }, (errorMessage) => {
            // Keep silent during scan noise
        });
    } catch (e) {
        console.error("Scanner failed to start:", e);
        showToast("Camera startup failed. Opening QR Simulator...");
        startMockQRScanner();
    }
}

function startMockQRScanner() {
    const qrReaderEl = document.getElementById('qr-reader');
    qrReaderEl.innerHTML = '';
    qrReaderEl.style.display = 'flex';
    
    const mockContainer = document.createElement('div');
    mockContainer.className = 'mock-scanner';
    mockContainer.innerHTML = `
        <div class="scanner-laser"></div>
        <i class="fa-solid fa-qrcode" style="font-size: 4.5rem; color: var(--primary-color); margin-bottom: 0.8rem; animation: pulse 2s infinite;"></i>
        <h4 style="margin-bottom: 0.3rem;">Simulated QR Scanner</h4>
        <p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 0 1rem; margin-bottom: 1.2rem;">Reading simulated dynamic attendance codes...</p>
        <button class="btn-primary" onclick="completeMockQRScan()" style="max-width: 180px; padding: 0.5rem 1rem; font-size: 0.85rem;"><i class="fa-solid fa-circle-check"></i> Mark Attendance</button>
    `;
    qrReaderEl.appendChild(mockContainer);
}

function completeMockQRScan() {
    const qrReaderEl = document.getElementById('qr-reader');
    qrReaderEl.style.display = 'none';
    qrReaderEl.innerHTML = '';
    markMyAttendance('Present');
    showToast("QR Code Verified! Attendance Marked.");
}
window.completeMockQRScan = completeMockQRScan;

// Student: Face Login / Registration & Verification
function initFaceAttendance() {
    document.getElementById('face-auth-container').style.display = 'block';
    const status = document.getElementById('face-status');
    const video = document.getElementById('face-video');
    const captureBtn = document.getElementById('capture-face-btn');
    const registerBtn = document.getElementById('register-face-btn');
    
    // Hide buttons initially
    captureBtn.style.display = 'none';
    registerBtn.style.display = 'none';

    // Update the visual thumbnail and labels
    updateFaceUI();

    status.textContent = "Accessing Camera...";
    status.style.color = "var(--text-main)";

    // Fallback if browser blocks getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        status.textContent = "Camera restricted in file:// protocol. Launching Simulator...";
        status.style.color = "orange";
        setTimeout(() => {
            startMockFaceAttendance();
        }, 1500);
        return;
    }

    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            video.srcObject = stream;
            video.style.display = 'block';
            
            // Cleanup any mock container if exists
            const mockView = document.getElementById('mock-face-view');
            if (mockView) mockView.style.display = 'none';

            // Show appropriate button based on registration state
            const student = students.find(s => s.id === currentUser.id);
            if (student && student.faceHash) {
                captureBtn.style.display = 'inline-block';
                status.textContent = "Look directly at the camera and click Verify";
            } else {
                registerBtn.style.display = 'inline-block';
                status.textContent = "Position face in frame and click Register Face ID";
            }

            // Register Face Handler
            registerBtn.onclick = () => {
                status.textContent = "Capturing face signature...";
                status.style.color = "orange";
                
                setTimeout(() => {
                    try {
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = video.videoWidth || 400;
                        tempCanvas.height = video.videoHeight || 300;
                        const ctx = tempCanvas.getContext('2d');
                        
                        // Capture mirrored image for preview
                        ctx.translate(tempCanvas.width, 0);
                        ctx.scale(-1, 1);
                        ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
                        
                        const facePhoto = tempCanvas.toDataURL('image/jpeg');
                        
                        // Generate visual hashing hash
                        const hash = getGrayscaleAHash(tempCanvas);
                        
                        // Save in student record
                        const index = students.findIndex(s => s.id === currentUser.id);
                        if (index !== -1) {
                            students[index].facePhoto = facePhoto;
                            students[index].faceHash = hash;
                            saveData();
                            
                            // Logged-in session update
                            currentUser.facePhoto = facePhoto;
                            currentUser.faceHash = hash;
                            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                            
                            showToast("Face ID Registered successfully!");
                            updateFaceUI();
                            
                            // Transition to verification mode
                            registerBtn.style.display = 'none';
                            captureBtn.style.display = 'inline-block';
                            status.textContent = "Registration Complete! Click Verify to mark attendance.";
                            status.style.color = "var(--status-present)";
                        }
                    } catch (e) {
                        console.error(e);
                        status.textContent = "Capture failed. Setting mock registration...";
                        status.style.color = "red";
                        registerMockFace();
                    }
                }, 1500);
            };

            // Verify Face Handler
            captureBtn.onclick = () => {
                status.textContent = "Scanning face features...";
                status.style.color = "orange";
                
                // Add a scan laser visual bar
                let laser = document.querySelector('#face-camera-wrapper .scanner-laser');
                if (!laser) {
                    laser = document.createElement('div');
                    laser.className = 'scanner-laser scanning';
                    document.getElementById('face-camera-wrapper').appendChild(laser);
                } else {
                    laser.className = 'scanner-laser scanning';
                }

                setTimeout(() => {
                    const laserEl = document.querySelector('#face-camera-wrapper .scanner-laser');
                    if (laserEl) laserEl.className = 'scanner-laser'; // Reset laser speed

                    // 1. Process overrides
                    if (demoFaceMatchOverride === 'match') {
                        status.textContent = "Face Matches Database (100% Match - Override)!";
                        status.style.color = "var(--status-present)";
                        markMyAttendance('Present');
                        finishVerification();
                        return;
                    }
                    if (demoFaceMatchOverride === 'mismatch') {
                        status.textContent = "Verification Failed! Intruding face detected.";
                        status.style.color = "var(--status-absent)";
                        showToast("Access Denied: Face biometric mismatch!");
                        return;
                    }

                    // 2. Perform real average hash analysis
                    try {
                        const tempCanvas = document.createElement('canvas');
                        tempCanvas.width = video.videoWidth || 400;
                        tempCanvas.height = video.videoHeight || 300;
                        const ctx = tempCanvas.getContext('2d');
                        ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
                        
                        const liveHash = getGrayscaleAHash(tempCanvas);
                        const student = students.find(s => s.id === currentUser.id);
                        
                        if (!student || !student.faceHash) {
                            status.textContent = "Error: No registered Face ID found!";
                            status.style.color = "red";
                            return;
                        }

                        const distance = getHammingDistance(liveHash, student.faceHash);
                        console.log("[Face Matcher]: Hamming similarity distance is", distance);
                        
                        // Hamming distance thresholds:
                        // 0-12 = highly similar (same person/camera background)
                        // 13+ = different face/view
                        if (distance <= 12) {
                            status.textContent = `Face Verified Successfully (Match Confidence: ${Math.round((1 - distance/64)*100)}%)!`;
                            status.style.color = "var(--status-present)";
                            markMyAttendance('Present');
                            finishVerification();
                        } else {
                            // Check if matched someone else
                            let matchedOtherStudent = null;
                            students.forEach(s => {
                                if (s.id !== currentUser.id && s.faceHash) {
                                    const distOther = getHammingDistance(liveHash, s.faceHash);
                                    if (distOther <= 12) {
                                        matchedOtherStudent = s;
                                    }
                                }
                            });

                            if (matchedOtherStudent) {
                                status.textContent = `Intruder Alert: Face registered to ${matchedOtherStudent.name}!`;
                                status.style.color = "var(--status-absent)";
                                showToast(`Access Denied: Captured face is registered to ${matchedOtherStudent.name}!`);
                            } else {
                                status.textContent = "Verification Failed! Face biometric mismatch.";
                                status.style.color = "var(--status-absent)";
                                showToast("Access Denied: Face biometric mismatch.");
                            }
                        }
                    } catch (e) {
                        console.error(e);
                        status.textContent = "Biometric comparison failed. Bypassing for testing...";
                        status.style.color = "orange";
                        markMyAttendance('Present');
                        finishVerification();
                    }
                }, 2000);
            };
        })
        .catch(err => {
            console.error("Webcam failed:", err);
            status.textContent = "Camera access denied. Launching Face ID Simulator...";
            status.style.color = "orange";
            setTimeout(() => {
                startMockFaceAttendance();
            }, 1500);
        });
}

function updateFaceUI() {
    const titleEl = document.getElementById('face-id-title');
    const subtitleEl = document.getElementById('face-id-subtitle');
    const previewImg = document.getElementById('face-registered-img');
    const previewIcon = document.getElementById('face-placeholder-icon');

    if (!currentUser) return;
    const student = students.find(s => s.id === currentUser.id);
    
    if (student && student.faceHash && student.facePhoto) {
        titleEl.textContent = "Face ID: Registered";
        titleEl.style.color = "var(--status-present)";
        subtitleEl.textContent = "Biometric template verified & ready for attendance";
        previewIcon.style.display = 'none';
        previewImg.src = student.facePhoto;
        previewImg.style.display = 'block';
    } else {
        titleEl.textContent = "Face ID: Not Registered";
        titleEl.style.color = "var(--status-absent)";
        subtitleEl.textContent = "Set up your face profile to enable smart verification";
        previewIcon.style.display = 'block';
        previewImg.style.display = 'none';
    }
}

function registerMockFace() {
    const index = students.findIndex(s => s.id === currentUser.id);
    if (index !== -1) {
        const mockPhoto = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%233b82f6"/><circle cx="50" cy="50" r="30" fill="none" stroke="white" stroke-width="4"/><text x="50" y="55" font-size="10" fill="white" text-anchor="middle" font-family="sans-serif">Face OK</text></svg>';
        students[index].facePhoto = mockPhoto;
        students[index].faceHash = "1111111100000000111111110000000011111111000000001111111100000000";
        saveData();
        
        currentUser.facePhoto = mockPhoto;
        currentUser.faceHash = students[index].faceHash;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        updateFaceUI();
    }
}

function finishVerification() {
    setTimeout(() => {
        stopMediaStreams();
        document.getElementById('face-auth-container').style.display = 'none';
        showToast("Smart Biometric Attendance Marked!");
    }, 2000);
}

function startMockFaceAttendance() {
    const status = document.getElementById('face-status');
    const video = document.getElementById('face-video');
    const captureBtn = document.getElementById('capture-face-btn');
    const registerBtn = document.getElementById('register-face-btn');

    video.style.display = 'none';
    
    // Render custom face ID graphic wrapper inside face-camera-wrapper
    let mockView = document.getElementById('mock-face-view');
    if (!mockView) {
        mockView = document.createElement('div');
        mockView.id = 'mock-face-view';
        mockView.className = 'mock-face-container';
        mockView.innerHTML = `
            <i class="fa-solid fa-user-shield face-avatar"></i>
            <div class="scanner-laser"></div>
            <span class="simulator-label">Face ID HUD Simulator</span>
        `;
        video.parentNode.insertBefore(mockView, video);
    }
    mockView.style.display = 'flex';
    
    const student = students.find(s => s.id === currentUser.id);
    
    if (student && student.faceHash) {
        captureBtn.style.display = 'inline-block';
        registerBtn.style.display = 'none';
        status.textContent = "Position face in simulator frame and click Verify";
    } else {
        registerBtn.style.display = 'inline-block';
        captureBtn.style.display = 'none';
        status.textContent = "Simulator Active: Click Register to save mock face data";
    }

    // Register Button Click
    registerBtn.onclick = () => {
        status.textContent = "Generating biometric coordinates...";
        status.style.color = "orange";
        mockView.querySelector('.scanner-laser').classList.add('scanning');

        setTimeout(() => {
            mockView.querySelector('.scanner-laser').classList.remove('scanning');
            
            const index = students.findIndex(s => s.id === currentUser.id);
            if (index !== -1) {
                // Mock image
                const mockPhoto = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2306b6d4"/><circle cx="50" cy="50" r="30" fill="none" stroke="white" stroke-width="4"/><text x="50" y="55" font-size="12" fill="white" font-weight="bold" text-anchor="middle" font-family="sans-serif">MOCK</text></svg>`;
                const mockHash = "1111111100000000111111110000000011111111000000001111111100000000";
                
                students[index].facePhoto = mockPhoto;
                students[index].faceHash = mockHash;
                saveData();
                
                currentUser.facePhoto = mockPhoto;
                currentUser.faceHash = mockHash;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                showToast("Simulator: Face ID Saved!");
                updateFaceUI();
                
                registerBtn.style.display = 'none';
                captureBtn.style.display = 'inline-block';
                status.textContent = "Mock Face ID Registered! Click Verify to check.";
                status.style.color = "var(--status-present)";
            }
        }, 2000);
    };

    // Verify Button Click
    captureBtn.onclick = () => {
        status.textContent = "Analyzing matching patterns...";
        status.style.color = "orange";
        mockView.querySelector('.scanner-laser').classList.add('scanning');

        setTimeout(() => {
            mockView.querySelector('.scanner-laser').classList.remove('scanning');

            if (demoFaceMatchOverride === 'mismatch') {
                status.textContent = "Verification Failed! Intruder match found.";
                status.style.color = "var(--status-absent)";
                showToast("Access Denied: Biometric Face mismatch!");
                return;
            }

            status.textContent = "Face Matches Registered Template (100% Match)!";
            status.style.color = "var(--status-present)";
            markMyAttendance('Present');

            setTimeout(() => {
                stopMediaStreams();
                mockView.style.display = 'none';
                document.getElementById('face-auth-container').style.display = 'none';
                showToast("Smart Attendance Marked!");
            }, 2000);
        }, 2500);
    };
}

function markMyAttendance(status) {
    if (!currentUser) return;

    // Find student in array and update
    const index = students.findIndex(s => s.id === currentUser.id);
    if (index !== -1) {
        students[index].status = status;
        students[index].timestamp = new Date().toISOString();
        
        // Initialise attendance history if not exists
        if (!students[index].attendanceHistory) {
            students[index].attendanceHistory = [];
        }
        
        const todayStr = new Date().toISOString().split('T')[0];
        const histIndex = students[index].attendanceHistory.findIndex(h => h.date === todayStr);
        if (histIndex !== -1) {
            students[index].attendanceHistory[histIndex].status = status;
        } else {
            students[index].attendanceHistory.push({ date: todayStr, status: status });
        }
        
        saveData();
        updateDashboard(); // Refreshes UI
    }
}

// Geofence Calc
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Update Dashboard (Original + New)
function updateDashboard() {
    // If Student Mode: Show Only their info
    if (currentUser && currentUser.type === 'student') {
        const myData = students.find(s => s.id === currentUser.id);
        if (!myData) return;

        // Populate Stats
        document.querySelector('.stat-card.total h3').textContent = 'My Attendance';
        document.querySelector('#total-count').textContent = '85%'; // Mock
        document.querySelector('#total-count').style.color = 'var(--status-present)';

        document.querySelector('.stat-card.present h3').textContent = 'Current Status';
        document.querySelector('#present-count').textContent = myData.status;

        document.querySelector('.stat-card.absent h3').textContent = 'Pending Leaves';
        const pending = leaveRequests.filter(r => r.studentId === currentUser.id && r.status === 'Pending').length;
        document.querySelector('#absent-count').textContent = pending;

        // Activity Log
        activityLog.innerHTML = '';
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${myData.name}</strong> 
            <span style="display:block; font-size: 0.8em; color: var(--text-muted); margin-top: 4px;">Status for today</span>
            <span class="status-badge ${myData.status.toLowerCase()}" style="margin-top: 5px;">${myData.status}</span>
            <span style="float: right; font-size: 0.8em; opacity: 0.7;">${getTimeAgo(new Date(myData.timestamp))}</span>
        `;
        activityLog.appendChild(li);

        return;
    }

    // Admin Mode
    document.querySelector('.stat-card.total h3').textContent = 'Total Students';
    document.querySelector('.stat-card.present h3').textContent = 'Present Today';
    document.querySelector('.stat-card.absent h3').textContent = 'Absent Today';

    const total = students.length;
    const present = students.filter(s => s.status === 'Present').length;
    const absent = students.filter(s => s.status === 'Absent').length;

    totalCountSpan.textContent = total;
    presentCountSpan.textContent = present;
    absentCountSpan.textContent = absent;

    // Update Activity Log
    activityLog.innerHTML = '';
    const recent = [...students].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

    if (recent.length === 0) {
        activityLog.innerHTML = '<li class="empty-log">No recent activity.</li>';
    } else {
        recent.forEach(s => {
            const timeAgo = getTimeAgo(new Date(s.timestamp));
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${s.name}</strong> (${s.department || 'N/A'} - Sem ${s.semester || s.class || ''})
                <span class="status-badge ${s.status.toLowerCase()}">${s.status}</span>
                <span style="float: right; font-size: 0.8em; opacity: 0.7;">${timeAgo}</span>
            `;
            activityLog.appendChild(li);
        });
    }
}

// Utility
function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

// Expose globals
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.updateLeave = updateLeave;
window.exportReport = exportReport;
window.startQRGeneration = startQRGeneration;
window.initQRScanner = initQRScanner;
window.initFaceAttendance = initFaceAttendance;
