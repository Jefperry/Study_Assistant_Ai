# Study_Assistant_Ai

StudyAI is a full-stack web application that leverages AI to help students study more efficiently. It allows users to input class notes, receive concise AI-generated summaries, and automatically create flashcards for effective revision. The platform is built with a React frontend and a FastAPI backend, using MongoDB for data storage and OpenAI's GPT-4o for natural language processing.

# Features

User Authentication: Secure registration, login, and JWT-based session management.
AI Summarization: Generate clear, concise summaries of class notes using GPT-4o.
Flashcard Generation: Automatically create flashcards from your notes for active recall.
Summary Management: Save, view, and delete your summaries and flashcards.
Responsive UI: Modern, mobile-friendly interface built with React and Tailwind CSS.

# Tech Stack

Frontend
React
Tailwind CSS
Radix UI
Axios
React Router
Backend
FastAPI
MongoDB (via Motor)
OpenAI GPT-4o API
JWT Authentication
Pydantic

# Getting Started

Prerequisites
Node.js (v18+ recommended)
Python 3.11+
MongoDB instance (local or cloud)
OpenAI API key
Environment Variables
Backend (.env)
MONGO_URL=<your-mongodb-connection-string>
DB_NAME=<your-db-name>
JWT_SECRET=<your-jwt-secret>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=<your-frontend-url>
EMERGENT_LLM_KEY=<your-openai-api-key>

# Frontend

If needed, configure API endpoints in your frontend source (e.g., src/App.js).

# Installation

# Backend

# Navigate to the backend directory:

cd backend

# Install dependencies:

pip install -r requirements.minimal.txt

# Start the server:

uvicorn server:app --reload --host 0.0.0.0 --port 8000

# Frontend

# Navigate to the frontend directory

cd frontend

# Install dependencies

npm install

# Start the development server

npm start

# Deployment

Frontend: Deployable on Vercel or any static hosting supporting React.

Backend: Deployable on Render, Heroku, or any platform supporting FastAPI and Python 3.11+.

Ensure your backend CORS settings allow requests from your deployed frontend domain.

# API Endpoints

POST /api/auth/register - Register a new user
POST /api/auth/login - Login and receive JWT tokens
POST /api/auth/refresh - Refresh access token
GET /api/auth/me - Get current user info
POST /api/ai/summarize - Generate summary and flashcards
GET /api/summaries - List all summaries for the user
GET /api/summaries/{summary_id} - Get a specific summary
DELETE /api/summaries/{summary_id} - Delete a summary

# FOLDER STRUCRURE

Study_Assistant_Ai/
│
├── backend/
│ ├── server.py
│ ├── requirements.minimal.txt
│ └── ...
│
├── frontend/
│ ├── src/
│ ├── public/
│ ├── package.json
│ └── ...
│
├── render.yaml
├── vercel.json
└── README.md

# License

This project is licensed under the MIT License.

# Acknowledgements

Claude
FastAPIS
React
MongoDB
