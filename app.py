import os
import sys
from pathlib import Path

# Add backend directory to Python module search path
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import gradio as gr
from app.main import app as fastapi_app

# Create clean Gradio landing page
with gr.Blocks(title="SkillGap AI - Platform API") as demo:
    gr.Markdown("""
    # 🚀 SkillGap AI & ATS Resume Scorer — Live Backend API

    Welcome to the backend service for **SkillGap AI & Unified Recruitment Intelligence Platform**.

    ### 🔗 Quick Links:
    - **Interactive Swagger API Docs**: [Open API Documentation](/docs)
    - **ReDoc API Specifications**: [Open ReDoc](/redoc)
    - **API Health Check**: [Check Service Status](/health)

    ---
    *Powered by FastAPI, Supabase PostgreSQL, and Groq AI on Hugging Face Spaces (16GB RAM).*
    """)

# gr.mount_gradio_app attaches the landing page to FastAPI
app = gr.mount_gradio_app(fastapi_app, demo, path="/status")

# Native Gradio launcher for Hugging Face Spaces (single process on port 7860)
if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860, app=fastapi_app)
