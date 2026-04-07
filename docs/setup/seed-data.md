# Setup: Seed Data Reference

## Overview

The Richwell Portal comes with multiple seeders for populating different development and testing
scenarios. Run them from the `backend/` directory using `python manage.py <command>`.

> **Default Password Pattern for Students:**  
> `{IDN}{MMDD_of_DOB}` — e.g., IDN `270001`, DOB `Feb 2 2005` → password `2700010202`

> **Default Password for Staff:**  
> `password123`

---

## Seeders

### `seed_applicants`

**Scenario:** Admission pipeline — tests the full applicant → admit → reject flow.

```bash
python manage.py seed_applicants
```

Use this to test:
- Public application form
- Registrar admission review
- Applicant status management

---

### `seed_advising`

**Scenario:** Enrolled students ready for advising, section generation, and scheduling.

```bash
python manage.py seed_advising
```

**Creates:**
| Resource | Count | Notes |
|---|---|---|
| Students (`ENROLLED`, advising `APPROVED`) | 150 | Mixed programs |
| Professors | 8 | Assigned to Y1S1 subjects with varied availability |
| Rooms | 10 | Various types, max 40 capacity |
| Active Term | 1 | Code: `2026-1` |
| Staff users | Standard set | Admin, Registrar, Cashier, etc. |

**Use this for:** Manual testing of Section Generation and Schedule Picking.

**Student Login Credentials (First 5):**

| IDN | Password | Formula |
|---|---|---|
| `270001` | `2700010202` | DOB: 2005-02-02 |
| `270002` | `2700020303` | DOB: 2005-03-03 |
| `270003` | `2700030404` | DOB: 2005-04-04 |

**Professor Login Credentials:**

| Username | Password | Formula |
|---|---|---|
| `prof1` | `EMP0010101` | DOB: 1985-01-01 |
| `prof2` | `EMP0020515` | DOB: 1986-05-15 |
| `prof3` | `EMP0031020` | DOB: 1987-10-20 |
| `prof4` | `EMP0040210` | DOB: 1988-02-10 |
| `prof5` | `EMP0050320` | DOB: 1989-03-20 |

---

### `seed_grade_submission`

**Scenario:** Grade submission and INC Resolution testing.

```bash
python manage.py seed_grade_submission
```

**Creates:**
| Resource | Count | Notes |
|---|---|---|
| Students in current term | 40 | Ready for grading |
| Students in past term | 20 | Distributed across INC resolution stages |

**Specific Test Scenarios:**

| Credential | Password | Scenario |
|---|---|---|
| **Professor `prof1`** | `EMP0010101` | Can click "Resolve INC" for Student 270041 (status: `READY`) |
| **Professor `prof1`** | `EMP0010101` | Tracking resolution for Student 270051 (status: `REQUESTED`) |
| **Professor `prof2`** | `EMP0020515` | Completed resolution for Student 270060 (status: `COMPLETED`) |

**Student INC Scenarios:**

| IDN | Password | Scenario |
|---|---|---|
| `270041` | `2700410614` | Has INC — Subject: IS123 |
| `270042` | `2700420715` | Has INC — Subject: CC123 |
| `270043` | `2700430816` | Has INC — Subject: Eng 123 |
| `270044` | `2700440917` | Has INC — Subject: Hum123 |
| `270045` | `2700451018` | Has INC — Subject: Fil 123 |
| `270051` | `2700510424` | Tracking pending resolution in SOG |
| `270052` | `2700520525` | Has INC — Subject: Eng 123 |
| `270053` | `2700530626` | Has INC — Subject: Hum123 |
| `270057` | `2700571002` | Has INC — Subject: NSTP2 |
| `270058` | `2700581103` | Has INC — Subject: PATH Fit 2 |
| `270060` | `2700600105` | Viewing finished approval chain in SOG |

**Staff Scenarios:**

| Username | Password | Scenario |
|---|---|---|
| `registrar` | `password123` | Approving resolution requests |
| `programhead` | `password123` | Finalizing submitted resolutions |

---

### `seed_grading`

**Scenario:** Finalize grades workflow — Registrar grade lock and finalization.

```bash
python manage.py seed_grading
```

---

### `seed_full_cycle`

**Scenario:** Complete end-to-end lifecycle with 100 students (all stages from application to grade finalization).

```bash
python manage.py seed_full_cycle
```

> ⚠️ This seeder takes significantly longer to run. Reserve it for full system integration tests.

---

## Standard Staff Credentials

These accounts are created by most seeders:

| Username | Password | Role |
|---|---|---|
| `admin` | `password123` | Admin |
| `registrar` | `password123` | Registrar |
| `cashier` | `password123` | Cashier |
| `programhead` | `password123` | Program Head |
| `dean` | `password123` | Dean |

---

## Resetting the Database

To start fresh for a clean seed run:

```bash
# Drop and recreate SQLite (development)
rm backend/db.sqlite3
python manage.py migrate
python manage.py seed_advising    # or whichever scenario you need
```
