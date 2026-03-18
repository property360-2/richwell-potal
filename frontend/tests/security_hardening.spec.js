import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adminState = path.join(__dirname, 'playwright/.auth/user.json');
const professorState = path.join(__dirname, 'playwright/.auth/professor.json');
const studentState = path.join(__dirname, 'playwright/.auth/student.json');
const irregularState = path.join(__dirname, 'playwright/.auth/irregular.json');
const blockedStudentState = path.join(__dirname, 'playwright/.auth/blocked-student.json');
const programHeadState = path.join(__dirname, 'playwright/.auth/program-head.json');
const cashierState = path.join(__dirname, 'playwright/.auth/cashier.json');
const API_BASE_URL = 'http://localhost:8000/api';

function toApiUrl(pathname) {
    const normalizedPath = pathname.startsWith('/api/')
        ? pathname.slice(4)
        : pathname;
    return `${API_BASE_URL}${normalizedPath}`;
}

async function getJson(page, url) {
    return page.evaluate(async ({ url: requestUrl }) => {
        const response = await fetch(requestUrl, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
        });
        let data = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }
        return { status: response.status, data };
    }, { url: toApiUrl(url) });
}

async function getCsrfToken(page) {
    return page.evaluate(async ({ apiBaseUrl }) => {
        await fetch(`${apiBaseUrl}/accounts/auth/csrf/`, { credentials: 'include' });
        const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : null;
    }, { apiBaseUrl: API_BASE_URL });
}

async function postJson(page, url, body = {}) {
    const csrfToken = await getCsrfToken(page);
    return page.evaluate(async ({ url: requestUrl, body: payload, csrfToken: token }) => {
        const response = await fetch(requestUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRFToken': token,
            },
            body: JSON.stringify(payload),
        });
        let data = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }
        return { status: response.status, data };
    }, { url: toApiUrl(url), body, csrfToken });
}

function unwrapResults(data) {
    if (Array.isArray(data)) {
        return data;
    }
    return data?.results ?? [];
}

test.describe('Security Hardening', () => {
    test('refresh response does not expose raw JWTs', async ({ browser }) => {
        const adminContext = await browser.newContext({ storageState: adminState });
        const adminPage = await adminContext.newPage();
        await adminPage.goto('/admin');

        const refreshResult = await postJson(adminPage, '/api/accounts/auth/refresh/');
        expect(refreshResult.status).toBe(200);
        expect(refreshResult.data?.access).toBeUndefined();
        expect(refreshResult.data?.refresh).toBeUndefined();
        await adminContext.close();
    });

    test('professor cannot mutate a foreign grade by direct API request', async ({ browser }) => {
        const adminContext = await browser.newContext({ storageState: adminState });
        const adminPage = await adminContext.newPage();
        await adminPage.goto('/admin');

        const termsResponse = await getJson(adminPage, '/api/terms/');
        const activeTerm = unwrapResults(termsResponse.data).find((term) => term.code === 'E2E-TERM');
        expect(activeTerm).toBeTruthy();

        const gradesResponse = await getJson(
            adminPage,
            `/api/grades/advising/?term=${activeTerm.id}`
        );
        const foreignGrade = unwrapResults(gradesResponse.data).find(
            (grade) => grade.student_idn === 'E2E-5005' && grade.subject_details?.code === 'E2E301'
        );
        expect(foreignGrade).toBeTruthy();
        await adminContext.close();

        const professorContext = await browser.newContext({ storageState: professorState });
        const professorPage = await professorContext.newPage();
        await professorPage.goto('/professor');

        const response = await postJson(
            professorPage,
            `/api/grades/submission/${foreignGrade.id}/submit-final/`,
            { value: 1.25 }
        );

        expect(response.status).toBe(403);
        expect(response.data?.message || response.data?.detail).toMatch(/assigned|permission/i);
        await professorContext.close();
    });

    test('program head cannot approve another program enrollment', async ({ browser }) => {
        const adminContext = await browser.newContext({ storageState: adminState });
        const adminPage = await adminContext.newPage();
        await adminPage.goto('/admin');

        const enrollmentsResponse = await getJson(adminPage, '/api/students/enrollments/?advising_status=PENDING');
        const foreignEnrollment = unwrapResults(enrollmentsResponse.data).find(
            (enrollment) => enrollment.student_idn === 'E2E-5005'
        );
        expect(foreignEnrollment).toBeTruthy();
        await adminContext.close();

        const programHeadContext = await browser.newContext({ storageState: programHeadState });
        const programHeadPage = await programHeadContext.newPage();
        await programHeadPage.goto('/program-head');

        const response = await postJson(
            programHeadPage,
            `/api/grades/approvals/${foreignEnrollment.id}/approve/`
        );

        expect(response.status).toBe(403);
        expect(response.data?.message || response.data?.detail).toMatch(/manage|permission/i);
        await programHeadContext.close();
    });

    test('student cannot read cross-student data, but cashier can query permit status', async ({ browser }) => {
        const adminContext = await browser.newContext({ storageState: adminState });
        const adminPage = await adminContext.newPage();
        await adminPage.goto('/admin');

        const studentsResponse = await getJson(adminPage, '/api/students/');
        const foreignStudent = unwrapResults(studentsResponse.data).find((student) => student.idn === 'E2E-5005');
        expect(foreignStudent).toBeTruthy();

        const termsResponse = await getJson(adminPage, '/api/terms/');
        const activeTerm = unwrapResults(termsResponse.data).find((term) => term.code === 'E2E-TERM');
        expect(activeTerm).toBeTruthy();
        await adminContext.close();

        const studentContext = await browser.newContext({ storageState: studentState });
        const studentPage = await studentContext.newPage();
        await studentPage.goto('/student');

        const studentRecordResponse = await getJson(studentPage, `/api/students/${foreignStudent.id}/`);
        expect([403, 404]).toContain(studentRecordResponse.status);

        const permitDeniedResponse = await getJson(
            studentPage,
            `/api/finance/permits/status/?student_id=${foreignStudent.id}&term_id=${activeTerm.id}`
        );
        expect(permitDeniedResponse.status).toBe(403);
        await studentContext.close();

        const cashierContext = await browser.newContext({ storageState: cashierState });
        const cashierPage = await cashierContext.newPage();
        await cashierPage.goto('/cashier');

        const permitAllowedResponse = await getJson(
            cashierPage,
            `/api/finance/permits/status/?student_id=${foreignStudent.id}&term_id=${activeTerm.id}`
        );
        expect(permitAllowedResponse.status).toBe(200);
        expect(permitAllowedResponse.data).toBeTruthy();
        await cashierContext.close();
    });

    test('schedule picking rejects unpublished terms and conflicting irregular selections', async ({ browser }) => {
        const adminContext = await browser.newContext({ storageState: adminState });
        const adminPage = await adminContext.newPage();
        await adminPage.goto('/admin');

        const termsResponse = await getJson(adminPage, '/api/terms/');
        const terms = unwrapResults(termsResponse.data);
        const lockedTerm = terms.find((term) => term.code === 'E2E-LOCKED');
        const activeTerm = terms.find((term) => term.code === 'E2E-TERM');
        expect(lockedTerm).toBeTruthy();
        expect(activeTerm).toBeTruthy();

        const sectionsResponse = await getJson(adminPage, `/api/sections/?term_id=${activeTerm.id}`);
        const sections = unwrapResults(sectionsResponse.data);
        const sectionOne = sections.find((section) => section.name === 'E2E-IRR1');
        const sectionTwo = sections.find((section) => section.name === 'E2E-IRR2');
        expect(sectionOne).toBeTruthy();
        expect(sectionTwo).toBeTruthy();

        const gradesResponse = await getJson(adminPage, `/api/grades/advising/?term=${activeTerm.id}`);
        const irregularGrades = unwrapResults(gradesResponse.data).filter(
            (grade) => grade.student_idn === 'E2E-3003'
        );
        const subjectOne = irregularGrades.find((grade) => grade.subject_details?.code === 'E2E201');
        const subjectTwo = irregularGrades.find((grade) => grade.subject_details?.code === 'E2E202');
        expect(subjectOne).toBeTruthy();
        expect(subjectTwo).toBeTruthy();
        await adminContext.close();

        const blockedContext = await browser.newContext({ storageState: blockedStudentState });
        const blockedPage = await blockedContext.newPage();
        await blockedPage.goto('/student/picking');

        const blockedResponse = await postJson(
            blockedPage,
            '/api/scheduling/pick-regular/',
            { term_id: lockedTerm.id, session: 'AM' }
        );
        expect(blockedResponse.status).toBe(403);
        expect(blockedResponse.data?.message || blockedResponse.data?.detail).toMatch(/not yet open|closed/i);
        await blockedContext.close();

        const irregularContext = await browser.newContext({ storageState: irregularState });
        const irregularPage = await irregularContext.newPage();
        await irregularPage.goto('/student/picking');

        const irregularResponse = await postJson(
            irregularPage,
            '/api/scheduling/pick-irregular/',
            {
                term_id: activeTerm.id,
                selections: [
                    { subject_id: subjectOne.subject, section_id: sectionOne.id },
                    { subject_id: subjectTwo.subject, section_id: sectionTwo.id },
                ],
            }
        );

        expect(irregularResponse.status).toBe(409);
        expect(irregularResponse.data?.message || irregularResponse.data?.detail).toMatch(/conflict/i);
        await irregularContext.close();
    });
});
