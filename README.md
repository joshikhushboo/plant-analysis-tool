# 🌿 PlantScan — AI Plant Analysis Tool

PlantScan is a full-stack AI-powered web application that identifies plants from images and provides detailed information about their health, care requirements, and common problems.

Users can upload a plant image and receive an AI-generated analysis including plant identification, confidence score, health status, visible symptoms, watering requirements, sunlight needs, soil recommendations, and more.

🔗 **Live Demo:** https://plant-analysis-tool-lsn4lxb4u-joshikhushboos-projects.vercel.app/

---

## ✨ Features

* 🌱 **AI Plant Identification** — Identify plants from uploaded images using Google Gemini AI.
* 🩺 **Plant Health Analysis** — Detect visible symptoms and provide health-related insights.
* 💧 **Care Recommendations** — Get watering, sunlight, soil, temperature, and fertilizer recommendations.
* 🔐 **Authentication** — User signup/login with JWT authentication.
* 🔑 **Google Login** — Google authentication using Privy.
* 📚 **Analysis History** — Logged-in users can save and view previous plant analyses.
* 🗑️ **History Management** — Delete previous analyses.
* 📄 **PDF Reports** — Download plant analysis results as a PDF.
* 🔄 **Analyze Again** — Quickly start a new analysis without refreshing the page.
* 📱 **Responsive UI** — Designed for desktop and mobile devices.
* 👤 **Guest Analysis** — Users can analyze plants without creating an account.

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Vite
* CSS
* Font Awesome
* Privy Authentication

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* Multer
* PDFKit

### AI

* Google Gemini API
* Gemini 2.5 Flash

### Deployment

* **Frontend:** Vercel
* **Backend:** Render
* **Database:** MongoDB Atlas

---

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │      React + Vite   │
                    │      Frontend       │
                    └──────────┬──────────┘
                               │
                               │ REST API
                               ▼
                    ┌─────────────────────┐
                    │   Node.js + Express │
                    │      Backend        │
                    └──────┬────────┬─────┘
                           │        │
              ┌────────────┘        └─────────────┐
              ▼                                    ▼
     ┌─────────────────┐                  ┌─────────────────┐
     │   Google Gemini │                  │     MongoDB     │
     │       AI        │                  │     Database    │
     └─────────────────┘                  └─────────────────┘
```

---

## 🔄 How It Works

1. Upload an image of a plant.
2. PlantScan sends the image to the Express backend.
3. The backend sends the image to Gemini AI for analysis.
4. Gemini identifies the plant and generates structured information.
5. The result is returned to the React frontend.
6. Authenticated users can save the analysis to their history.
7. Users can view, delete, or download their reports as PDFs.

---

## 📋 Analysis Includes

Each plant analysis can provide:

* Plant Name
* Scientific Name
* Confidence Score
* Description
* Health Status
* Visible Symptoms
* Watering Requirements
* Sunlight Requirements
* Soil Recommendations
* Temperature Requirements
* Fertilizer Recommendations
* Common Problems
* Recommended Actions
* Interesting Facts

---

## 🔐 Authentication & History

PlantScan supports both guest and authenticated users.

### Guest Users

* Can upload and analyze plants.
* Can view the AI-generated results.
* Can download the PDF report.
* Their analyses are **not stored in history**.

### Authenticated Users

* Can analyze plants.
* Their analyses are stored in MongoDB.
* Can access their personal analysis history.
* Can delete previous analyses.
* Can use JWT-based authentication.

---

## 📁 Project Structure

```text
plant-analysis-tool/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   └── PlantAnalysis.js
│   ├── uploads/
│   ├── app.js
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## ⚙️ Environment Variables

### Frontend

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_PRIVY_APP_ID=your_privy_app_id
```

### Backend

Create `server/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

> Never commit `.env` files or API keys to GitHub.

---

## 🚀 Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/joshikhushboo/plant-analysis-tool.git
cd plant-analysis-tool
```

### 2. Install frontend dependencies

```bash
cd client
npm install
```

### 3. Install backend dependencies

```bash
cd ../server
npm install
```

### 4. Configure environment variables

Add the required variables to:

```text
client/.env
server/.env
```

### 5. Start the backend

```bash
cd server
node app.js
```

### 6. Start the frontend

Open another terminal:

```bash
cd client
npm run dev
```

The application will be available at the Vite development URL.

---

## 🌐 Deployment

The application is deployed using:

* **Vercel** — React frontend
* **Render** — Express backend
* **MongoDB Atlas** — Database

Production API:

```text
https://plant-analysis-tool-zn17.onrender.com
```

---

## 🎯 Future Improvements

* 📷 Camera-based plant scanning
* 🌿 Support for multiple plant images
* 📈 Plant health tracking over time
* 🔔 Personalized plant-care reminders
* 🌱 Plant collection management
* 🤖 More advanced AI-based disease detection
* 🌍 Plant species database integration

---

## 👩‍💻 Author

**Khushboo Joshi**

Computer Science Engineering | Full-Stack Development | AI/ML

GitHub: https://github.com/joshikhushboo
LinkedIn: https://www.linkedin.com/in/joshikhushboo/
