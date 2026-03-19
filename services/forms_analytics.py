from __future__ import annotations

from typing import Any

from services.forms_http import FormsApiError, request_json

_ANALYTICS_URL = "https://www.formsapis.com/analytics/v2/data-items/query"


def fetch_analytics(
    *,
    api_key: str,
    site_id: str,
    namespace: str,
    metrics: list[str],
    dimensions: list[str],
    from_date: str,
    to_date: str,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Chama a Forms Analytics REST API v2 e retorna lista de itens com date e valores das metricas."""
    body: dict[str, Any] = {
        "namespace": namespace,
        "metrics": [{"name": m} for m in metrics],
        "dimensions": [{"name": d} for d in dimensions],
        "dateRange": {
            "from": from_date,
            "to": to_date,
        },
        "paging": {
            "limit": limit,
        },
    }

    response = request_json(
        method="POST",
        url=_ANALYTICS_URL,
        api_key=api_key,
        site_id=site_id,
        body=body,
    )

    raw_items: list[dict[str, Any]] = response.get("dataItems") or response.get("items") or []

    result: list[dict[str, Any]] = []
    for item in raw_items:
        row: dict[str, Any] = {}

        # Extrair data das dimensoes (Forms retorna "day" como chave de dimensão)
        dimension_values = item.get("dimensionValues") or item.get("dimensions") or []
        if dimension_values:
            first_dim = dimension_values[0]
            if isinstance(first_dim, dict):
                raw_date = (
                    first_dim.get("value")
                    or first_dim.get("dateValue")
                    or first_dim.get("stringValue")
                    or ""
                )
                # Normaliza para YYYY-MM-DD (Forms pode retornar com hora)
                row["date"] = str(raw_date)[:10] if raw_date else ""
            else:
                row["date"] = str(first_dim)[:10]

        # Extrair valores das metricas
        metric_values = item.get("metricValues") or item.get("metrics") or []
        for i, mv in enumerate(metric_values):
            metric_name = metrics[i] if i < len(metrics) else f"metric_{i}"
            if isinstance(mv, dict):
                row[metric_name] = mv.get("value") or mv.get("intValue") or mv.get("floatValue") or 0
            else:
                row[metric_name] = mv

        result.append(row)

    return result
