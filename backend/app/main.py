"""FastAPI application entry point: `uv run uvicorn app.main:app --reload`."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.core.config import get_settings
from app.core.errors import AppError

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("app")

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Generate styled comments for LinkedIn and X posts with LangChain, LangGraph and Groq.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=exc.to_dict())


@app.exception_handler(RequestValidationError)
async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    first = exc.errors()[0] if exc.errors() else {}
    location = ".".join(str(part) for part in first.get("loc", []) if part != "body")
    message = first.get("msg", "Invalid request").removeprefix("Value error, ")
    if location:
        message = f"{location}: {message}"
    return JSONResponse(status_code=422, content={"error": {"code": "invalid_request", "message": message}})


@app.exception_handler(Exception)
async def handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error", exc_info=exc)
    return JSONResponse(
        status_code=500, content={"error": {"code": "internal_error", "message": "Unexpected server error."}}
    )


app.include_router(router)


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {"name": settings.app_name, "docs": "/docs", "health": "/api/health"}
