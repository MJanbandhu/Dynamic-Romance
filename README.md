# 💖 Romantic Interactive Web Application

A modern, responsive, luxury romantic web application built with **Python (Flask)**, **SQLAlchemy**, **Vanilla JavaScript (ES6+)**, and **Resend Email API integration**. Built for seamless deployment on **Render**.

![App Preview](frontend/assets/svg/heart.svg)

---

## 🌟 Features

- **Dynamic Time-Based Greetings & Adjectives**: Automatically detects local time (Morning, Afternoon, Evening, Night) and randomly assigns sweet adjectives (*Adorable, Cutie, Gorgeous, Intelligent, etc.*).
- **Smooth 7-Second Landing Transition**: Fades out landing screen and transitions smoothly into the interactive experience.
- **Interactive Evasive NO Button**:
  - **Desktop**: Intelligently evades cursor within 100px proximity without ever leaving viewport or overlapping the YES button.
  - **Mobile**: Displays playful toast messages when tapped ("*No option is unavailable Cutieeeee. Do you want to click on YES?*").
  - Tracks all evasive attempts in database.
- **Full Romantic Explosion (YES Click)**: Triggering YES unleashes full canvas particle explosions, heart rain, glowing background animations, and custom sound effects.
- **Kiss Selection Experience**: Interactive glassmorphism cards (Forehead, Cheek, Nose, Lips, Neck, Eyes) with unique custom SVG & CSS animations for each choice.
- **Final Celebration (15 Seconds)**: Grand romantic finale featuring floating balloons, heart rain, fireflies, and romantic music.
- **Activity & Visitor Analytics**:
  - Automatically captures session ID, IP, Country, User-Agent (Browser, OS, Device), Screen Resolution, Visit Timestamps, and Visit Duration.
- **Resend Email Notifications**: Triggers HTML email alerts for every major activity:
  - New Visitor Alert
  - YES Clicked Alert
  - Kiss Selection Alert
  - Visit Completed Alert
- **Password-Protected Admin Dashboard**:
  - Summary Metrics Cards (Total Visitors, Today's Visitors, YES Clicks, NO Attempts, Favorite Kiss).
  - Interactive Chart.js Visualizations (Kiss Distribution & Device Types).
  - Searchable & Paginated Visitor Activity Log Table.
  - Record Deletion and One-Click **CSV Export**.
- **Web Audio Synthesizer**: Procedurally generates ambient romantic arpeggios and kiss sound effects without external audio file dependencies.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | HTML5, Vanilla CSS3 (Glassmorphism, Dark Mode), ES6+ JavaScript, HTML5 Canvas API |
| **Backend** | Python 3.12+, Flask, Flask-SQLAlchemy, Flask-CORS, Gunicorn |
| **Database** | SQLite (Development) / PostgreSQL (Production on Render) |
| **Email API** | Resend API (`resend` Python SDK / REST API) |
| **Charts & Icons** | Chart.js, Google Fonts (Outfit, Great Vibes, Dancing Script) |
| **Deployment** | Render Blueprint (`render.yaml`), Procfile, Gunicorn |

---

## 📂 Folder Structure

```
Romantic-Web-App/
├── backend/
│   ├── app.py              # Main Flask Application Entrypoint
│   ├── routes.py           # REST API Blueprints & Admin Endpoints
│   ├── models.py           # SQLAlchemy Database ORM Models
│   ├── database.py         # DB Setup & Session Management
│   ├── email_service.py    # Resend HTML Email Notification Module
│   ├── config.py           # Environment Variables & Configuration
│   └── utils.py            # User-Agent, IP & Geolocation Utilities
├── frontend/
│   ├── index.html          # Main Single-Page HTML Markup
│   ├── style.css           # Glassmorphism & Dark Romantic Stylesheet
│   ├── script.js           # Canvas Engines, Evasive NO Physics & Audio
│   └── assets/
│       ├── svg/            # Custom SVG Icons & Animations
│       └── images/         # Static Image Assets
├── README.md               # Comprehensive Documentation & Setup Guide
├── render.yaml             # Render Infrastructure as Code Blueprint
├── requirements.txt        # Python Dependencies
├── Procfile                # Gunicorn Server Process Configuration
├── runtime.txt             # Python Runtime Specification
├── .env.example            # Environment Variables Template
└── .gitignore              # Git Ignore Exclusions
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Python 3.12+** installed on your computer.
- **Git** installed.

### 2. Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/romantic-web-app.git
   cd romantic-web-app
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install project dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure Environment Variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your details:
   ```env
   SECRET_KEY=your_secret_key_here
   DATABASE_URL=sqlite:///romantic_app.db
   RESEND_API_KEY=re_123456789_your_key
   FROM_EMAIL=onboarding@resend.dev
   TO_EMAIL=your_email@example.com
   ADMIN_PASSWORD=romantic2026
   PORT=5000
   ```

5. Run the application locally:
   ```bash
   python backend/app.py
   ```
   Open your browser and navigate to: **`http://localhost:5000`**

---

## 📧 Resend Email Setup Guide

1. Sign up for a free account at [Resend.com](https://resend.com).
2. Create an **API Key** in the Resend dashboard.
3. Copy your API Key into your `.env` file (`RESEND_API_KEY`).
4. Set `TO_EMAIL` to your target inbox address where notifications should be delivered.
5. If using a custom domain, configure domain verification in Resend and update `FROM_EMAIL`. For testing, you can use `onboarding@resend.dev`.

---

## 🌐 Deploying to Render

This project includes a pre-configured `render.yaml` blueprint for automatic deployment on **Render**.

### Step-by-Step Render Deployment:

1. Push your code to a **GitHub** repository.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub repository. Render will automatically detect `render.yaml`.
5. Environment Variables to fill on Render:
   - `RESEND_API_KEY`: Your Resend API key (`re_...`).
   - `FROM_EMAIL`: Sender email (`onboarding@resend.dev` or verified domain).
   - `TO_EMAIL`: Your email address.
   - `ADMIN_PASSWORD`: Your secret admin dashboard password.
6. Click **Apply**. Render will automatically provision:
   - Web Service with Python runtime
   - Managed PostgreSQL Database
7. Your app will be live at `https://<your-app-name>.onrender.com`!

---

## 📡 API Documentation

### Visitor Endpoints
- `POST /api/visit` - Record initial visit and trigger welcome email notification.
- `POST /api/no-attempt` - Track evasive NO hover/tap count.
- `POST /api/yes-click` - Record YES click and send email notification.
- `POST /api/kiss-selection` - Record selected kiss category and send email notification.
- `POST /api/complete-visit` - Record final completion timestamp and duration.

### Admin Endpoints (Protected)
- `POST /api/admin/login` - Authenticate admin password.
- `GET /api/admin/statistics` - Retrieve aggregated statistics and metrics.
- `GET /api/admin/recent-visits` - Get paginated & searchable visitor logs.
- `DELETE /api/admin/visit/<id>` - Delete specific visitor record and activities.
- `GET /api/admin/export-csv` - Export full database to CSV file.

---

## 🔒 Security Notes

- No hardcoded secret keys or API tokens in source code.
- Admin APIs require Bearer token validation matching `ADMIN_PASSWORD`.
- `X-Forwarded-For` header handling ensures accurate IP detection behind Render proxying.

---

## 📜 License

This project is open-source under the **MIT License**. Created with ❤️ for love and romance.
