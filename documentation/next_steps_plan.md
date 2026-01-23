<!-- documentation\next_steps_plan.md -->
# Next Steps Plan

## 1. Quality Assurance & Testing
The project has significant functionality but lacks comprehensive test coverage verification.
*   **Backend:** Run `python manage.py test` to identify and fix failing tests in `academics`, `accounts`, and `enrollment` apps.
*   **Frontend:** Introduce basic unit testing or manual QA scripts for critical flows (Enrollment, Payment).

## 2. UI/UX Standardization
The frontend uses vanilla JS/Vite. Ensure consistency across pages.
*   **Design System:** Review `style.css` and component files (`header.js`, `Modal.js`) to ensure consistent usage of colors, spacing, and typography.
*   **Responsiveness:** Verify layouts on mobile view, especially for student dashboards.
*   **Feedback:** Improve error messages and loading states (already using `Toast` and `Spinner`, ensure usage is ubiquitous).

## 3. Feature Completion (Gaps identified from Plan)
*   **Notifications:** Implement the `Notification` model and frontend integration (bell icon logic) as specified in `plan.md` Section 11.
*   **Reports:** Expand reporting capabilities. Currently, only `INCReportView` was found. Implement:
    *   Enrollment Summary Report (Head Registrar)
    *   Payment Collection Report (Admin/Cashier)
*   **Background Jobs:** Verify `Celery` configuration for async tasks (e.g., INC expiry checks).

## 4. Deployment Readiness
*   **Containerization:** Create `Dockerfile` and `docker-compose.yml` for easy deployment.
*   **Configuration:** Ensure `settings.py` properly handles production vs. development environments (`.env` handling).
