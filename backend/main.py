from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import requests
import os

# --- Gemini API Setup ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyAvcrmT4BcKsUwXhb3bXaNq9BwoS9_3NKQ")
GEMINI_MODEL = 'gemini-2.5-flash'
GEMINI_API_URL = f'https://generativelanguage.googleapis.com/v1/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}'


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development only. Use your frontend URL in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CommentRequest(BaseModel):
    post: str
    mood: str
    length: str
    use_emojis: bool
    platform: str  # 'linkedin' or 'x'

class CommentResponse(BaseModel):
    comments: List[str]

@app.post("/generate-comments", response_model=CommentResponse)
def generate_comments(req: CommentRequest):
    emoji_instruction = (
        "Include relevant emoji in each comment."
        if req.use_emojis else "Do not use any emojis in the comments."
    )
    # Platform-specific prompt
    if req.platform.lower() == "x":
        platform_name = "X (Twitter)"
        persona = "You are an expert X (Twitter) commenter."
    else:
        platform_name = "LinkedIn"
        persona = "You are an expert LinkedIn commenter."

    prompt = (
        f"{persona} Given the following post, generate exactly 3 unique, numbered {platform_name} comments in a {req.mood.lower()} mood, each on a new line, without any introduction or explanation or hashtags. "
        f"Each comment should be {req.length.lower()} and sound like a human, and suitable for posting as a reply. {emoji_instruction}\nPost: {req.post}\nFormat:\n1. <comment1>\n2. <comment2>\n3. <comment3>"
    )
    headers = {"Content-Type": "application/json"}
    data = {"contents": [{"parts": [{"text": prompt}]}]}
    try:
        resp = requests.post(GEMINI_API_URL, json=data, headers=headers, timeout=30)
        resp.raise_for_status()
        result = resp.json()
        text = result['candidates'][0]['content']['parts'][0]['text']
        import re
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        comments = []
        for l in lines:
            m = re.match(r'^(\d+)\.\s*(.*)', l)
            if m and m.group(2):
                comments.append(m.group(2).strip())
        if len(comments) < 3:
            comments = re.split(r'\n?\s*\d+\.\s*', text)
            comments = [c.strip() for c in comments if c.strip()]
        return {"comments": comments[:3]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
