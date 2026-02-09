# Design: Advanced Enrollment & Sectioning System

## 1. Permission Architecture (Duo-Layer)

The system utilizes a two-tier verification process for all actions.

### Layer 1: Role-Based (RBAC)
Hardcoded defaults for 8 user roles (Admin, Registrar, Professor, etc.).
- **Example**: Only `ADMIN` can access `SystemConfig`.

### Layer 2: Fine-Grained Overrides (ABAC-lite)
User-specific grants or revokes with optional JSON scopes.
- **Model**: `UserPermission`
- **Fields**:
  - `user`: ForeignKey(User)
  - `permission`: ForeignKey(Permission)
  - `granted`: Boolean (True=Grant, False=Revoke)
  - `scope`: JSON (e.g., `{"permitted_roles": ["STUDENT"], "can_view_audit": true}`)

---

## 2. ML-Driven Sectioning (Returning Students)

Preserving the "Social Fabric" of the classroom increases student success and retention.

### ML Workflow
1. **Historical Feature Extraction**:
   - `classmate_frequency_matrix`: Tracks how many subjects students shared in the past.
   - `vibe_score`: Calculated based on grade proximity and shared sections.
2. **Model**: Logistic Regression / Logistic Grouping.
   - **Input**: Current student list, previous section ID, and the top 5 most frequent classmates currently enrolling.
   - **Output**: Probability mapping to available sections.
3. **Execution**:
   - The system groups students into "Cohorts" before sectioning.
   - Sections are filled by entire Cohorts where possible.

---

## 3. Sectioning Algorithms

### Freshmen: Queue-Based FCFS
- **Logic**: Simple sequential filling.
- **Queue**: `Enrollment.created_at`.
- **Overflow**: When `Section.enrolled_count >= Section.capacity`, the pointer moves to the next alphabetical section (e.g., A -> B).

### Section Rebalancing ("Saka nakikita mong kulang" 😎)
The system runs a nightly check for **underfilled sections** (defined as `< 30%` capacity after enrollment period closes).
- **Consolidation**: If two sections of the same year/program are both < 50% full, the system prompts the Registrar to **Dissolve & Merge**.
- **Automatic Fill**: The system identifies "Singletons" (students with low Social Closeness scores to their current section) and re-assigns them to underfilled sections to optimize faculty loading.

---

## 4. Administrative Dashboard Alerts

| Alert Type | Threshold | Action |
| :--- | :--- | :--- |
| **Section Full** | > 95% Capacity | Request new section creation |
| **Underfilled** | < 30% Capacity | Trigger "Saka nakikita mong kulang" rebalance |
| **Audit Spike** | > 100 logs/hour | Flag for potential unauthorized access |
| **Irregular Conflict** | Overlap detected | Notify Registrar for manual scheduling |

---

## 5. Proposed Data Structures

### User Specific Permission (Enhanced)
```json
{
  "permission_code": "user.crud",
  "granted": true,
  "scope": {
    "roles": ["REGISTRAR", "STUDENT"],
    "read_only": false
  }
}
```

### ML Feature Vector
```json
{
  "student_id": "UUID",
  "top_3_classmates": ["UUID_1", "UUID_2", "UUID_3"],
  "last_section": "BSIT-2A",
  "is_irregular": false
}
```
