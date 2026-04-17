# 🛡️ CheckMate – Real-Time Exam Integrity Monitoring System

## 📌 Overview

**CheckMate** is a real-time exam integrity monitoring system designed to detect and prevent unfair practices during digital examinations. It enables invigilators to identify violations instantly and take immediate corrective actions, ensuring a secure and controlled examination environment.

---

## 🎯 Problem Statement

Conventional examination systems rely on post-examination analysis, where instances of malpractice are identified only after the exam has concluded. This approach is ineffective in preventing violations during the examination process.

**Objective:**
To design and implement a system that:

* Detects unauthorized activities during examinations
* Provides real-time alerts to invigilators
* Enables immediate intervention and control

---

## 💡 Proposed Solution

CheckMate is composed of three primary components:

* **Desktop Agent:** Continuously monitors system-level activities
* **Backend Server:** Processes incoming data and maintains violation logs
* **Admin Dashboard:** Displays real-time system status and enables administrative control

The system is capable of detecting:

* Unauthorized internet access
* Hotspot tethering
* USB and external peripheral connections

Violations are detected and reported in **less than one second**, ensuring immediate response.

---

## 🚀 Key Features

* Real-time monitoring of examination systems
* Instant violation detection (<1 second)
* Live dashboard with status indicators (Safe / Violation)
* Audio and visual alert mechanisms
* Automatic logging of all violations
* Offline resilience with automatic data synchronization

---

## 👨‍🏫 Invigilator Control System

CheckMate provides authority-based control mechanisms for invigilators:

* **Warn Student**
  Sends an immediate warning notification to the student system

* **Hold Exam Session**
  Temporarily suspends the student’s examination activity

* **Terminate Exam Session**
  Immediately ends the examination for the student

These capabilities transform the system from passive monitoring to an **active examination control system**.

---

## 🏗️ System Architecture

### 1. Desktop Agent

* Operates silently in the background
* Monitors network adapters and USB/peripheral activity

### 2. Backend Server

* Manages communication between system components
* Processes and stores violation data

### 3. Admin Dashboard

* Displays real-time system status
* Receives alerts via WebSocket communication
* Provides interface for administrative actions

---

## 🔄 Working Flow

1. Examination session is initiated
2. Desktop agent starts in the background
3. Continuous monitoring of system activities
4. Violation is detected (e.g., USB insertion, hotspot usage)
5. Alert is transmitted to the server (<1 second)
6. Dashboard updates instantly (status change)
7. Alert notification and alarm are triggered
8. Invigilator takes appropriate action (Warn / Hold / Terminate)
9. Violation is recorded in the database

---

## 📋 Functional Requirements

* Continuous monitoring of network activity
* Detection of unauthorized devices and connections
* Real-time transmission of alerts to the server
* Live status visualization on the dashboard
* Support for invigilator intervention
* Secure storage of violation logs

---

## 📌 Non-Functional Requirements

* **Performance:** Alerts generated within <1 second
* **Scalability:** Capable of handling 100+ systems simultaneously
* **Reliability:** Supports offline operation with data synchronization
* **Usability:** Intuitive and user-friendly interface
* **Compatibility:** Supports Windows and Linux platforms

---

## 🧰 Technology Stack

### Frontend

* HTML5, CSS3, JavaScript
* Chart.js
* Web Audio API

### Backend

* Node.js, Express.js
* Socket.io

### Desktop Agent

* Python
* psutil
* WMI / pyudev

### Database

* SQLite
* Firebase Realtime Database

---

## 📂 Project Structure

```
project-root/
│
├── server/
│   ├── index.js
│   └── database.db
│
├── client/
│   ├── admin-dashboard.html
│   ├── student-dashboard.html
│   └── styles.css
│
├── monitor/
│   └── monitor.py
│
└── README.md
```

---

## ⚙️ Installation & Setup

### 1. Clone Repository

```
git clone https://github.com/your-username/checkmate.git
cd checkmate
```

### 2. Install Dependencies

```
npm install
```

### 3. Start Server

```
node index.js
```

### 4. Run Desktop Agent

```
python monitor.py
```

---

## 🌐 Configuration

Update the server IP address in `monitor.py`:

```python
SERVER_IP = "YOUR_SERVER_IP"
```

Ensure all systems are connected within the same network environment.

---

## 🌍 Use Cases

* Government recruitment examinations (UPSC, SSC, IBPS)
* University and college examinations
* Corporate hiring assessments
* School-level digital tests

---

## 🔮 Future Enhancements

* AI-based facial monitoring
* Behavioral analysis using machine learning
* Cloud-based centralized monitoring
* Mobile dashboard integration

---

## 👩‍💻 Team Details

* **Team Name:** CheckMate
* **Team Leader:** Samruddhi Satpute

---

## 🏁 Conclusion

CheckMate provides a reliable and scalable solution for maintaining examination integrity by enabling **real-time detection, alerting, and intervention**. The system ensures that malpractice is not only detected but effectively prevented during the examination process.

---
