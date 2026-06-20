"""RFC 9457 problem+json error responses and security headers middleware."""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError

_BASE_URL = "https://signalbot.example.com/errors"

_STATUS_TITLES = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    503: "Service Unavailable",
}

_STATUS_TYPES = {
    400: "bad-request",
    401: "unauthorized",
    403: "forbidden",
    404: "not-found",
    405: "method-not-allowed",
    422: "validation-error",
    429: "rate-limit-exceeded",
    500: "internal-error",
    503: "service-unavailable",
}


def _problem(status: int, detail: str, instance: str = "") -> JSONResponse:
    slug = _STATUS_TYPES.get(status, "error")
    return JSONResponse(
        status_code=status,
        content={
            "type": f"{_BASE_URL}/{slug}",
            "title": _STATUS_TITLES.get(status, "Error"),
            "status": status,
            "detail": detail,
            "instance": instance,
        },
        headers={"Content-Type": "application/problem+json"},
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    response = _problem(exc.status_code, detail, str(request.url.path))
    # Preserve any headers the route set (e.g. Retry-After from the rate limiter).
    if exc.headers:
        for key, value in exc.headers.items():
            response.headers[key] = value
    return response


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = exc.errors()
    detail = "; ".join(
        f"{'.'.join(str(loc) for loc in e['loc'])}: {e['msg']}" for e in errors
    )
    return _problem(422, detail, str(request.url.path))


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Attach security headers to every response (defense-in-depth).

    Only headers that are safe for an API backend that the Next.js frontend
    calls from the browser via fetch/EventSource. CSP is intentionally omitted
    here — the API returns JSON/SSE, not HTML, so a page-level CSP is not
    applicable (the frontend sets its own via Next.js headers config).
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"
        return response
