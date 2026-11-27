# CampusVoice — Module Documentation

> **Full Project Documentation, Architecture Diagrams & Complete Usage Guide:** See the root [README.md](../README.md).

## Interactive Architecture Diagram
- Open [../.archify/architecture-campusvoice-system-20261127-211025/campusvoice-system.html](../.archify/architecture-campusvoice-system-20261127-211025/campusvoice-system.html) for the interactive Archify system diagram.

## Quick Run
```powershell
pip install -r backend/requirements.txt
python run_server.py
```
- **Gateway & Portals:** `http://127.0.0.1:8000` (and `http://<LAN_IP>:8000` via `0.0.0.0:8000` for mobile QR scan)
- **Swagger / OpenAPI Docs:** `http://127.0.0.1:8000/docs`

## Portal Credentials & Isolation

| Portal | Route | Username | Password | Role Behavior |
|---|---|---|---|---|
| **Main Gateway** | `/` | — | — | Credential login, self-registration, EN/HI/BN switch, live AI preview & QR standee |
| **Student Workspace** | `/student` | `student` | `student123` | Strictly scoped to authenticated student's own complaints, notifications & DP upload |
| **IT Department** | `/department` | `dept_it` | `it123` | Locked to `IT/Network` work orders + real-time WebSocket dispatch |
| **Maintenance Dept** | `/department` | `dept_maintenance` | `maint123` | Locked to `Maintenance` work orders + real-time WebSocket dispatch |
| **Hostel Dept** | `/department` | `dept_hostel` | `hostel123` | Locked to `Hostel` work orders + real-time WebSocket dispatch |
| **Sanitation Dept** | `/department` | `dept_sanitation` | `sanitation123` | Locked to `Sanitation` work orders + real-time WebSocket dispatch |
| **Administration Desk** | `/admin` | `admin` | `admin123` | Campus-wide KPI registry, circular publisher + attachments & CSV export |
