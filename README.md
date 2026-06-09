# 🎓 Smart AMS Portal
### Attendance Management System

> A modern, feature-rich **Attendance Management System** built entirely with vanilla **HTML**, **CSS**, and **JavaScript** — no frameworks, no backend required. Runs directly in any browser with full offline support via `localStorage`.

---

## 📸 Overview

Smart AMS Portal is a comprehensive web-based attendance management system designed for educational institutions. It provides a clean, role-based interface for **Admins** and **Students**, featuring smart biometric attendance, leave management, analytics, and more — all in a single-page application.

---

## ✨ Features

### 🔐 Authentication & Role Management
- **Dual-role login** system — separate login flows for **Admin** and **Student**
- **Session persistence** using `sessionStorage` — users stay logged in on refresh
- **Role-based UI** — sidebar navigation, visible sections, and actions adapt dynamically based on the logged-in user's role
- **Student self-service password change** — students can update their admin-assigned password securely from the student panel

### 🛡️ Admin Panel
- **Register Students** — add new students with Full Name, Roll Number, Password, Semester, Department, and initial attendance status
- **Edit & Delete Records** — full CRUD operations on student profiles
- **View All Records** — searchable, filterable student attendance table with Semester and Department columns
- **Leave Request Management** — approve or reject student leave requests in real time
- **Dynamic QR Code Generator** — generate time-limited QR codes (auto-refreshes every 30 seconds) for smart attendance sessions

### 🎓 Student Panel
- **Personal Dashboard** — view personal attendance percentage, current status, and pending leaves
- **Apply for Leave** — submit leave requests with start/end dates and a reason; track past request statuses
- **Smart Attendance via QR Code** — scan the admin-generated QR code with a live camera to mark attendance (with geofencing integration)
- **Smart Attendance via Face ID** — register a face biometric profile and use facial recognition (Average Hash algorithm) to verify identity and mark attendance
- **Change Password** — securely update account password with current-password verification and confirmation matching

### 📊 Analytics
- **Doughnut Chart** (Chart.js) displaying real-time Present / Absent / On Leave distribution
- **Export Reports** in **PDF** (via jsPDF) and **CSV** formats, including Semester and Department data

### 🔔 Notifications & Alerts
- **Toast notifications** for all user actions (add, edit, delete, login, errors, etc.)
- **Absent Alert simulation** — notifies guardians when a student is marked absent
- **Real-time activity log** on the Admin Dashboard showing the latest 5 student updates

### 📷 Smart Attendance System
- **QR Code Attendance** — uses `html5-qrcode` library for live scanning; falls back to a mock scanner in restricted environments (e.g., `file://` protocol)
- **Face ID Attendance** — captures webcam frames, generates an **Average Hash (aHash)** fingerprint, and computes **Hamming Distance** for match verification; fallback mock simulator included
- **Geofencing** — integrates the browser Geolocation API to verify that students are within an acceptable range of the institution before scanning
- **Demo/Testing Panel** — Force Match / Force Mismatch controls for rapid prototyping and QA testing

### 💾 Data Persistence
- All student records, leave requests, and face biometric hashes are persisted in **`localStorage`**
- **Backward compatibility migration** — existing records are automatically upgraded when new fields (e.g., `semester`, `department`) are introduced

---

## 🛠️ Technologies Used

| Category | Technology |
|---|---|
| **Markup** | HTML5 (Semantic elements, accessible forms) |
| **Styling** | Vanilla CSS3 (CSS Custom Properties, Grid, Flexbox, Animations) |
| **Logic** | Vanilla JavaScript (ES6+, DOM API, Web APIs) |
| **Fonts** | [Google Fonts — Inter](https://fonts.google.com/specimen/Inter) |
| **Icons** | [Font Awesome 6](https://fontawesome.com/) |
| **Charts** | [Chart.js](https://www.chartjs.org/) — Doughnut charts for analytics |
| **QR Generation** | [qrcodejs](https://github.com/davidshimjs/qrcodejs) |
| **QR Scanning** | [html5-qrcode](https://github.com/mebjas/html5-qrcode) |
| **PDF Export** | [jsPDF](https://github.com/parallax/jsPDF) |
| **Storage** | Browser `localStorage` & `sessionStorage` |
| **Camera API** | `navigator.mediaDevices.getUserMedia` |
| **Location API** | `navigator.geolocation` |
| **Biometrics** | Custom Average Hash (aHash) + Hamming Distance algorithm |

---

## 📁 Project Structure

```
Smart_AMS_Portal/
│
├── index.html       # Main SPA — all sections, forms, and layout
├── style.css        # Complete design system — variables, components, animations
├── script.js        # All application logic — auth, CRUD, QR, face, charts
└── README.md        # Project documentation
```

---

## 🚀 Getting Started

This project requires **no installation, no build tools, and no server**.

### Run Locally

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/yourusername/Smart_AMS_Portal.git
   ```

2. **Open** `index.html` in any modern browser:
   ```
   Just double-click index.html
   ```
   > ⚠️ **Note:** For full camera/QR functionality, serve the files via a local server (e.g., VS Code Live Server extension) instead of opening via `file://`. The app includes graceful fallback mock simulators for restricted environments.

### Using Live Server (Recommended)
- Install the **Live Server** extension in VS Code
- Right-click `index.html` → **Open with Live Server**

---

## 🔑 Default Login Credentials

### Admin
| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

### Student
> Students are added by the Admin. Use the Roll Number and Password set during registration.

---

## 📋 Usage Guide

### Admin Workflow
1. Log in as **Admin** (`admin` / `admin123`)
2. Navigate to **Add Student** → Register a new student with their details
3. Go to **View Records** → Search, edit, or delete student records
4. Open **Analytics** → View attendance charts and export PDF/CSV reports
5. Manage **Leave Mgmt** → Approve or reject student leave requests
6. Start a **Smart Attendance** session → Generate a dynamic QR code for the class

### Student Workflow
1. Log in with your **Roll Number** and **Password**
2. View your **Dashboard** — attendance status and pending leaves
3. Go to **Leave Mgmt** → Submit a leave request with dates and reason
4. Use **Smart Attendance** → Scan QR code or register/verify Face ID to mark attendance
5. Go to **Change Password** → Update your password securely

---

## 🧠 Algorithm Details

### Face ID — Average Hash (aHash)
The system uses a lightweight, client-side biometric matching approach:
1. **Registration**: Captures a webcam frame → scales to 8×8 pixels → converts to grayscale → computes average brightness → generates a 64-bit binary hash string
2. **Verification**: Captures a live frame → computes hash → calculates **Hamming Distance** against the stored hash
3. **Threshold**: A Hamming Distance ≤ 12 is considered a match (same person / camera setup)
4. **Intruder Detection**: If the live face matches another registered student's hash, an intruder alert is triggered

---

## 📱 Responsive Design

The portal is **mobile-friendly** with responsive breakpoints:
- On smaller screens, the sidebar collapses into a horizontal icon-only navbar
- Forms and tables adapt to single-column layouts on mobile

---

## ⚙️ Configuration

To customize school coordinates for geofencing, edit the constants in `script.js`:

```js
// script.js
const SCHOOL_COORDS = { lat: 40.7128, lng: -74.0060 }; // Replace with your school's GPS coordinates
const GEOFENCE_RADIUS = 100; // Radius in meters
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Author

Built with ❤️ using pure HTML, CSS & JavaScript.

> **Smart AMS Portal** — Simplifying attendance, empowering education.

---

<div align="center">

⭐ **Star this repo if you found it helpful!** ⭐

</div>
