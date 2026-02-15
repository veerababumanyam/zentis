# Role Simplification Design (Doctor/Patient Only)

**Date:** 2026-02-15

## Goals
- Support only two roles: **doctor** and **patient**.
- Remove any legacy **nurse/admin** accounts.
- Ensure onboarding/registration only offers Doctor/Patient.

## Scope
- Update schema/type definitions to only allow `doctor | patient`.
- Update onboarding UI to only show Doctor/Patient.
- Add defensive guardrail to treat invalid roles as missing profile.
- One-off cleanup script to delete any existing nurse/admin accounts (Auth + Firestore).

## Key Decisions
- **Deletion strategy:** Use Firebase Admin SDK to delete matching Auth users and their Firestore `users/{uid}` documents.
- **No auto-mapping:** Nurse/admin accounts are deleted, not converted.

## Cleanup Script (Admin SDK)
- Read from `users` collection in Firestore.
- Filter users where `role` is `nurse` or `admin`.
- For each match:
  - Delete Firestore user document.
  - Delete Firebase Auth user by `uid`.
- Include a **dry-run** option for safety and logging.

## UI & Runtime Guardrails
- Onboarding role picker: only Doctor/Patient.
- If a user profile exists but role is not doctor/patient, treat as invalid and re-run onboarding.

## Testing & Validation
- Dry-run cleanup script to verify no matches.
- Run cleanup script (real mode) and confirm counts.
- Manual onboarding flow for Doctor and Patient.
- Verify app behavior with missing/invalid role.

## Rollout
1. Run cleanup script once in the target environment.
2. Deploy updated frontend and schema changes.

## Risks
- Missing service account or insufficient Admin SDK permissions.
- Orphaned Auth users if Firestore roles are out-of-sync (mitigated by logging and dry-run).