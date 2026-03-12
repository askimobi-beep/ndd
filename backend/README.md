# Backend (MERN API)

Express + MongoDB backend for the portal project.

## Quick Start

1. Install dependencies:
   npm install
2. Update environment values in .env
3. Run dev server:
   npm run dev

## Scripts

- npm run dev: Run with nodemon
- npm start: Run in production mode
- npm run seed:admin: Create or update admin user from .env values

## API Base URL

http://localhost:5000

## Main Endpoints

- GET / : Health message
- POST /api/auth/register : Register user
- POST /api/auth/login : Login user
- POST /api/auth/forgot-password : Send reset link to email
- POST /api/auth/reset-password/:token : Reset password using token
- PATCH /api/auth/change-password : Change password for logged-in user
- GET /api/auth/me : Get current user (Bearer token)
- POST /api/users : Create user (ADMIN or SUPERVISOR)
- GET /api/users : List users (ADMIN or SUPERVISOR)
- GET /api/users/:id : Get user by id
- PATCH /api/users/:id/status : Update user active status

## Email Setup

Set SMTP values in .env before using forgot-password:

- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- MAIL_FROM

Or use NODE_MAILER values:

- NODE_MAILER_USER
- NODE_MAILER_PASSWORD
- NODE_MAILER_FROM_MAIL

## Default Roles

- ADMIN
- SUPERVISOR
- TICKET CHECKER
- AGENT
