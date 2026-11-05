from starlette.datastructures import Headers
from starlette.responses import JSONResponse

from .config import settings


class RequestProtection:
    """CSRF por cabeçalho não simples + Origin exato; limita corpo antes do parser."""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = Headers(scope=scope)
        origin = headers.get("origin")
        if origin is not None and origin not in settings.cors_origins_list:
            return await JSONResponse({"detail": "Origem não autorizada"}, 403)(scope, receive, send)
        unsafe = scope["method"] not in ("GET", "HEAD", "OPTIONS")
        if unsafe:
            if headers.get("x-csrf-protection") != "1":
                return await JSONResponse({"detail": "Cabeçalho CSRF obrigatório"}, 403)(scope, receive, send)
            is_upload = scope["path"].rstrip("/") in ("/upload", "/upload/document")
            content_type = headers.get("content-type", "").split(";")[0].lower()
            if scope["method"] in ("POST", "PUT", "PATCH") and scope["path"] != "/auth/logout":
                expected = "multipart/form-data" if is_upload else "application/json"
                if content_type != expected:
                    return await JSONResponse({"detail": "Content-Type inválido"}, 415)(scope, receive, send)
            max_bytes = 5 * 1024 * 1024 + 64 * 1024 if is_upload else 64 * 1024
            try:
                length = int(headers.get("content-length", "0"))
                if length < 0:
                    raise ValueError()
            except ValueError:
                return await JSONResponse({"detail": "Content-Length inválido"}, 400)(scope, receive, send)
            if length > max_bytes:
                return await JSONResponse({"detail": "Corpo da requisição excede o limite"}, 413)(scope, receive, send)
            body = bytearray()
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                body.extend(message.get("body", b""))
                if len(body) > max_bytes:
                    return await JSONResponse({"detail": "Corpo da requisição excede o limite"}, 413)(scope, receive, send)
                if not message.get("more_body", False):
                    break
            delivered = False

            async def bounded_receive():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {"type": "http.request", "body": bytes(body), "more_body": False}
                return await receive()

            downstream_receive = bounded_receive
        else:
            downstream_receive = receive

        async def secure_send(message):
            if message["type"] == "http.response.start":
                extra = [(b"x-content-type-options", b"nosniff"), (b"cache-control", b"no-store")]
                if settings.environment == "production":
                    extra.append((b"strict-transport-security", b"max-age=31536000"))
                message["headers"] = list(message.get("headers", [])) + extra
            await send(message)

        await self.app(scope, downstream_receive, secure_send)
