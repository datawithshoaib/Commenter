# Commenter

This project is an AI-powered tool designed to generate intelligent and context-aware comments for social media posts. It consists of a backend and a frontend, making it easy to use and extend. 

**Now supports multiple platforms with platform selection!**


## Features
- **AI-generated comments** for social media posts
- **Platform selection:** Choose between LinkedIn and X (Twitter)
- **Modern frontend** built with Next.js
- **Backend API** for AI processing
- **Easy setup and deployment**

## Project Structure
```
.
├── linkedin_commenter.py           # Main script (if running standalone)
├── requirements.txt                # Python dependencies (root)
├── backend/                        # Backend API (Python)
│   ├── main.py                     # FastAPI or Flask app
│   ├── requirements.txt            # Backend-specific dependencies
├── frontend/                       # Frontend (Next.js)
│   ├── package.json                # Frontend dependencies
│   ├── src/app/                    # Main app source
│   └── public/                     # Static assets
```

## Getting Started

### Backend Setup
1. Navigate to the `backend` directory:
   ```sh
   cd backend
   ```
2. Install Python dependencies:
   ```sh
   pip install -r requirements.txt
   ```
3. Run the backend server:
   ```sh
   python main.py
   ```

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```sh
   cd frontend
   ```
2. Install Node.js dependencies:
   ```sh
   npm install
   ```
3. Start the development server:
   ```sh
   npm run dev
   ```


### Usage
- Access the frontend in your browser (usually at `http://localhost:3000`).
- Select your desired platform (LinkedIn or X) from the options.
- The frontend communicates with the backend to generate AI-powered comments for the selected platform.


## Supported Platforms
- LinkedIn
- X (Twitter)

## Requirements
- Python 3.8+
- Node.js 18+
