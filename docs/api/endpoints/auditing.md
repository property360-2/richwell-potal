# Auditing API

## Overview
The auditing system records every `CREATE`, `UPDATE`, and `DELETE` action on critical models. 

## Endpoints

### Audit Logs (`/api/auditing/logs/`)
View system audit trails.

#### `GET /api/auditing/logs/`
List and filter audit logs.
- **Auth required**: Yes (Head Registrar / Admin)
- **Filters**: user, action, model_name, created_at.
- **Search**: object_id, object_repr, user details.

#### `GET /api/auditing/logs/export_csv/`
Download the currently filtered list as a CSV file.
- **Auth required**: Yes (Head Registrar / Admin)

## Logged Data
| Field | Description |
|-------|-------------|
| user | The user who performed the action |
| action | CREATE, UPDATE, or DELETE |
| model_name | The impacted model (e.g., "Grade") |
| object_id | The primary key of the impacted object |
| changes | JSON object showing "before" and "after" for updated fields |
| ip_address | Client IP address |
