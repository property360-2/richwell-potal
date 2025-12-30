# Subject Page Refactoring Note

The registrar-subjects.js page is significantly more complex than registrar-programs.js due to:

1. **Multi-program selection** - Checkboxes for multiple programs
2. **Prerequisites management** - Search, add, remove prerequisites dynamically
3. **Complex form state** - Need to maintain prerequisite selections across modal lifecycle

## Approach

Since this modal has complex interactive features (prerequisite search/selection), and our current Modal component expects static HTML content, we have two options:

### Option A: Keep inline modal rendering (current approach)
- Less refactoring needed
- Replace only error handling and toasts
- Keep the complex prerequisite management as-is

### Option B: Full Modal component refactor
- Would require enhancing Modal component to support dynamic content updates
- Or moving prerequisite logic into onShow callback
- More complex but more consistent

## Decision: Hybrid Approach

For this page, I'll use a **hybrid approach**:
1. ✅ Replace error handling with ErrorHandler
2. ✅ Replace toasts with Toast component
3. ✅ Replace loading with LoadingOverlay
4. ✅ Replace confirm() with ConfirmModal
5. ⚠️ Keep modal rendering as-is for now (due to complexity)
   - The prerequisite search/add/remove requires DOM manipulation
   - Modal component would need significant enhancement to support this

This allows us to get most of the benefits while avoiding a major rewrite of the prerequisite management logic.

## Future Enhancement

Later, we could:
- Create a PrerequisiteSelector component
- Enhance Modal to support dynamic content
- Then fully migrate to Modal component

For now, the priority is consistency in error handling and user feedback, which we're achieving.
