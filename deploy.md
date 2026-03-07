# Deploy Runbook (Render)

## Backend Service

1. Push latest code to the branch connected to Render.
2. Open Render dashboard -> `neuronest-backend` -> **Manual Deploy** (or wait for auto-deploy).
3. Confirm runtime settings:
   - Start command points to backend app entrypoint.
   - Environment variables are set (`DATABASE_URL`, JWT/email/SMS keys, CORS settings).
4. Watch **Events** and **Logs** until service is `Live`.

## Quick Verification

1. Open service root URL and confirm health JSON response.
2. Test one authenticated API route.
3. Verify Socket.IO connection from frontend (if applicable).
4. Confirm scheduler startup does not crash app boot.

## Known Failure: `ImportError: NotificationLog`

If deploy fails with:

`ImportError: cannot import name 'NotificationLog' from 'database.models'`

Use this fix:

- File: `backend/services/scheduler_service.py`
- Remove `NotificationLog` from imports.
- Ensure SMS uses `doctor.doctor_profile.phone` (not `doctor.phone_number`).

This was already fixed in current workspace changes.

## Rollback

1. In Render -> service -> **Events** -> choose last healthy deploy.
2. Click **Rollback**.
3. Re-run verification steps above.

