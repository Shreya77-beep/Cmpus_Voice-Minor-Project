import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from backend directory if present
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")

class Settings:
    PROJECT_NAME: str = "CampusVoice API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'campus_voice.db'}")
    
    FAQ_DATA_PATH: Path = BASE_DIR / "data" / "campus_faq.json"
    INTENTS_DATA_PATH: Path = BASE_DIR / "data" / "datasets" / "campus_intents.json"

settings = Settings()
