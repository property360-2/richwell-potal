# Richwell Portal — Test Accounts

All test accounts use the default password: **`password123`**

To reset all data, run:
```bash
python manage.py seed_complete
```
Documents
---

## 🛡️ Admin & Staff Accounts

| Role | Email | Access |
|---|---|---|
| **System Admin** | `admin@richwell.edu` | Full system access |
| **Registrar** | `registrar@richwell.edu` | Manage enrollments & grade resolutions |
| **Cashier** | `cashier@richwell.edu` | Manage payments & fees |
| **Admission** | `test-admission@gmail.com` | Manage applicants & new students |
| **Department Head** | `head@richwell.edu` | Approve grade resolutions |

---

## 👨‍🏫 Professor Accounts

| Name | Email |
|---|---|
| Maria Santos | `prof1@richwell.edu` |
| Juan Dela Cruz | `prof2@richwell.edu` |
| Jose Rizal | `prof3@richwell.edu` |
| Andres Bonifacio | `prof4@richwell.edu` |
| Emilio Aguinaldo | `prof5@richwell.edu` |

> [!TIP]
> Login as **`prof1@richwell.edu`** to see the INC record and test the Grade Resolution flow.

---

## 🎒 Demo Student Accounts

| Name | Email | Status |
|---|---|---|
| Thirdy Passed | `studentpassed@richwell.edu` | All subjects passed (Y1S1 → Y2S2) |
| Carlo dela Cruz | `studentinc@richwell.edu` | **Has active INC grade** — Subject: `CC223`, Professor: `prof1@richwell.edu` |

> [!NOTE]
> Both students are 3rd-year **BS Information Systems** with complete grade histories.

---

## 🔄 INC Resolution Demo Flow

1. Login as **`prof1@richwell.edu`**
2. Go to **Grade Resolution** in the top nav
3. Find **Carlo dela Cruz** (CC223)
4. Click **Resolve** → Select a passing grade → Submit
5. Login as **`head@richwell.edu`** → Approve resolution
6. Login as **`registrar@richwell.edu`** → Finalize

---

## 🏫 Curriculum Data

Seeded from `documentation/curriculum.csv`:
- **8 Programs** (BSIS, Nursing, Criminology, etc.)
- **457 Subjects**
- **215 Active Section-Subject assignments**
- **150 Schedule slots** (conflict-free)

> ⚠️ When a new student registers via the frontend, they remain as "Applicant" until approved by Admission/Admin.
