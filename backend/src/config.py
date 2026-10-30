from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    S3_ENDPOINT: str = ""
    S3_REGION: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_LIBRARY_BUCKET: str = "library"

    DATABASE_URL: str = ""

    AI_PROVIDER: str = "gemini"  # "gemini" or "huggingface"
    EMBEDDING_DIMENSIONS: int = 384  # size of the pgvector column — changing it needs an Alembic migration + re-embed

    GEMINI_API_BASE: str = "https://generativelanguage.googleapis.com/v1beta"
    GEMINI_API_KEY: str = ""
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"
    GEMINI_CHAT_MODEL: str = "gemini-2.5-flash"

    HF_API_KEY: str = ""
    HF_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    HF_CHAT_MODEL: str = "meta-llama/Llama-3.1-8B-Instruct"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "Paperwise"
    SMTP_FROM_EMAIL: str = "noreply@paperwise.ai"

    APP_URL: str = "http://localhost:3000"

    JWT_SECRET_KEY: str
    SESSION_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"

    ACCESS_TOKEN_KEY: str = "paperwise_access_token"
    ACCESS_TOKEN_TYPE: str = "access"
    ACCESS_TOKEN_EXPIRE_MINUTES: float = 60.0

    REFRESH_TOKEN_KEY: str = "paperwise_refresh_token"
    REFRESH_TOKEN_TYPE: str = "refresh"
    REFRESH_TOKEN_EXPIRE_DAYS: float = 7.0

    TEXT_CHUNK_SIZE: int = 500
    TEXT_CHUNK_OVERLAP: int = 50
    # Upload safety: a small file can unpack to something huge, so cap what we are willing to parse.
    MAX_DOCX_UNZIPPED_MB: int = 50
    MAX_DOCX_ENTRIES: int = 2000
    MAX_PDF_PAGES: int = 1000
    MAX_EXTRACTED_CHARS: int = 3_000_000

    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]


settings = Settings()  # type: ignore[call-arg]
