from fastapi import FastAPI

from app.api.routes import router

app = FastAPI(
    title="CareSure AI Service",
    description="AI-service scaffold; claim auditing is currently served by the backend API.",
    version="0.1.0",
)
app.include_router(router)
