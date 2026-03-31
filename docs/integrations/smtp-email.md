# SMTP Email Integration

The Richwell Portal utilizes SMTP to send critical system notifications to users. Emails are triggered synchronously during specific state changes in the admission and enrollment workflows.

## Configuration
Requires the following `.env` settings (see `environment.md` for details):
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_USE_TLS`

> [!WARNING]
> Keep the email passwords secure. If using Gmail, use an "App Password" rather than your primary account password.

## Triggers

The system automatically dispatches emails during these key events:

### 1. Application Received
When a public student submits an application using the `POST /api/students/students/apply/` endpoint, an email containing the "Application Received" confirmation is dispatched to the provided email address.

### 2. Admission Verification
When an Admission Staff member clicks "Approve", an email is dispatched containing their new permanent IDN and instructions to log into the portal.

## Error Handling

Email integrations are notoriously fragile (network delays, invalid credentials, SMTP rate limits). The system should wrap the `send_mail` functions defensively:

1. **Silencing Errors**: The backend catches `SMTPException` to prevent the primary HTTP request from failing with a 500 error if the email fails to send, but the database saving succeeds.
2. **Audit Logging**: A successful email dispatch, or a failure, should ideally log an event in the `AuditLog` for debugging.
