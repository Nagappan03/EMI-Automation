EMI Vault Solutions – Automation Engine

Production-grade automation system for EMI statement processing and monthly financial notifications.

🚀 Overview

EMI Vault Solutions is an automated backend-driven system that:
	•	Fetches and processes bank statements (Axis & Kotak currently supported)
	•	Tracks execution history with detailed job diagnostics
	•	Sends automated monthly email and WhatsApp notifications
	•	Provides a clean, public system dashboard with controlled admin access

This project is built as a full-stack deployment using:
	•	Node.js (Express)
	•	Prisma ORM
	•	PostgreSQL
	•	React (Vite)
	•	Railway (Deployment)

🏗 Architecture

Single-service deployment:
	•	Backend API + Cron Jobs
	•	React frontend served via Express
	•	PostgreSQL database (Railway)
  

⚙️ Core Features

📊 Dashboard
	•	System health monitoring
	•	Last run status
	•	Monthly notification status
	•	Bank-level breakdown
	•	Execution history

🔁 Scheduled Jobs
	•	Daily statement processing
	•	Monthly notification automation
	•	Manual trigger support (Admin protected)

📬 Notifications
	•	Email notifications (SMTP-based)
	•	WhatsApp template notifications (Twilio API)

🔐 Security
	•	Public dashboard visibility
	•	Admin password protection for manual triggers
	•	Environment-based configuration

🛠 Local Development

1. Install dependencies
npm install
npm --prefix frontend install

2. Setup environment variables

Create .env file:
# Server
PORT=
NODE_ENV=

# Gmail OAuth
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=
GMAIL_REFRESH_TOKEN=

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_JSON={}
GOOGLE_SHEET_ID=
GOOGLE_SHEET_LINK=

# PDF Passwords
AXIS_PDF_PASSWORD=
KOTAK_PDF_PASSWORD=

# Database
DATABASE_URL=

# Auth
ADMIN_PASSWORD=

# Testing
DRY_RUN=

# Email alerts
ALERT_EMAIL_FROM=
EMAIL_RECIPIENTS=

# WhatsApp alerts
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
TWILIO_WHATSAPP_TEMPLATE_SID=
WHATSAPP_RECIPIENTS=

3. Run locally

Backend:
npm run dev

Frontend (optional dev mode):
cd frontend
npm run dev

🐳 Docker Deployment

Production Docker build:
docker build -t emi-automation .
docker run -p 8080:8080 emi-automation

🌍 Production Deployment

Deployed via Railway:
	•	Custom Domain: https://emivaultsolutions.in
	•	HTTPS via Railway managed SSL
	•	PostgreSQL hosted on Railway

📦 Project Structure
/src
  /jobs
  /services
  /lib
/frontend
  /src
  /components
  /pages
Dockerfile

📌 MVP Scope (Version 1)
	•	Axis + Kotak statement processing
	•	Email notifications
	•	WhatsApp template messaging
	•	Admin-protected manual triggers
	•	Execution diagnostics
	•	Production deployment

🔭 Future Roadmap (MVP-2+)
	•	Multi-bank plug-in architecture
	•	User-level authentication
	•	Multi-tenant support
	•	Financial analytics dashboard
	•	Retry mechanisms & alerting
	•	Scalable notification queue system

👤 Author

Nagappan S
Org – EMI Vault Solutions
