# EPIC 6 — Frontend Tasks
## Document Release System

> **Backend Status**: ✅ Fully Implemented  
> **Last Updated**: December 13, 2025

---

## Summary

EPIC 6 covers the document release workflow:
- Registrar creates document release records (TOR, Certificates, etc.)
- Documents can be revoked with a reason
- Revoked documents can be reissued (creates new linked record)
- Head-Registrar has access to all release logs (audit view)

---

## API Endpoints

All endpoints are prefixed with `/api/v1/admissions/`

### Registrar Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/documents/release/` | Create document release | Registrar |
| GET | `/documents/my-releases/` | Get my releases | Registrar |
| GET | `/documents/student/{student_id}/` | Get student's documents | Registrar |
| GET | `/documents/{document_code}/` | Get document details | Registrar |
| POST | `/documents/{document_code}/revoke/` | Revoke a document | Registrar |
| POST | `/documents/{document_code}/reissue/` | Reissue a revoked document | Registrar |

### Head-Registrar Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/documents/all/` | Get all releases (audit view) | Head-Registrar |
| GET | `/documents/stats/` | Get release statistics | Head-Registrar |

---

## Document Types

| Value | Display Name |
|-------|--------------|
| `TOR` | Transcript of Records |
| `GOOD_MORAL` | Good Moral Certificate |
| `ENROLLMENT_CERT` | Certificate of Enrollment |
| `GRADES_CERT` | Certificate of Grades |
| `COMPLETION_CERT` | Certificate of Completion |
| `TRANSFER_CRED` | Transfer Credentials |
| `HONORABLE_DISMISSAL` | Honorable Dismissal |
| `DIPLOMA` | Diploma |
| `OTHER` | Other Document |

---

## Example Requests & Responses

### Create Document Release

**Request:**
```http
POST /api/v1/admissions/documents/release/
Authorization: Bearer <registrar_token>
Content-Type: application/json

{
  "student_id": "uuid-of-student",
  "document_type": "TOR",
  "purpose": "For employment",
  "copies_released": 2,
  "notes": "Rush request"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Document released successfully",
  "data": {
    "id": "uuid",
    "document_code": "DOC-20251213-00001",
    "document_type": "TOR",
    "document_type_display": "Transcript of Records",
    "student_number": "2025-00001",
    "student_name": "Juan Dela Cruz",
    "released_by_name": "Mr. Registrar",
    "released_at": "2025-12-13T14:30:00Z",
    "status": "ACTIVE",
    "status_display": "Active",
    "purpose": "For employment",
    "copies_released": 2
  }
}
```

---

### Get My Releases

**Request:**
```http
GET /api/v1/admissions/documents/my-releases/
Authorization: Bearer <registrar_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "document_code": "DOC-20251213-00001",
      "document_type": "TOR",
      "document_type_display": "Transcript of Records",
      "status": "ACTIVE",
      "student_number": "2025-00001",
      "student_name": "Juan Dela Cruz",
      "released_by": "Mr. Registrar",
      "released_at": "2025-12-13T14:30:00Z",
      "revoked_by": null,
      "revoked_at": null,
      "revocation_reason": "",
      "copies_released": 2
    }
  ]
}
```

---

### Revoke Document

**Request:**
```http
POST /api/v1/admissions/documents/DOC-20251213-00001/revoke/
Authorization: Bearer <registrar_token>
Content-Type: application/json

{
  "reason": "Document contains incorrect information - wrong GPA printed"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Document revoked successfully",
  "data": {
    "id": "uuid",
    "document_code": "DOC-20251213-00001",
    "status": "REVOKED",
    "revoked_by_name": "Mr. Registrar",
    "revoked_at": "2025-12-13T15:00:00Z",
    "revocation_reason": "Document contains incorrect information - wrong GPA printed"
  }
}
```

---

### Reissue Document

**Request:**
```http
POST /api/v1/admissions/documents/DOC-20251213-00001/reissue/
Authorization: Bearer <registrar_token>
Content-Type: application/json

{
  "purpose": "Corrected version for employment",
  "notes": "Corrected GPA calculation error"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Document reissued successfully",
  "data": {
    "id": "uuid-new",
    "document_code": "DOC-20251213-00002",
    "document_type": "TOR",
    "status": "ACTIVE",
    "replaces": "uuid-original",
    "notes": "Corrected GPA calculation error"
  }
}
```

---

### Get All Releases (Head-Registrar)

**Request:**
```http
GET /api/v1/admissions/documents/all/?document_type=TOR&status=ACTIVE
Authorization: Bearer <head_registrar_token>
```

**Query Parameters:**
- `document_type` - Filter by type
- `status` - Filter by status (ACTIVE, REVOKED, REISSUED)
- `date_from` - Start date
- `date_to` - End date

---

### Get Release Statistics (Head-Registrar)

**Request:**
```http
GET /api/v1/admissions/documents/stats/
Authorization: Bearer <head_registrar_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_released": 150,
    "active": 140,
    "revoked": 5,
    "reissued": 5,
    "by_document_type": {
      "TOR": 50,
      "GOOD_MORAL": 40,
      "ENROLLMENT_CERT": 30,
      "OTHER": 30
    }
  }
}
```

---

## Status Flow

```
ACTIVE → REVOKED → REISSUED (new document created)
                 ↓
              NEW ACTIVE document (with replaces link)
```

---

## Frontend Tasks Checklist

### Registrar Document Release Portal
- [ ] **Document Release Form**
  - Student search/select
  - Document type dropdown
  - Purpose field
  - Number of copies
  - Notes field
  - Submit button

- [ ] **My Releases List**
  - Table with document code, type, student, date, status
  - Status badges (ACTIVE=green, REVOKED=red)
  - Actions: View, Revoke

- [ ] **Student Documents Modal**
  - Search/select student
  - Show all documents for that student
  - Allow quick release

- [ ] **Revoke Dialog**
  - Document info display
  - Reason textarea (required, min 10 chars)
  - Confirm button with warning

- [ ] **Reissue Dialog**
  - Show original document info
  - Purpose field (prefilled)
  - Notes field
  - Confirm button

### Head-Registrar Audit Panel
- [ ] **All Releases View**
  - Filterable by date, type, status
  - Shows who released and who revoked
  - Export to CSV (future)

- [ ] **Statistics Dashboard**
  - Total documents released
  - By status pie chart
  - By type bar chart
  - By registrar breakdown

---

## UI Considerations

1. **Document Code:**
   - Format: `DOC-YYYYMMDD-XXXXX`
   - Make it easily copyable (click to copy)

2. **Status Badges:**
   - `ACTIVE` - Green
   - `REVOKED` - Red
   - `REISSUED` - Gray (superseded)

3. **Revocation Warning:**
   - Show confirmation dialog
   - "This action cannot be undone. The document will be marked as invalid."

4. **Reissue Chain:**
   - Show link to original document
   - "This replaces DOC-XXXXXX-XXXXX"
