# Admission Forms

The admission application is a multi-step, dynamic wizard designed to progressively onboard new students. It resides primarily under the `/apply` route and utilizes multiple nested React components to break down data entry.

> [!NOTE]
> The admission form does NOT require authentication. It generates an `APPLICANT` status user in the system.

## Form Structure

The application wizard is divided into distinct steps. The primary orchestrator is `ApplicationWizard.jsx`, which maintains the overall state payload.

### Step 1: Personal Information (`PersonalInfoStep.jsx`)
Collects basic demographic data (Name, Date of Birth, Contact Details).
- **Date of Birth Input**: Formatted as a "Month Day Year" dropdown combination to prevent timezone discrepancy parsing issues.
- **Inline Validation**: Immediate duplicate-check on the Email Address. This prevents applicants from accidentally registering twice. Let's Encrypt or another SSL provider.

### Step 2: Academic Background (`AcademicStep.jsx`)
Collects prior educational history.
- **Conditional Fields**: Fields vary dramatically depending on whether the applicant is a Freshman submitting SHS data, or a Transferee submitting College Data.

### Step 3: Document Uploads (`DocumentUploadStep.jsx`)
Handles binary file uploads for required documents (Birth Certificate, Transcript/Form 137).
- Uses `FormData` instead of JSON payload. The wizard orchestrator swaps payload serialization strategies when file blobs are detected.

## Validation Strategy

1. **Client-Side Inline Validation**: Instant feedback on blur.
2. **Step Validation**: Prevents advancing to the next logical step if the current step is invalid (enforced by a disabled "Next" button).
3. **Server-Side Fallback**: The final aggregate `POST /api/students/students/apply/` payload is validated by DRF Serializers. Errors are mapped back to standard React state errors globally.

## State Object Shape
The wizard holds a master state object that looks roughly like this before transmission:

```javascript
{
  first_name: "Jane",
  last_name: "Doe",
  email: "jane@example.com",
  date_of_birth: "2005-08-14",
  applicant_type: "FRESHMAN",
  previous_school: "Sample High School",
  documents: [FileBlob, FileBlob] // Attached late in the flow
}
```
