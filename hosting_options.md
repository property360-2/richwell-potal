# Richwell Colleges Portal - Hosting & Storage Options

This document outlines the recommended infrastructure for deploying the **Richwell Colleges Portal** online, ensuring high performance, security, and scalability for students and staff.

## 🚀 Recommended Hosting Architectures

| Component | **Option A: The "Pro-Enterprise" Choice** | **Option B: The "Modern & Fast" Hybrid** |
| :--- | :--- | :--- |
| **Frontend** | AWS Amplify / DigitalOcean App Platform | **Vercel** / **Netlify** |
| **Backend (Django)** | AWS App Runner / DigitalOcean App Platform | **Railway.app** / **Render.com** |
| **Database (PostgreSQL)** | AWS RDS / DigitalOcean Managed DB | **Neon.tech** / **Railway DB** |
| **Cloud Storage** | **AWS S3** | **Cloudinary** |
| **Suitability** | Large academic institutions with high traffic. | Rapid iteration, ease of use, lower cost. |

---

## ☁️ Cloud Storage (Document Uploads)

Since we are handling sensitive documents (TOR, Birth Certificates), security is priority #1.

### 1. **AWS S3 (Amazon Simple Storage)** - *Highly Recommended*
*   **Security:** Supports Private Buckets (files are NOT public by default).
*   **Integration:** Works perfectly with `django-storages` and `boto3`.
*   **Reliability:** Industry standard with 99.9% uptime.
*   **Cost:** "Pay-as-you-go" — very cheap for static document storage.

### 2. **Cloudinary** - *Best for Media & Previews*
*   **Features:** Automatic PDF-to-Image generation (great for staff document previews).
*   **Free Tier:** Generous free credits for the start of the project.
*   **Ease of Use:** Very friendly dashboard for managing uploaded assets.

---

## 🛠 Preparation Checklist for Deployment

### 1. Security & Environment
- [ ] Move all secrets from `.env` to the Hosting Provider's **Environment Variables** dashboard.
- [ ] Set `DEBUG=False` in production.
- [ ] Configure `ALLOWED_HOSTS` to include your production domain.

### 2. Database & Region
- [ ] Ensure **Backend** and **Database** are hosted in the **same region** (e.g., AWS Singapore) to avoid latency/slow performance.
- [ ] Set up automated database backups.

### 3. File Handling
- [ ] Install `django-storages` and `boto3` for S3 integration.
- [ ] Update `settings.py` to point to the Cloud Storage bucket instead of `MEDIA_ROOT`.

---


