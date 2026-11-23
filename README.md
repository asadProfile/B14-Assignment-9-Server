# SalonBook Server — Salon Appointment Booking API

SalonBook Server is the robust RESTful backend powering the **SalonBook** luxury salon appointment booking and management platform. It delivers role-based access control (Admin & Customer), service catalog management, duplicate slot booking conflict prevention, MongoDB data persistence, and Stripe payment checkout sessions with webhook verification.

---

## 🌟 Important Features

- **Role-Based Authentication & Authorization**:
  - Secure password hashing with bcrypt
  - JWT token verification middleware (`verifyToken`, `verifyAdmin`, `verifyCustomer`, `verifyNotBlocked`)
  - Prevention of unauthorized access and automatic suspension enforcement for blocked customers
- **Service Catalog Management**:
  - Full CRUD operations on salon services
  - Search by service name, description, and category
  - Price sorting (ascending & descending)
  - Active/Inactive status toggle for customer visibility
- **Appointment Booking Workflow**:
  - Real-time date and time slot reservation
  - Automatic collision detection preventing duplicate active bookings on identical time slots
  - State machine transition: `pending` ➔ `confirmed` / `cancelled`
  - Strict customer rules: customers can only cancel pending requests; cannot cancel confirmed appointments
- **Payment & Stripe Integration**:
  - Creation of Stripe Checkout Sessions for confirmed unpaid appointments
  - Secure Stripe webhook handling (`checkout.session.completed`) with raw request verification
  - Automatic transaction logging and appointment status update to `paid`
  - Session verification fallback endpoint for local environments
- **Admin Management Operations**:
  - Customer registry view with one-click user block/unblock capabilities
  - Overview statistics aggregation (Registered Clients, Active Services, Bookings, Revenue)
  - Immutable transactions ledger
- **Zero-Config Local Development**:
  - Automatic fallback to in-memory MongoDB when `MONGODB_URI` is not provided
  - Built-in database seeder with pre-configured Admin, Demo Customer, and 8 salon services

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (v20+)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Local Dev Database**: MongoDB Memory Server
- **Security & Auth**: JSON Web Tokens (JWT), Bcrypt.js, CORS
- **Payments**: Stripe API SDK (v17+)
- **File Uploads**: Multer & ImgBB API Integration

---

## 📋 Required Environment Variables

Create a `.env` file in the root of the server project based on `.env.example`:

| Variable Name | Description | Example / Default |
|---|---|---|
| `PORT` | Server listening port | `5000` |
| `NODE_ENV` | Application environment | `development` / `production` |
| `CLIENT_URL` | Allowed frontend origin for CORS | `http://localhost:3000` |
| `MONGODB_URI` | MongoDB Atlas connection string | Leave blank for in-memory MongoDB |
| `DB_NAME` | MongoDB database name | `salonbook` |
| `JWT_SECRET` | Secret key for JWT signing | `[Your_Secure_Random_Key]` |
| `JWT_EXPIRES_IN` | JWT expiration duration | `7d` |
| `ADMIN_EMAIL` | Default administrator email | `admin@salonbook.com` |
| `ADMIN_PASSWORD` | Default administrator password | `Admin123!` |
| `STRIPE_SECRET_KEY` | Stripe secret API key | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `IMGBB_API_KEY` | ImgBB API key for cloud hosting | Optional (defaults to `/uploads`) |
| `PUBLIC_API_URL` | Base URL of this API | `http://localhost:5000` |

> ⚠️ **Security Notice**: Never commit `.env` files or real secret credentials to version control.

---

## 🚀 How to Run the Project Locally

### Prerequisites
- Node.js (v18.x or v20.x+)
- npm or pnpm

### 1. Clone the repository
```bash
git clone https://github.com/asadProfile/B14-Assignment-9-Server.git
cd B14-Assignment-9-Server
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env
```

### 4. Start the Development Server
```bash
npm run dev
```

The server will automatically start on `http://localhost:5000`, boot up the database, and seed initial demo services and accounts.

### 5. Build for Production
```bash
npm run build
npm start
```

---

## 🔑 Default Credentials for Evaluation

- **Administrator**:
  - Email: `admin@salonbook.com`
  - Password: `Admin123!`
- **Demo Customer**:
  - Email: `customer@salonbook.com`
  - Password: `Customer123!`

---

## 🔗 Repository & Live Links

- **Server Repository**: [https://github.com/asadProfile/B14-Assignment-9-Server](https://github.com/asadProfile/B14-Assignment-9-Server)
- **Client Repository**: [https://github.com/asadProfile/B14-Assignment-9-Client](https://github.com/asadProfile/B14-Assignment-9-Client)
- **Live Website**: [https://salonbook-platform.vercel.app](https://salonbook-platform.vercel.app)
