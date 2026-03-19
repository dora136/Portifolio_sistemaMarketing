from pathlib import Path

import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from routes import home_router, templates_router


class NoCacheHTMLMiddleware(BaseHTTPMiddleware):
    """Impede o navegador de cachear páginas HTML para sempre servir a versão atual."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        content_type = response.headers.get("content-type", "")
        if "text/html" in content_type:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=9000,
        reload=False,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )


app = FastAPI(title="Portfolio Marketing Hub")
app.add_middleware(NoCacheHTMLMiddleware)

BASE_DIR = Path(__file__).resolve().parent
app.mount("/portifolio/static", StaticFiles(directory=str(BASE_DIR / "static")), name="portifolio_static")
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


@app.get("/", include_in_schema=False)
async def root_redirect():
    return RedirectResponse(url="/portifolio/home", status_code=307)


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return FileResponse(BASE_DIR / "static" / "marketing" / "favicon.ico")


app.include_router(templates_router.router)
app.include_router(home_router.router)
