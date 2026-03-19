"""Serviço para buscar posts do blog Forms via API v3."""

from services.forms_http import request_json

FORMS_BLOG_QUERY_URL = "https://www.formsapis.com/blog/v3/posts/query"


def _extract_cover_url(post: dict) -> str | None:
    """Extrai a URL da imagem de capa do post."""
    cover = post.get("coverMedia") or post.get("media") or {}

    # coverMedia.formsMedia
    forms_media = cover.get("formsMedia") or {}
    img = forms_media.get("image") or {}
    info = img.get("imageInfo") or img
    url = info.get("url")
    if url:
        return url

    # coverMedia.image direto
    img2 = cover.get("image") or {}
    url = img2.get("url")
    if url:
        return url

    # thumbnail / heroImage
    for key in ("thumbnail", "heroImage", "featuredImage"):
        node = post.get(key) or {}
        url = node.get("url") or node.get("src")
        if url:
            return url

    return None


def fetch_blog_posts(
    *,
    api_key: str,
    site_id: str,
    limit: int = 5,
) -> list[dict]:
    """Retorna os posts mais recentes do blog Forms."""
    body = {
        "query": {
            "sort": [{"fieldName": "firstPublishedDate", "order": "DESC"}],
            "paging": {"limit": limit},
        },
        "fieldsets": ["METRICS", "URL"],
    }

    data = request_json(
        method="POST",
        url=FORMS_BLOG_QUERY_URL,
        api_key=api_key,
        site_id=site_id,
        body=body,
    )

    posts = data.get("posts") or []
    result = []

    for p in posts:
        metrics = p.get("metrics") or {}
        result.append({
            "id":        p.get("id"),
            "titulo":    p.get("title"),
            "data":      p.get("firstPublishedDate") or p.get("publishedDate"),
            "capa":      _extract_cover_url(p),
            "url":       (p.get("url") or {}).get("url") or (p.get("url") if isinstance(p.get("url"), str) else None),
            "views":     metrics.get("views", 0),
            "likes":     metrics.get("likes", 0),
            "comments":  metrics.get("comments", 0),
        })

    return result
