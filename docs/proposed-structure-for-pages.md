# Summary of Grades – Recommended Page Structure

## 1. Student Information Header

Top section with basic info.

**Layout (card style):**

**Left**

* Student Name
* Student ID
* Program / Course
* Major (if any)

**Right**

* Year Level
* Status (**Regular / Irregular**)
* Academic Standing
* Total Units Earned

---

## 2. Quick Academic Summary

Small stats cards.

Example:

| Card               | Example |
| ------------------ | ------- |
| Total Units Earned | 84      |
| Current GPA        | 1.75    |
| Subjects Passed    | 32      |
| Subjects Failed    | 2       |

These should be **small horizontal cards**.

---

## 3. Grades Table (Main Section)

Group grades by **Academic Year + Semester**.

Example layout:

### AY 2023–2024 • 1st Semester

| Code    | Subject              | Units | Grade | Status     |
| ------- | -------------------- | ----- | ----- | ---------- |
| CS101   | Intro to Computing   | 3     | 1.50  | Passed     |
| MATH101 | Calculus 1           | 4     | 2.25  | Passed     |
| ENG101  | Communication Skills | 3     | INC   | Incomplete |

Semester summary below:

**Units:** 10
**GPA:** 1.92

---

### AY 2023–2024 • 2nd Semester

Same table format.

---

## 4. Status Indicators (Very Important)

Use **color badges**.

| Status  | Color  |
| ------- | ------ |
| Passed  | Green  |
| Failed  | Red    |
| INC     | Orange |
| Dropped | Gray   |

This makes scanning grades **very fast**.

---

## 5. Filters (Optional but very useful)

Top right of table:

* Filter by **Academic Year**
* Filter by **Semester**
* Search **Subject Code / Name**

---

## 6. Actions (Top Right)

Buttons like:

* **Download TOR (PDF)**
* **Print**
* **View Curriculum Progress**

---

# Simple Visual Layout

```
------------------------------------------------
Student Info Card
------------------------------------------------
Name | Program | Year Level | Status

------------------------------------------------
Academic Summary Cards
------------------------------------------------
Units | GPA | Passed | Failed

------------------------------------------------
Summary of Grades
------------------------------------------------

AY 2023-2024 | 1st Sem
-------------------------------------------
Code | Subject | Units | Grade | Status
-------------------------------------------
CS101 | Intro to Computing | 3 | 1.50 | Passed

Semester GPA: 1.75

-------------------------------------------

AY 2023-2024 | 2nd Sem
(same structure)
```

---

# UI Design Tips

✔ Use **collapsible semesters**
✔ Keep **tables clean**
✔ Avoid too many colors
✔ Use **sticky table headers**

---

# Bonus (Very Recommended Feature)

Add **Curriculum Progress Tracker**:

```
Year 1  ██████████ 100%
Year 2  ███████░░░ 70%
Year 3  ███░░░░░░░ 30%
Year 4  ░░░░░░░░░░ 0%
```

Students instantly see **how far they are from graduating**.

---