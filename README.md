# My Product Monorepo

This repository contains the full stack for my new product.

## Structure
- `/mobile` - React Native (Expo) frontend application
- `/server` - Node.js (Express) backend API
- `/docs` - Product documentation, design specs, and PRD
- `/.agents` - AI Agent instructions, skills, and configuration

## Getting Started

### 1. Mobile App
```bash
cd mobile
npm install
npx expo start
```

### 2. Backend Server
```bash
cd server
npm install
npm run dev
```

## AI Agent Development
When prompting Antigravity, agents will automatically read instructions from `docs/` and `.agents/skills/` to ensure they follow your strict architectural constraints and design aesthetics.
