import json
import urllib.error
import urllib.request


class FormsApiError(RuntimeError):
    def __init__(self, message: str, *, status_code: int | None = None, response_text: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_text = response_text


def request_json(
    *,
    method: str,
    url: str,
    token: str | None = None,
    api_key: str | None = None,
    site_id: str | None = None,
    body: dict | None = None,
    timeout_s: float = 20.0,
) -> dict:
    headers = {
        "Accept": "application/json",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    elif token:
        headers["Authorization"] = f"Bearer {token}"
    if site_id:
        headers["forms-site-id"] = site_id

    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url=url, method=method.upper(), data=data, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            raw = resp.read()
            if not raw:
                return {}
            text = raw.decode("utf-8", errors="replace").strip()
            if not text:
                return {}
            return json.loads(text)
    except urllib.error.HTTPError as exc:
        try:
            response_text = exc.read().decode("utf-8", errors="replace")
        except Exception:
            response_text = None
        raise FormsApiError(
            f"Forms API HTTP {exc.code} em {url}",
            status_code=int(getattr(exc, "code", 0) or 0),
            response_text=response_text,
        ) from exc
    except urllib.error.URLError as exc:
        raise FormsApiError(f"Falha de rede chamando Forms API em {url}") from exc
    except json.JSONDecodeError as exc:
        raise FormsApiError(f"Resposta não-JSON da Forms API em {url}") from exc
