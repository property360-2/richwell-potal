# Verification Checklist

## [ ] Grade Resolution Visibility
- [ ] **Professor Role**: Check "Resolution Progress" in grading roster. Verify signatures (names/dates) appear on hover.
- [ ] **Student Role**: Check "Academic Record". Verify the multi-stage tracker shows who approved each step.
- [ ] **Registrar/Head**: Verify detailed tracking is visible in the Resolutions hub.

## [ ] Faculty Roster Enhancements
- [ ] **Admin/Head Role**: View a Professor in the roster.
- [ ] **Verification**: Verify that "Active Term Assignments" is now displayed as a **simple table** instead of cards.
- [ ] **Verification**: Table should show Subject Code, Title, and Section.
## [ ] Master Catalog & Subject Creation
- [ ] **Subjects Tab**: Verify the "Master Catalog" list loads without crashing (Fixes `setSubjects` ReferenceError).
- [ ] **Add Subject**: Try creating a duplicate subject code. Verify the toast error message says "Subject code must be globally unique" instead of a generic error.

## [ ] Schedule Slot Management
- [ ] **Real-time Checks**: Open the Weekly Planner for any section. Open a slot modal. Change the Day/Time.
- [ ] **Verification**: Verify the Professor dropdown now shows "BUSY" or "AVAILABLE" next to each name based on the selected time.
- [ ] **Conflict Reporting**: Intentionally try to save a slot that conflicts with another (e.g., same professor, same time).
- [ ] **Verification**: Verify the error toast now shows the specific conflict reason (e.g., "Professor [Name] is already scheduled...") instead of "Failed to save schedule".