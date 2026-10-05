# AI-Powered Blood Donation & Emergency Response Platform

Capstone project. Autonomous agent that matches, notifies and escalates emergency blood requests.

## Stack
Next.js (App Router) + TypeScript + Tailwind CSS, MongoDB Atlas, NextAuth.js, Google Gemini API, node-cron, Nodemailer / Telegram Bot.

## Getting started
```
git clone <repo-url>
cd blood-donation-platform
npm install
cp .env.example .env     # then fill in your own values
npm run dev
```

## Folder guide
- `src/app`        pages and API routes
- `src/components` reusable UI
- `src/models`     MongoDB (Mongoose) schemas
- `src/lib`        pure helper functions (compatibility, eligibility, distance, ranking)
- `src/agents`     matching engine and autonomous escalation / reminder agents
- `src/services`   email, Telegram, Gemini wrappers
- `docs`           specs and task list

See `CONTRIBUTING.md` before you push anything.
