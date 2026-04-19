# QA Checklist — Evidence Request & Additional Upload Flow

Last updated: 2026-04-19

Use this checklist to verify the end-to-end case evidence flow where:

- users submit multiple photos/videos,
- admins request additional evidence,
- users upload more evidence to the same case.

## Scope

This checklist covers:

- Initial multi-file report evidence upload
- Admin evidence request workflow
- User additional evidence response workflow
- Validation and edge-case behavior

---

## Preconditions

- Backend and frontend are running.
- At least one normal user account and one admin account exist.
- User can sign in and submit reports.
- Cloudinary upload configuration is valid (non-placeholder keys).

---

## A) User initial report with multiple media

1. Sign in as a normal user.
2. Go to `Citizen Dashboard`.
3. Create a new report.
4. In evidence upload, select multiple files (e.g., 2 images + 1 video).
5. Submit report.

Expected:

- Report is created successfully.
- Case ID is shown.
- New report appears in “My Submitted Reports”.
- No upload/runtime errors.

---

## B) Admin requests more evidence

1. Sign in as admin.
2. Open `Admin Reports`.
3. Locate and open the same case.
4. In **Request more evidence**, enter a clear note.
   - Example: `Please upload clearer front-angle image and short timestamped video.`
5. Click **Request Additional Evidence**.

Expected:

- Success message appears.
- No modal crash.
- Request note is saved for that report.

---

## C) User uploads additional evidence after admin request

1. Sign back in as the same user.
2. Open `Citizen Dashboard` → `My Submitted Reports`.
3. Open the same report card.
4. Confirm the admin request note is visible in the Additional Evidence section.
5. Select multiple files (images/videos).
6. Optionally add a note.
7. Click **Upload Additional Evidence**.

Expected:

- Success message appears.
- Additional evidence is accepted and attached to the same report.
- No page crash or form corruption.

---

## D) Validation checks

### D1. User submits additional evidence with no files

Steps:

- In additional evidence section, click upload without selecting files.

Expected:

- Validation message appears.
- No request is processed.

### D2. Admin sends empty evidence request

Steps:

- In admin modal, click request evidence with empty note.

Expected:

- Validation message appears.
- No request is processed.

### D3. Unsupported file type

Steps:

- Attempt to upload unsupported file extension/type.

Expected:

- Upload rejected with clear error.

### D4. File size exceeds limit

Steps:

- Attempt to upload a file larger than configured limit.

Expected:

- Upload rejected with file-size error.

---

## E) Regression checks

- Standard report submission still works.
- Existing case tracking still works.
- Admin status update flow still works.
- No build errors (`npm run build` passes).

---

## Pass criteria

Mark this release feature PASS only if all are true:

- [ ] User can submit report with multiple media files.
- [ ] Admin can request additional evidence with note.
- [ ] User can see request and upload additional multiple media files.
- [ ] Validation errors show correctly for empty/invalid submissions.
- [ ] Existing report/admin workflows are unaffected.
