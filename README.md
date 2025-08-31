# Muscle Match (Final+)

Full version with:
- Search exercises by muscle (SQLite)
- User accounts (register/login/logout)
- Personal workouts CRUD (add exercises with sets/reps/weight)
- External API proxy to wger (`/api/external/wger?muscle=Chest`)
- Security: Helmet, CSRF for forms, bcrypt hashing, validation via Joi

## Quick start
```bash
npm install
cp .env.example .env   # optional
npm run dev            # or: npm start
# http://localhost:3000
```