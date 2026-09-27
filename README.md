# 🏥 MyDoctor's — Professional Medical Platform

## Project Overview
**MyDoctor's** is a full-stack healthcare web application that connects patients with doctors through an AI-powered symptom analysis engine, interactive body diagram, nearby medical services finder, and online appointment booking system.

---

## 🌐 Live URL
**Sandbox**: https://3000-i34vcpfsnfv6yey4pxffq-5c13a017.sandbox.novita.ai

---

## ✅ Completed Features

### 👤 Dual Profile System
- **Doctor Profiles**: Full registration with specialization, qualifications, hospital info, consultation fees, availability schedules
- **Patient Profiles**: Complete health profile with medical history, blood group, allergies, medications
- **Secure Authentication**: Session-based login/logout system with password hashing
- **Profile Management**: Both doctors and patients can update their profiles

### 🤖 AI Symptom Checker
- Interactive **body diagram (SVG)** — click on any body part (Head, Chest, Abdomen, Arms, Legs, etc.)
- Type symptoms manually or select from **50+ common symptoms**
- AI analyzes symptoms and gives **disease predictions with confidence scores (0–100%)**
- **Urgency classification**: Emergency / High / Moderate / Low
- Automatically matches to the right specialist doctors
- **Disease search mode**: Type a disease name to directly find matching specialists

### 🔍 Doctor Search & Discovery
- Search by **name, specialization, hospital, disease, or city**
- Filter by specialization, location, and sort by rating/experience/fee
- **Verified doctor badges**, star ratings, consultation fees
- Detailed doctor profiles with reviews, availability calendar, diseases treated
- Specialty quick-links (Heart, Bones, Brain, Skin, Women's Health, Lungs, etc.)

### 📅 Appointment Booking
- Real-time slot booking with **date and time selection**
- Availability checks (prevents double booking)
- Unique **Appointment ID** generated for each booking
- Status tracking: Pending → Confirmed → Completed / Cancelled
- Full appointment management dashboard for both doctors and patients

### 🏥 Nearby Medical Services
- **Hospitals** with emergency status, specialties, contact info
- **Diagnostic Centres / Scan Centres** with services listed
- **Pharmacies** with 24/7 availability markers
- GPS auto-detection (browser geolocation API)
- **Google Maps directions** integration
- Direct call buttons

### 🏠 Professional Homepage
- Animated hero section with floating cards
- Real-time stats counter (10K+ doctors, 500K+ patients)
- 8-specialty quick navigation cards
- Step-by-step "How It Works" guide
- AI feature showcase
- Featured top-rated doctors grid

### 📱 Fully Responsive
- Portrait and landscape modes optimized
- Mobile hamburger menu
- Touch-friendly UI on all screen sizes
- Fluid grid layouts (1–4 columns adaptive)

---

## 📁 File Structure
```
webapp/
├── src/
│   └── index.tsx              # Full Hono backend (API + HTML shell)
├── public/
│   └── static/
│       ├── styles.css         # Professional CSS (62KB)
│       └── app.js             # Frontend JavaScript (62KB)
├── migrations/
│   └── 0001_initial.sql       # DB schema
├── seed.sql                   # 8 sample doctors + 3 patients
├── wrangler.jsonc             # Cloudflare config
├── package.json
├── ecosystem.config.cjs       # PM2 config
└── vite.config.ts
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/doctor` | Doctor registration |
| POST | `/api/auth/register/patient` | Patient registration |
| POST | `/api/auth/login` | Login (doctor/patient) |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/doctors` | List/search doctors |
| GET | `/api/doctors/:id` | Doctor profile + reviews |
| PUT | `/api/doctors/profile` | Update doctor profile |
| GET | `/api/patients/profile` | Get patient profile |
| PUT | `/api/patients/profile` | Update patient profile |
| POST | `/api/ai/analyze-symptoms` | AI symptom analysis |
| POST | `/api/appointments/book` | Book appointment |
| GET | `/api/appointments/patient` | Patient appointments |
| GET | `/api/appointments/doctor` | Doctor appointments |
| PUT | `/api/appointments/:id/status` | Update appointment |
| POST | `/api/reviews` | Submit doctor review |
| GET | `/api/nearby/hospitals` | Nearby services |

---

## 💾 Database (Cloudflare D1)
- **doctors** — Full doctor profiles
- **patients** — Patient health profiles
- **appointments** — Bookings with status tracking
- **reviews** — Doctor reviews/ratings
- **sessions** — Auth session management

---

## 🛠️ Tech Stack
- **Backend**: Hono.js on Cloudflare Workers/Pages
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla JS + Tailwind-inspired custom CSS
- **Icons**: Font Awesome 6
- **Fonts**: Google Fonts (Inter)
- **Build**: Vite + @hono/vite-build
- **Deploy**: Cloudflare Pages

---

## 🚀 Development Commands
```bash
# Build
npm run build

# Start local dev server with D1
npm run dev:d1

# Reset database (reseed)
npm run db:reset

# Apply migrations
npm run db:migrate:local
```

---

## 🔒 Security Features
- Password hashing before storage
- Session token authentication (64-char random)
- Session expiry (7 days)
- Input validation on all endpoints
- CORS configured
- No sensitive data in client-side code

---

**Built with ❤️ for better healthcare access across India**
