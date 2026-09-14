import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import requests
import pyperclip
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# --- Gemini API Setup ---
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
# Use the latest Gemini free model endpoint (as of 2025):
# The recommended free model is 'gemini-2.5-flash'.
GEMINI_MODEL = 'gemini-2.5-flash'
GEMINI_API_URL = f'https://generativelanguage.googleapis.com/v1/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}'

# --- App Config ---
MOODS = [
    ("�", "Humorous"),
    ("🌟", "Inspirational"),
    ("📚", "Informative"),
    ("👋", "Casual"),
    ("�", "Formal"),
    ("🙃", "Witty"),
    ("🎉", "Enthusiastic"),
    ("�", "Empathetic"),
    ("�", "Convincing"),
    ("😛", "Teasing")
]
LENGTHS = ["Short", "Medium", "Long"]


class LinkedInCommenterApp:
    def __init__(self, root):
        self.root = root
        self.root.title("AI LinkedIn Comment Generator")
        # Set 9:16 aspect ratio (e.g., 540x960)
        self.root.geometry("540x960")
        self.root.minsize(540, 960)
        self.root.configure(bg="#f0f4ff")
        self.last_clipboard = ""
        self.selected_mood = tk.StringVar(value=MOODS[0][1])
        self.selected_length = tk.StringVar(value=LENGTHS[0])
        self.post_text = tk.StringVar()
        self.comment_texts = [tk.StringVar(), tk.StringVar(), tk.StringVar()]
        self.use_emojis = tk.BooleanVar(value=True)
        self.setup_ui()
        self.monitor_clipboard()

    def setup_ui(self):
        frm = tk.Frame(self.root, bg="#f0f4ff")
        frm.pack(fill=tk.BOTH, expand=True)

        # Title
        title = tk.Label(frm, text="AI LinkedIn Comment Generator", font=("Segoe UI", 22, "bold"), bg="#4f8cff", fg="white", pady=18, bd=0, relief=tk.FLAT)
        title.pack(fill=tk.X, pady=(0, 18))

        # Post input
        post_frame = tk.Frame(frm, bg="#f0f4ff")
        post_frame.pack(fill=tk.X, pady=(0, 10))
        tk.Label(post_frame, text="Copied LinkedIn Post:", font=("Segoe UI", 13, "bold"), bg="#f0f4ff").pack(anchor=tk.W, padx=8)
        self.post_entry = tk.Text(post_frame, height=5, wrap=tk.WORD, font=("Segoe UI", 12), bg="#eaf1fb", fg="#222", bd=2, relief=tk.GROOVE)
        self.post_entry.pack(fill=tk.X, padx=8, pady=4)
        self.post_entry.config(state=tk.DISABLED)


        # Mood, emoji toggle, and length
        options_frame = tk.Frame(frm, bg="#f0f4ff")
        options_frame.pack(fill=tk.X, pady=(0, 16))
        tk.Label(options_frame, text="Mood:", font=("Segoe UI", 12, "bold"), bg="#f0f4ff").pack(side=tk.LEFT, padx=(8, 5))
        # Colorful emoji backgrounds and one-word descriptions
        emoji_bg = [
            "#fff3cd",  # Humorous
            "#e0e7ff",  # Inspirational
            "#d1f2eb",  # Informative
            "#ffe6e6",  # Casual
            "#e2e3e5",  # Formal
            "#f3e6ff",  # Witty
            "#e6ffe6",  # Enthusiastic
            "#ffe6fa",  # Empathetic
            "#e6f7ff",  # Convincing
            "#fff0e6"   # Teasing
        ]
        emoji_desc = [
            "Humorous", "Inspirational", "Informative", "Casual", "Formal",
            "Witty", "Enthusiastic", "Empathetic", "Convincing", "Teasing"
        ]
        self.emoji_btns = []
        emoji_frame = tk.Frame(options_frame, bg="#f0f4ff")
        emoji_frame.pack(side=tk.LEFT)
        for idx, (emoji, mood) in enumerate(MOODS):
            btn = tk.Label(emoji_frame, text=emoji, font=("Segoe UI", 15, "bold"), bg=emoji_bg[idx], width=3, bd=2, relief=tk.RIDGE, cursor="hand2")
            btn.grid(row=0, column=idx, padx=3)
            btn.bind("<Button-1>", lambda e, m=mood: self.set_mood(m))
            self.emoji_btns.append(btn)
        for idx, desc in enumerate(emoji_desc):
            lbl = tk.Label(emoji_frame, text=desc, font=("Segoe UI", 9, "bold"), bg="#f0f4ff", fg="#555")
            lbl.grid(row=1, column=idx, padx=3, pady=(0,2))

        # Emoji toggle
        emoji_toggle = tk.Checkbutton(options_frame, text="Use emojis?", variable=self.use_emojis, bg="#f0f4ff", font=("Segoe UI", 11), onvalue=True, offvalue=False)
        emoji_toggle.pack(side=tk.LEFT, padx=(18, 2))

        self.update_emoji_borders()
        # Length selection (must be here so options_frame is in scope)
        tk.Label(options_frame, text="  Length:", font=("Segoe UI", 12, "bold"), bg="#f0f4ff").pack(side=tk.LEFT, padx=(12, 2))
        length_menu = ttk.OptionMenu(options_frame, self.selected_length, LENGTHS[0], *LENGTHS)
        length_menu.pack(side=tk.LEFT)

        # Generate button
        gen_btn = tk.Button(frm, text="✨ Generate Comments", font=("Segoe UI", 14, "bold"), bg="#4f8cff", fg="white", activebackground="#357ae8", activeforeground="white", command=self.generate_comment, bd=0, relief=tk.FLAT)
        gen_btn.pack(pady=10, ipadx=12, ipady=6)

        # Comments display
        tk.Label(frm, text="Best AI Comments:", font=("Segoe UI", 14, "bold"), bg="#f0f4ff").pack(anchor=tk.W, pady=(10, 0), padx=8)
        self.comment_boxes = []
        box_colors = ["#fffbe6", "#e6fff7", "#ffe6f2"]
        for i in range(3):
            box = tk.Frame(frm, bg=box_colors[i], bd=2, relief=tk.RIDGE)
            box.pack(fill=tk.X, padx=18, pady=10)
            comment_label = tk.Label(box, textvariable=self.comment_texts[i], font=("Segoe UI", 13), bg=box_colors[i], wraplength=480, justify=tk.LEFT, anchor=tk.W, padx=8, pady=8)
            comment_label.pack(side=tk.LEFT, fill=tk.X, expand=True)
            copy_icon = tk.Button(box, text="📋", font=("Segoe UI", 15), bg=box_colors[i], bd=0, command=lambda idx=i: self.copy_comment(idx), cursor="hand2", activebackground="#d0e2ff")
            copy_icon.pack(side=tk.RIGHT, padx=8)
            self.comment_boxes.append((box, comment_label, copy_icon))

    def set_mood(self, mood):
        self.selected_mood.set(mood)
        self.update_emoji_borders()

    def update_emoji_borders(self):
        for idx, (emoji, mood) in enumerate(MOODS):
            if self.selected_mood.get() == mood:
                self.emoji_btns[idx].config(highlightbackground="#357ae8", highlightcolor="#357ae8", highlightthickness=3, bd=3, relief=tk.SOLID)
            else:
                self.emoji_btns[idx].config(highlightthickness=0, bd=2, relief=tk.RIDGE)

    def monitor_clipboard(self):
        def check_clipboard():
            while True:
                try:
                    text = pyperclip.paste()
                    if text != self.last_clipboard and len(text) > 10:
                        self.last_clipboard = text
                        self.post_text.set(text)
                        self.update_post_entry(text)
                    time.sleep(1)
                except Exception:
                    time.sleep(2)
        threading.Thread(target=check_clipboard, daemon=True).start()

    def update_post_entry(self, text):
        self.post_entry.config(state=tk.NORMAL)
        self.post_entry.delete(1.0, tk.END)
        self.post_entry.insert(tk.END, text)
        self.post_entry.config(state=tk.DISABLED)


    def update_comment_entries(self, comments):
        for i in range(3):
            if i < len(comments):
                self.comment_texts[i].set(comments[i])
            else:
                self.comment_texts[i].set("")

    def generate_comment(self):
        post = self.post_entry.get(1.0, tk.END).strip()
        if not post:
            messagebox.showwarning("No Post", "No LinkedIn post text detected.")
            return
        mood = self.selected_mood.get()
        length = self.selected_length.get()
        # Improved prompt to avoid intro text and get only comments
        emoji_instruction = "Include relevant emojis in each comment." if self.use_emojis.get() else "Do not use any emojis in the comments."
        prompt = (
            f"You are an expert LinkedIn commenter. Given the following post, generate exactly 3 unique, numbered LinkedIn comments in a {mood.lower()} mood, each on a new line, without any introduction or explanation. "
            f"Each comment should be {length.lower()} and suitable for posting as a reply. {emoji_instruction}\nPost: {post}\nFormat:\n1. <comment1>\n2. <comment2>\n3. <comment3>"
        )
        self.update_comment_entries(["Generating comments..."]*3)
        threading.Thread(target=self.call_gemini, args=(prompt,), daemon=True).start()

    def call_gemini(self, prompt):
        headers = {"Content-Type": "application/json"}
        data = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        try:
            resp = requests.post(GEMINI_API_URL, json=data, headers=headers, timeout=30)
            resp.raise_for_status()
            result = resp.json()
            text = result['candidates'][0]['content']['parts'][0]['text']
            # Remove any intro lines (e.g., "Here are 3 different...")
            import re
            lines = [l.strip() for l in text.split('\n') if l.strip()]
            # Find lines that start with 1., 2., 3. and only keep those
            comments = []
            for l in lines:
                m = re.match(r'^(\d+)\.\s*(.*)', l)
                if m and m.group(2):
                    comments.append(m.group(2).strip())
            if len(comments) < 3:
                # fallback: try splitting by numbers in the text
                comments = re.split(r'\n?\s*\d+\.\s*', text)
                comments = [c.strip() for c in comments if c.strip()]
            self.update_comment_entries(comments[:3])
        except Exception as e:
            self.update_comment_entries([f"Error: {e}", "", ""])

    def copy_comment(self, idx):
        comment = self.comment_texts[idx].get().strip()
        if comment:
            pyperclip.copy(comment)
        # No popup

if __name__ == "__main__":
    try:
        import pyperclip
    except ImportError:
        import subprocess
        subprocess.check_call(["pip", "install", "pyperclip"])
        import pyperclip
    try:
        import requests
    except ImportError:
        import subprocess
        subprocess.check_call(["pip", "install", "requests"])
        import requests
    root = tk.Tk()
    app = LinkedInCommenterApp(root)
    root.mainloop()
