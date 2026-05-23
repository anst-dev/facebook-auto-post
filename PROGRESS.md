# Web Dashboard - Progress Report

## Branch: feat/web-dashboard

## Commits

### Commit 1: `2ed8b6d` — feat: add web dashboard with Express + EJS
- Created Express server (`src/server.js`) with 4 page routes + POST actions
- Created CSS (`public/css/style.css`) — sidebar layout, cards, tables, badges
- Created 5 EJS templates: layout, dashboard, posts, comments, content
- Installed dependencies: express, ejs

## E2E Test Results

| Test | Result |
|---|---|
| GET / (Dashboard) | 200 OK |
| GET /posts | 200 OK |
| GET /comments | 200 OK |
| GET /content | 200 OK |
| GET /css/style.css | 200 OK |
| POST /comments/toggle | 302 Redirect |
| POST /comments/reset | 302 Redirect |
| POST /comments/start | 302 Redirect |
| POST /comments/stop | 302 Redirect |
| Dashboard shows 8 stat cards | PASS |
| Sidebar menu rendered | PASS |
| Content tree shows 88 items | PASS |
| Comment keywords displayed (2) | PASS |
| Toggle enabled/disabled | PASS |

## Pages

### Dashboard (/)
- 8 stat cards: posts published, pending, replies, DMs, keywords, polling status, DM failed, last poll
- Recent logs table (merged post + comment logs)

### Posts (/posts)
- Table with post history from post-log.json

### Comment Reply (/comments)
- Keyword config with expand/collapse details
- Toggle enable/disable button
- Start/Stop/Reset polling buttons
- Stats cards
- Comment log table

### Content (/content)
- Stats: total, completed, pending
- Tree view of content/ directory with status badges (San sang / Da dang / Trong)

## Files Created
- `src/server.js` — Express server
- `views/layout.ejs` — Sidebar + content layout
- `views/dashboard.ejs` — Dashboard page
- `views/posts.ejs` — Posts page
- `views/comments.ejs` — Comments page
- `views/content.ejs` — Content page
- `public/css/style.css` — Styles
