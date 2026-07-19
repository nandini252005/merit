# MERIT
### Merchant Evaluation & Retail Intelligence for Trust

> **Building Fair Credit Access for Bharat's Kirana Ecosystem using Agentic AI**

MERIT is an AI-powered inventory financing platform designed to help small Kirana merchants access working capital based on **real business behaviour** rather than relying solely on traditional credit history.

The platform analyzes merchant trustworthiness using multiple AI agents, recommends appropriate financing, generates personalized repayment schedules, tracks repayment behaviour over time, and continuously updates merchant trust scores.

This prototype demonstrates how Agentic AI can support explainable, fair, and scalable lending for merchants on platforms such as **Kirana Club**.

---

# Live Demo

**Deployed link:** https://merit-frontend-red.vercel.app/

> **A note on load times:** The backend is hosted on Render's free tier, which spins down after inactivity. If you're the first person opening the link in a while, the first request can take **30–60 seconds** to respond while the server wakes up — this is normal, not a bug. Similarly, actions that call the Gemini API (like "Run Merit Analysis") can take a few seconds since they're making live AI calls, not returning cached data.
>
> If a page seems stuck or doesn't load right away, please **wait a moment and refresh**.

---

# Problem Statement

Millions of Kirana merchants across India struggle to access formal credit despite operating sustainable businesses. Traditional lending systems primarily rely on financial history, collateral, and banking records, making it difficult for many small merchants to obtain inventory financing.

MERIT addresses this challenge by evaluating **behavioral business signals**, enabling more inclusive lending decisions while maintaining responsible credit risk management.

---

# Solution Overview

MERIT is a multi-agent AI platform that performs end-to-end inventory financing.

The platform:

- Evaluates merchant trustworthiness
- Recommends loan eligibility and financing terms
- Personalizes weekly repayment schedules
- Tracks merchant repayment behaviour
- Updates trust scores dynamically
- Provides repayment coaching
- Handles repayment exceptions using intelligent grace-period management

Instead of relying only on historical financial records, MERIT incorporates operational business behaviour to support explainable lending decisions.

---

# Features

- AI-powered Merchant Trust Score
- Intelligent Inventory Financing Recommendations
- Multi-Shop Owner Exposure Management
- Dynamic Weekly Repayment Scheduling
- Personalized AI Coaching
- Dynamic Trust Score Evolution
- Grace Period Smoothing
- Loss Asset Simulation
- Explainable Credit Officer Analysis
- Real-time Loan & Repayment Dashboard

---

# Tech Stack

## Frontend

- React.js
- React Router
- CSS3

## Backend

- Node.js
- Express.js

## Database

- SQLite

## AI

- Google Gemini API
- Prompt Engineering
- Multi-Agent Workflow

---

# Project Setup (Run Locally)

The deployed version above points the frontend at our hosted Render backend. If you're running this locally, you'll spin up your **own** backend and database, so a couple of steps below (marked clearly) are needed to point the frontend at your local server instead of the deployed one.

## 1. Clone the Repository

```bash
git clone https://github.com/nandini252005/merit.git
cd merit
```

---

## 2. Backend Setup

Navigate to the backend folder.

```bash
cd backend
```

Install dependencies.

```bash
npm install
```

Create a `.env` file inside the `backend` directory with your own Gemini API key (get a free one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)):

```env
GEMINI_API_KEY=YOUR_API_KEY
PORT=5000
```

Initialize the database (only needed the first time, or if you want a fresh database):

```bash
node database.js
```

Start the backend server.

```bash
node index.js
```

Backend will run on:

```
http://localhost:5000
```

Keep this terminal window open and running while you use the app.

---

## 3. Frontend Setup

**Before installing, point the frontend at your local backend instead of the deployed one:**

Open `frontend/src/api/client.js` and find this line near the top:

```javascript
const BASE_URL = 'https://merit-backend-vw64.onrender.com';
```

Change it to:

```javascript
const BASE_URL = 'http://localhost:5000';
```

This makes sure your local frontend talks to the backend server you just started in Step 2, instead of our hosted version.

Now, in a **new terminal window** (keep the backend one running), navigate to the frontend folder.

```bash
cd frontend
```

Install dependencies.

```bash
npm install
```

Start the React application.

```bash
npm run dev
```

Frontend will run on:

```
http://localhost:5173
```

Open this URL in your browser. Both the backend (Step 2) and frontend (Step 3) need to be running at the same time for the app to work.

---

# Running the Demo

After starting both frontend and backend:

1. Open the frontend application.
2. Select a merchant.
3. Run Trust Score Analysis.
4. Apply for inventory financing.
5. Approve the loan.
6. Simulate weekly repayments.
7. Observe:
   - Dynamic repayment schedule generation
   - Trust score updates
   - Grace period handling
   - Loss Asset simulation
   - Credit Officer analysis

---

# MVP Assumptions

This project is built as an MVP for demonstration purposes.

Current implementation includes:

- Representative merchant dataset
- Simulated merchant inventory behaviour
- AI-generated repayment recommendations
- Dynamic trust score updates
- Complete repayment lifecycle
- Grace period simulation
- Explainable AI recommendations

Production integrations such as live merchant activity and reorder events are represented using simulated data.

---

# Future Scope

Future production enhancements include:

- Integration with Kirana Club APIs
- Live inventory reorder events
- PostgreSQL migration for production-scale deployment
- Machine Learning-based default prediction
- Hybrid ML + Agentic AI decision engine
- Cloud-native deployment with auto scaling
- Distributor ERP integration
- Real-time merchant monitoring
- Meesho Lending integration

---

# Open Source Attribution

| Technology | Purpose |
|------------|----------|
| React.js | Frontend Framework |
| Express.js | Backend Framework |
| SQLite | Local Database |
| Node.js | JavaScript Runtime |
| React Router | Client-side Routing |
| Google Gemini API | AI Reasoning & Agent Workflow |

---

# License

This project was developed as part of **Meesho ScriptedByHer 2.0** for demonstration and evaluation purposes.
