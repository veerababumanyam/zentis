# Role Simplification (Doctor/Patient Only) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove nurse/admin roles, restrict onboarding to doctor/patient, and delete any legacy nurse/admin accounts via Admin SDK.

**Architecture:** Enforce role constraints in schema/types/UI; add runtime guardrail for invalid roles; provide a one-off Admin SDK cleanup script with dry-run support.

**Tech Stack:** React 19 + Vite 6 + Firebase (Auth + Firestore) + TypeScript

---

### Task 1: Create worktree (recommended)

**Files:**
- Create: (worktree directory)

**Step 1: Create a worktree**
Run: `git worktree add ../Zentis-role-cleanup -b role-cleanup`
Expected: New worktree directory created.

**Step 2: Switch to worktree**
Run: `cd ../Zentis-role-cleanup`
Expected: Working directory changes to new worktree.

**Step 3: Commit (no code changes yet)**
Run: `git status`
Expected: Clean working tree.

---

### Task 2: Add a small role validation helper with tests

**Files:**
- Create: `src/utils/roleValidation.ts`
- Create: `tests/roleValidation.test.ts`
- Modify: `package.json` (add test script + devDependency)

**Step 1: Add test runner dependency**
Edit `package.json`:
- Add `vitest` to `devDependencies`.
- Add script: `"test": "vitest run"`.

**Step 2: Write failing test**
Create `tests/roleValidation.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { isValidUserRole } from '../src/utils/roleValidation';

describe('isValidUserRole', () => {
  it('accepts doctor/patient', () => {
    expect(isValidUserRole('doctor')).toBe(true);
    expect(isValidUserRole('patient')).toBe(true);
  });

  it('rejects nurse/admin/unknown', () => {
    expect(isValidUserRole('nurse')).toBe(false);
    expect(isValidUserRole('admin')).toBe(false);
    expect(isValidUserRole('other')).toBe(false);
  });
});
```

**Step 3: Run tests (expect fail)**
Run: `npm run test`
Expected: FAIL (module not found).

**Step 4: Write minimal implementation**
Create `src/utils/roleValidation.ts`:
```ts
import type { UserRole } from '../types';

const VALID_ROLES: UserRole[] = ['doctor', 'patient'];

export const isValidUserRole = (role: string | null | undefined): role is UserRole =>
  typeof role === 'string' && VALID_ROLES.includes(role as UserRole);
```

**Step 5: Run tests (expect pass)**
Run: `npm run test`
Expected: PASS.

**Step 6: Commit**
Run:
```
git add package.json tests/roleValidation.test.ts src/utils/roleValidation.ts

git commit -m "test: add role validation helper"
```

---

### Task 3: Update role types and schema references

**Files:**
- Modify: `src/types.ts`
- Modify: `src/services/databaseSchema.ts`
- Modify: `dataconnect/schema/schema.gql`

**Step 1: Write failing test (type check)**
Run: `npm run build`
Expected: FAIL only if types mismatch (baseline check).

**Step 2: Update role union**
Change `UserRole` to `export type UserRole = 'doctor' | 'patient';`.

**Step 3: Update database schema role type**
Update role union in `src/services/databaseSchema.ts` to only `doctor | patient`.

**Step 4: Update schema comments**
Update role comment in `dataconnect/schema/schema.gql` to:
`role: String! # 'doctor' | 'patient'`

**Step 5: Run build**
Run: `npm run build`
Expected: PASS.

**Step 6: Commit**
Run:
```
git add src/types.ts src/services/databaseSchema.ts dataconnect/schema/schema.gql

git commit -m "chore: restrict roles to doctor/patient"
```

---

### Task 4: Update onboarding role selection

**Files:**
- Modify: `src/components/OnboardingPage.tsx`

**Step 1: Write failing test (manual)**
Expected: UI still shows nurse/admin.

**Step 2: Update role options**
Replace the role list with `['doctor', 'patient']` only.

**Step 3: Manual check**
Run: `npm run dev` and confirm only Doctor/Patient appear.

**Step 4: Commit**
Run:
```
git add src/components/OnboardingPage.tsx

git commit -m "ui: remove nurse/admin from onboarding"
```

---

### Task 5: Add runtime guardrail for invalid roles

**Files:**
- Modify: `src/contexts/AuthContext.tsx`
- Modify: `src/App.tsx` (if needed)

**Step 1: Write failing test (manual)**
Expected: invalid role still enters app.

**Step 2: Implement guard**
In `AuthContext`, after loading profile, if role is invalid (use `isValidUserRole`) then set `userProfile` to `null`.

**Step 3: Manual check**
Simulate an invalid role in Firestore and verify user is forced to onboarding.

**Step 4: Commit**
Run:
```
git add src/contexts/AuthContext.tsx src/App.tsx

git commit -m "guard: force onboarding for invalid roles"
```

---

### Task 6: Add Admin SDK cleanup script (Auth + Firestore)

**Files:**
- Create: `scripts/cleanup-legacy-roles.mjs`
- Modify: `package.json` (script entry, dependency)
- Create (if missing): `.env` (placeholder)

**Step 1: Add dependency**
Add `firebase-admin` to `dependencies` (or `devDependencies`).

**Step 2: Create script**
`cleanup-legacy-roles.mjs` should:
- Read service account JSON path from `FIREBASE_SERVICE_ACCOUNT_JSON`.
- Initialize Admin SDK.
- Scan Firestore `users` collection for `role in ['nurse','admin']`.
- Dry-run default; only delete when `--apply` provided.
- For each match: delete Firestore doc + delete Auth user.
- Log counts and user IDs.

**Step 3: Add npm script**
Add: `"cleanup:roles": "node scripts/cleanup-legacy-roles.mjs"`.

**Step 4: Create .env placeholder if missing**
Add `FIREBASE_SERVICE_ACCOUNT_JSON="/path/to/service-account.json"`.

**Step 5: Run dry-run**
Run: `npm run cleanup:roles -- --dry-run`
Expected: Logs zero deletions (new setup).

**Step 6: Commit**
Run:
```
git add scripts/cleanup-legacy-roles.mjs package.json .env

git commit -m "tools: add legacy role cleanup script"
```

---

### Task 7: Final verification

**Step 1: Run tests**
Run: `npm run test`
Expected: PASS.

**Step 2: Build**
Run: `npm run build`
Expected: PASS.

**Step 3: Optional cleanup apply**
Run: `npm run cleanup:roles -- --apply`
Expected: Logs zero deletions.

**Step 4: Commit final changes**
Run: `git status`
Expected: Clean working tree.

---

**Plan complete and saved to** `docs/plans/2026-02-15-role-simplification-plan.md`.

Two execution options:
1. **Subagent-Driven (this session)** — I dispatch a fresh subagent per task and review between tasks.
2. **Parallel Session (separate)** — Open a new session that runs the plan with executing-plans.

Which approach do you want?
