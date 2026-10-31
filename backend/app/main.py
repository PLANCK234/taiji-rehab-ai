"""Process health, database readiness and synthetic-only staff access."""

import os
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from app.api import router
from app.assessment_api import router as assessment_router
from app.intake_api import router as intake_router
from app.research_api import router as research_router
from app.runtime import require_demo
from app.training_api import router as training_router

app = FastAPI(title="太极康复研究平台 API", version="0.1.0")
app.include_router(router)
app.include_router(intake_router)
app.include_router(assessment_router)
app.include_router(research_router)
app.include_router(training_router)


@app.middleware("http")
async def request_headers(request: Request, call_next):
    request.state.request_id = str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


def error_response(request: Request, status: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={
            "error": {
                "code": code,
                "message": message,
                "request_id": request.state.request_id,
                "details": {},
            }
        },
    )


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException) -> JSONResponse:
    mapping = {
        401: ("AUTH_REQUIRED", "身份验证失败"),
        403: ("FORBIDDEN", "没有访问权限"),
        404: ("NOT_FOUND", "资源不存在"),
        409: ("VERSION_CONFLICT", "请求与现有记录冲突"),
        422: ("INVALID_INPUT", "输入格式无效"),
        429: ("RATE_LIMITED", "尝试次数过多"),
        503: ("SERVICE_UNAVAILABLE", "服务暂不可用"),
    }
    code, message = mapping.get(exc.status_code, ("REQUEST_FAILED", "请求未完成"))
    return error_response(request, exc.status_code, code, message)


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    return error_response(request, 422, "INVALID_INPUT", "输入格式无效")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
def ready() -> dict[str, str]:
    require_demo()
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise HTTPException(status_code=503, detail="database not configured")
    try:
        engine = create_engine(database_url, pool_pre_ping=True)
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        engine.dispose()
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="database unavailable") from exc
    return {"status": "ready"}
