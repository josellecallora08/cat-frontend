# Scenario Script Administration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put administrator script upload and management on scenario detail pages and move Scripts into the administrator account menu.

**Architecture:** Navigation visibility remains role-driven in `NavigationShell`. A focused scenario-script dialog composes the existing upload panel with script registry API actions; the panel accepts a fixed scenario ID so conversion uses the current scenario. Backend authorization and session ScriptVersion loading remain unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Radix Dialog, Vitest, Testing Library.

## Global Constraints

- Only administrators may see upload or script-management controls.
- Backend administrator authorization remains the security boundary.
- Normal-user sessions must continue using published scripts without exposing administration controls.
- All new controls must be keyboard accessible and responsive.

---

### Task 1: Navigation placement

**Files:**
- Modify: `src/components/navigation-shell.tsx`
- Test: `src/components/navigation-shell.test.tsx`

**Interfaces:**
- Consumes: `useAuthStore().user.role`
- Produces: administrator-only account-menu link to `/admin/scripts`

- [ ] Write tests asserting Scripts and Uploads are absent from main navigation and Scripts is present only in the administrator account menu.
- [ ] Run the test and verify it fails because the current main navigation includes both items.
- [ ] Remove both main-nav items and add the admin-only account-menu link.
- [ ] Run the test and verify it passes.

### Task 2: Fixed-scenario upload panel

**Files:**
- Modify: `src/components/admin/script-upload-panel.tsx`
- Modify: `src/components/admin/script-upload-panel.test.tsx`

**Interfaces:**
- Produces: `ScriptUploadPanel({ scenarioId?, scenarioName?, onScriptCreated? })`

- [ ] Add a test that renders with a fixed scenario and asserts the selector is absent and scenario context is shown.
- [ ] Run the test and verify it fails.
- [ ] Implement fixed-scenario initialization and callback behavior.
- [ ] Run the upload-panel tests and verify they pass.

### Task 3: Scenario script modal

**Files:**
- Create: `src/components/admin/scenario-script-dialog.tsx`
- Create: `src/components/admin/scenario-script-dialog.test.tsx`
- Modify: `src/app/scenarios/[id]/page.tsx`

**Interfaces:**
- Consumes: `scenarioId`, `scenarioName`, administrator token
- Produces: `Upload script` or `Manage script` modal trigger and management actions

- [ ] Write role-visibility and modal-state tests.
- [ ] Run the tests and verify they fail because the component does not exist.
- [ ] Implement script lookup, upload modal, review link, and publish/unpublish actions.
- [ ] Render the component only when `user.role === "admin"`.
- [ ] Run the tests and verify they pass.

### Task 4: Route and regression verification

**Files:**
- Modify if needed: `src/app/admin/scripts/page.tsx`

- [ ] Remove or replace upload navigation that bypasses scenario context.
- [ ] Run targeted ESLint.
- [ ] Run the complete Vitest suite.
- [ ] Run the production build.
- [ ] Manually verify admin and normal-user navigation and scenario detail states.

