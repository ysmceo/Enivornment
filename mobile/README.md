# Mobile App (Expo)

This folder contains a React Native mobile app that mirrors the main website feature set:

- Auth: landing, login, register, profile bootstrap
- User: dashboard, emergency directory, SOS, live streams, news + reader
- Admin: dashboard, reports, users, verification, analytics, live monitor

## Setup

1. Copy `.env.example` to `.env` in this folder.
2. Set `EXPO_PUBLIC_API_BASE_URL` to your backend URL.
3. Install dependencies and run Expo:
   - `npm install`
   - `npm run start`

## Notes

- This scaffold is wired to your existing backend API under `/api`.
- Live stream/SOS/admin features are connected at API level and can be expanded with richer UI flows.
