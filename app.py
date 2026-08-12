import os
import sys
from pathlib import Path

# Add backend directory to Python path
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import gradio as gr
from app.main import app as fastapi_app

# Create a clean landing page for the Hugging Face Space
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

# Mount the complete FastAPI application onto the Gradio Space
app = gr.mount_gradio_app(fastapi_app, demo, path="/status")

# When run directly by Uvicorn / Space runner
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run("app:app", host="0.0.0.0", port=port)
