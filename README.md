# Richwell Colleges Portal

A modern, full-stack student information system managing enrollment, grades, exam permits, and financial records.

## 🏗 Architecture
- **Backend**: Django 5.2 (DRF), PostgreSQL 17, Celery, Redis.
- **Frontend**: React 19 (Vite), TailwindCSS 4, TanStack Query.
- **Reporting**: WeasyPrint for PDF generation.

## 📋 Prerequisites
- **Python**: 3.10+
- **Node.js**: 20+
- **PostgreSQL**: 15+ (17.6 tested)
- **Redis**: Required for Celery tasks (Windows users: Use Memurai or WSL).

## 🚀 Setup Guide

### 1. Database Setup
Create a PostgreSQL database named `richwell`:
```sql
CREATE DATABASE richwell;
```

### 2. Backend Setup
Navigate to the backend directory:
```bash
cd backend
```

Create and activate a virtual environment:
```bash
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

**Configuration**:
Create a `.env` file in `backend/` with your credentials:
```ini
DEBUG=True
SECRET_KEY=your-secret-key-dev
ALLOWED_HOSTS=localhost,127.0.0.1
# Database
DB_ENGINE=django.db.backends.postgresql
DB_NAME=richwell
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Run migrations and server:
```bash
python manage.py migrate
python manage.py runserver
```

### 3. Frontend Setup
Navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Access the portal at `http://localhost:5173`.

## 🔑 Default Credentials
- **Admin**: `admin` / `admin`

## ✨ Key Features
- **Role-Based Access**: Granular permissions for Registrars, Cashiers, Deans, and Students.
- **Enrollment**: Real-time capacity checks, prerequisite validation, and override capabilities.
- **Exam Permits**: Automated generation based on payment status and month mapping.
- **Security**: API Rate Limiting, JWT Authentication, and Secure Headers.
