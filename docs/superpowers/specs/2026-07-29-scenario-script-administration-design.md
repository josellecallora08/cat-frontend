# Scenario Script Administration Design

## Goal

Move document upload and script management out of the primary training navigation and into the scenario context, while keeping all controls administrator-only and preserving backend script behavior for normal agents.

## Navigation

- Remove `Scripts` and `Uploads` from the main navigation.
- Add an administrator-only `Scripts` entry to the account dropdown.
- Keep Users, Agents, and Campaigns in the administrator portion of the main navigation.

## Scenario workflow

- Every scenario detail page shows the normal `Start call` action to authorized training users.
- Administrators additionally see a secondary `Upload script` action when the scenario has no script.
- When a script exists, the action reads `Manage script`.
- The action opens a modal on the scenario page.
- The upload modal fixes the scenario assignment to the current scenario and does not show a scenario selector.
- Successful upload continues through scanning, extraction, conversion, and draft creation.
- Existing scripts expose review/edit and publish/unpublish management actions.

## Authorization

- Frontend role checks hide administrative navigation and controls from non-admin users.
- Script and upload API endpoints remain protected by existing backend administrator dependencies.
- Training session creation remains unchanged. Normal users' sessions continue to load the scenario's published ScriptVersion from the backend.

## Accessibility and responsive behavior

- Modal focus is trapped by the existing dialog component.
- Controls have visible labels, focus rings, and screen-reader status messages.
- The action rail remains stacked and full-width on narrow screens.

## Testing

- Navigation tests verify Scripts/Uploads are absent from the main navigation and Scripts appears only in the admin account menu.
- Scenario tests verify upload/manage controls appear only for administrators.
- Upload-panel tests verify a fixed scenario is submitted without displaying a scenario selector.

