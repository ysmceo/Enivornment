# VOV CRIME Branding Snapshot

Last updated: 2026-04-19

This document is a quick release-QA checklist for verifying that **VOV CRIME** branding appears consistently across web, mobile, and project metadata.

## Web app UI placements

- `frontend/src/components/Navbar.jsx:72`  
  Global top nav brand: **VOV CRIME**

- `frontend/src/components/AdminSidebar.jsx:41`  
  Admin sidebar brand: **VOV CRIME**

- `frontend/src/pages/Landing.jsx:191`  
  Landing header logo text: **VOV CRIME**

- `frontend/src/pages/Landing.jsx:420`  
  Testimonials heading mentions: **VOV CRIME**

- `frontend/src/pages/Landing.jsx:442`  
  Footer brand title: **VOV CRIME**

- `frontend/src/pages/Landing.jsx:471`  
  Footer copyright: **© 2026 VOV CRIME**

- `frontend/src/pages/Landing.jsx:104`  
  About mission copy starts with: **VOV CRIME is...**

- `frontend/src/pages/LiveHomePage.jsx:26`  
  Live streams top header brand: **VOV CRIME LIVE**

- `frontend/src/pages/Preview.jsx:163`  
  Preview page logo alt text: **VOV CRIME Logo**

- `frontend/src/pages/Preview.jsx:165`  
  Preview page top brand text: **VOV CRIME**

- `frontend/src/pages/Preview.jsx:64`  
  Live stream preview description includes **VOV CRIME**

- `frontend/src/pages/Preview.jsx:116`  
  Admin live preview description includes **VOV CRIME**

## Mobile UI placement

- `mobile/src/screens/auth/LandingScreen.js:8`  
  Landing screen title: **VOV CRIME**

## Metadata / app identity

- `frontend/index.html:6`  
  `<title>VOV CRIME</title>`

- `frontend/index.html:7`  
  Meta description starts with **VOV CRIME**

- `mobile/app.json:3`  
  `"name": "VOV CRIME"`

- `mobile/app.json:4`  
  `"slug": "vov-crime"`

- `README.md:1`  
  `# VOV CRIME Workspace`

## Quick QA checks before release

- [ ] Web header/footer branding renders as `VOV CRIME` in light/dark themes.
- [ ] Admin sidebar and top navigation show `VOV CRIME`.
- [ ] Live page header shows `VOV CRIME LIVE`.
- [ ] Mobile landing title shows `VOV CRIME`.
- [ ] Browser tab title is `VOV CRIME`.
- [ ] No old brand strings (e.g., `TRUE HERO CRIME REPORT`, `TRUE CRIME HOOD`) remain in source.
