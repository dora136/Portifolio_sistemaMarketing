import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent


class Env:
    def __init__(self):
        dotenv_paths = [
            BASE_DIR.parent / ".env",
            BASE_DIR / ".env",
        ]
        for path in dotenv_paths:
            load_dotenv(dotenv_path=path, override=True)

    def get(self, key: str, default=None):
        return os.getenv(key, default)


env = Env()
