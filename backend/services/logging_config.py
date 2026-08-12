import logging
import sys
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from services import metrics

logger = logging.getLogger("findx")


def configure_logging() -> None:
    """Consistent, greppable log format across the whole app - uvicorn's
    own access logs, our request middleware, and every existing print()
    call in services/* (error paths for Gemini/AI failures, sqlite-vec
    degradation, etc.) all end up readable the same way in Render's log
    viewer instead of an unstructured mix of formats."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    ))
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.INFO)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Attaches a request_id to every request (reusing an incoming
    X-Request-ID if the client/proxy already set one, so traces can be
    correlated end to end) and logs method/path/status/latency for every
    response - the minimum needed to actually debug a production issue
    from Render's log viewer instead of guessing."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
        request.state.request_id = request_id
        start = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            metrics.record_request(500, duration_ms)
            logger.exception(
                f"request_id={request_id} method={request.method} path={request.url.path} "
                f"status=500 duration_ms={duration_ms} client={_client_ip(request)} unhandled_exception=true"
            )
            raise

        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        response.headers["X-Request-ID"] = request_id
        metrics.record_request(response.status_code, duration_ms)
        level = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(
            level,
            f"request_id={request_id} method={request.method} path={request.url.path} "
            f"status={response.status_code} duration_ms={duration_ms} client={_client_ip(request)}"
        )
        return response


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "-"
