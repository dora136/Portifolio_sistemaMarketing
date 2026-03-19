"""Serviço para buscar dados do Google Analytics 4 via Data API."""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any


def _resolve_path(credentials_path: str) -> str:
    """Resolve o caminho do arquivo de credenciais relativo ao BASE_DIR do projeto."""
    from pathlib import Path
    p = Path(credentials_path)
    if p.is_absolute():
        return str(p)
    # Tenta relativo ao diretório deste arquivo (services/ -> ..)
    base = Path(__file__).resolve().parent.parent
    resolved = base / p
    if resolved.exists():
        return str(resolved)
    # Fallback: relativo ao cwd
    return str(p)


def _client(credentials_path: str):
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.oauth2 import service_account

    creds = service_account.Credentials.from_service_account_file(
        _resolve_path(credentials_path),
        scopes=["https://www.googleapis.com/auth/analytics.readonly"],
    )
    return BetaAnalyticsDataClient(credentials=creds)


def fetch_sessions_over_time(
    *,
    property_id: str,
    credentials_path: str,
    days: int = 30,
) -> list[dict[str, Any]]:
    """Sessões por dia nos últimos N dias."""
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
        OrderBy,
    )

    client = _client(credentials_path)
    today = date.today()
    start = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    end = today.strftime("%Y-%m-%d")

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="date")],
        metrics=[Metric(name="sessions")],
        date_ranges=[DateRange(start_date=start, end_date=end)],
        order_bys=[OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name="date"))],
    )
    response = client.run_report(request)

    result = []
    for row in response.rows:
        raw_date = row.dimension_values[0].value  # YYYYMMDD
        iso_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}"
        result.append({"date": iso_date, "value": int(row.metric_values[0].value)})
    return result


def fetch_new_vs_returning(
    *,
    property_id: str,
    credentials_path: str,
    days: int = 30,
) -> list[dict[str, Any]]:
    """Visitantes novos vs recorrentes."""
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
    )

    client = _client(credentials_path)
    today = date.today()
    start = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    end = today.strftime("%Y-%m-%d")

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="newVsReturning")],
        metrics=[Metric(name="sessions")],
        date_ranges=[DateRange(start_date=start, end_date=end)],
    )
    response = client.run_report(request)

    label_map = {"new": "Novos visitantes", "returning": "Recorrentes"}
    color_map = {"new": "hsl(228, 33%, 43%)", "returning": "hsl(200, 60%, 55%)"}

    result = []
    for row in response.rows:
        key = row.dimension_values[0].value
        result.append({
            "name": label_map.get(key, key),
            "value": int(row.metric_values[0].value),
            "color": color_map.get(key, "hsl(200, 60%, 55%)"),
        })
    return result


def fetch_by_device(
    *,
    property_id: str,
    credentials_path: str,
    days: int = 30,
) -> list[dict[str, Any]]:
    """Sessões por categoria de dispositivo."""
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
    )

    client = _client(credentials_path)
    today = date.today()
    start = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    end = today.strftime("%Y-%m-%d")

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="deviceCategory")],
        metrics=[Metric(name="sessions")],
        date_ranges=[DateRange(start_date=start, end_date=end)],
    )
    response = client.run_report(request)

    label_map = {"mobile": "Mobile", "desktop": "Desktop", "tablet": "Tablet"}
    color_map = {
        "mobile":  "hsl(25, 97%, 55%)",
        "desktop": "hsl(228, 33%, 43%)",
        "tablet":  "hsl(200, 60%, 55%)",
    }

    result = []
    for row in response.rows:
        key = row.dimension_values[0].value.lower()
        result.append({
            "name": label_map.get(key, key.capitalize()),
            "value": int(row.metric_values[0].value),
            "color": color_map.get(key, "hsl(200, 17%, 55%)"),
        })
    return result


def fetch_by_day_of_week(
    *,
    property_id: str,
    credentials_path: str,
    days: int = 30,
) -> list[dict[str, Any]]:
    """Média de sessões por dia da semana."""
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
    )

    client = _client(credentials_path)
    today = date.today()
    start = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    end = today.strftime("%Y-%m-%d")

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="dayOfWeek")],
        metrics=[Metric(name="sessions")],
        date_ranges=[DateRange(start_date=start, end_date=end)],
    )
    response = client.run_report(request)

    # GA4 retorna 0=domingo, 1=segunda, ..., 6=sabado
    day_labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    order = [1, 2, 3, 4, 5, 6, 0]  # Seg→Dom

    raw: dict[int, int] = {}
    for row in response.rows:
        dow = int(row.dimension_values[0].value)
        raw[dow] = int(row.metric_values[0].value)

    weeks = max(1, days // 7)
    return [
        {"dia": day_labels[i], "total": round(raw.get(i, 0) / weeks)}
        for i in order
    ]


def fetch_by_country(
    *,
    property_id: str,
    credentials_path: str,
    days: int = 30,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Top países por sessões."""
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
        OrderBy,
    )

    client = _client(credentials_path)
    today = date.today()
    start = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    end = today.strftime("%Y-%m-%d")

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="country")],
        metrics=[Metric(name="sessions")],
        date_ranges=[DateRange(start_date=start, end_date=end)],
        order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
        limit=limit,
    )
    response = client.run_report(request)

    rows = [
        {"country": row.dimension_values[0].value, "sessions": int(row.metric_values[0].value)}
        for row in response.rows
    ]
    total = sum(r["sessions"] for r in rows) or 1
    for r in rows:
        r["pct"] = round(r["sessions"] / total * 100)
    return rows


def fetch_kpi_summary(
    *,
    property_id: str,
    credentials_path: str,
) -> dict[str, Any]:
    """KPIs principais: sessões, visualizações de página e visitantes únicos.
    Retorna totais dos últimos 30 dias, hoje, ontem e variação vs período anterior."""
    from google.analytics.data_v1beta.types import (
        DateRange,
        Metric,
        RunReportRequest,
    )

    client = _client(credentials_path)

    def _run(*ranges: tuple[str, str]) -> list[dict[str, int]]:
        req = RunReportRequest(
            property=f"properties/{property_id}",
            metrics=[
                Metric(name="sessions"),
                Metric(name="screenPageViews"),
                Metric(name="activeUsers"),
            ],
            date_ranges=[DateRange(start_date=s, end_date=e) for s, e in ranges],
        )
        resp = client.run_report(req)
        result = []
        for row in resp.rows:
            result.append({
                "sessions": int(row.metric_values[0].value),
                "page_views": int(row.metric_values[1].value),
                "unique_visitors": int(row.metric_values[2].value),
            })
        while len(result) < len(ranges):
            result.append({"sessions": 0, "page_views": 0, "unique_visitors": 0})
        return result

    period = _run(("30daysAgo", "today"), ("60daysAgo", "31daysAgo"))
    daily  = _run(("today", "today"), ("yesterday", "yesterday"))

    current, previous = period[0], period[1]
    today_d, yest_d   = daily[0], daily[1]

    def trend(curr: int, prev: int) -> int:
        if prev == 0:
            return 100 if curr > 0 else 0
        return round((curr - prev) / prev * 100)

    return {
        "sessions": {
            "total": current["sessions"],
            "today": today_d["sessions"],
            "yesterday": yest_d["sessions"],
            "trend": trend(current["sessions"], previous["sessions"]),
        },
        "page_views": {
            "total": current["page_views"],
            "today": today_d["page_views"],
            "yesterday": yest_d["page_views"],
            "trend": trend(current["page_views"], previous["page_views"]),
        },
        "unique_visitors": {
            "total": current["unique_visitors"],
            "today": today_d["unique_visitors"],
            "yesterday": yest_d["unique_visitors"],
            "trend": trend(current["unique_visitors"], previous["unique_visitors"]),
        },
    }


def fetch_behavior_overview(
    *,
    property_id: str,
    credentials_path: str,
    days: int = 30,
) -> dict[str, Any]:
    """Comportamento: duração média, páginas/sessão, bounce rate e top páginas."""
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
        OrderBy,
    )

    client = _client(credentials_path)
    curr_range = DateRange(start_date=f"{days}daysAgo", end_date="today", name="current")
    prev_range = DateRange(
        start_date=f"{days * 2}daysAgo", end_date=f"{days + 1}daysAgo", name="previous"
    )

    def _trend(c: float, p: float) -> int:
        if p == 0:
            return 0
        return round((c - p) / p * 100)

    def _fmt_duration(secs: float) -> str:
        s = int(secs)
        m, s = divmod(s, 60)
        return f"{m}m {s:02d}s"

    # 1. Métricas agregadas (2 períodos em 1 chamada)
    agg = client.run_report(RunReportRequest(
        property=f"properties/{property_id}",
        metrics=[
            Metric(name="averageSessionDuration"),
            Metric(name="screenPageViewsPerSession"),
            Metric(name="bounceRate"),
        ],
        date_ranges=[curr_range, prev_range],
    ))
    periods: dict[str, dict] = {}
    for row in agg.rows:
        dr = row.dimension_values[0].value if row.dimension_values else "current"
        periods[dr] = {
            "avg_duration":      float(row.metric_values[0].value),
            "pages_per_session": float(row.metric_values[1].value),
            "bounce_rate":       float(row.metric_values[2].value) * 100,
        }
    curr = periods.get("current",  {"avg_duration": 0.0, "pages_per_session": 0.0, "bounce_rate": 0.0})
    prev = periods.get("previous", {"avg_duration": 0.0, "pages_per_session": 0.0, "bounce_rate": 0.0})

    # 2. Top páginas com trend (2 períodos em 1 chamada)
    pages_resp = client.run_report(RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="pagePath")],
        metrics=[Metric(name="screenPageViews")],
        date_ranges=[curr_range, prev_range],
        order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"), desc=True)],
        limit=10,
    ))
    pages_map: dict[str, dict[str, int]] = {}
    for row in pages_resp.rows:
        path  = row.dimension_values[0].value
        dr    = row.dimension_values[1].value if len(row.dimension_values) > 1 else "current"
        views = int(row.metric_values[0].value)
        if path not in pages_map:
            pages_map[path] = {"current": 0, "previous": 0}
        pages_map[path][dr] = views

    top_pages = sorted(
        [
            {"path": path, "views": d["current"], "trend": _trend(d["current"], d["previous"])}
            for path, d in pages_map.items()
            if d["current"] > 0
        ],
        key=lambda x: x["views"],
        reverse=True,
    )[:5]

    return {
        "avg_duration":      {"value": _fmt_duration(curr["avg_duration"]),      "trend": _trend(curr["avg_duration"],      prev["avg_duration"])},
        "pages_per_session": {"value": round(curr["pages_per_session"], 1),       "trend": _trend(curr["pages_per_session"], prev["pages_per_session"])},
        "bounce_rate":       {"value": round(curr["bounce_rate"], 1),             "trend": _trend(curr["bounce_rate"],       prev["bounce_rate"])},
        "top_pages": top_pages,
    }


def fetch_blog_views_over_time(
    *,
    property_id: str,
    credentials_path: str,
    days: int = 30,
) -> list[dict[str, Any]]:
    """Visualizações de posts de blog por dia (paths contendo /post)."""
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
        OrderBy,
        FilterExpression,
        Filter,
    )

    client = _client(credentials_path)
    today = date.today()
    start = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    end = today.strftime("%Y-%m-%d")

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="date")],
        metrics=[Metric(name="screenPageViews")],
        date_ranges=[DateRange(start_date=start, end_date=end)],
        dimension_filter=FilterExpression(
            filter=Filter(
                field_name="pagePath",
                string_filter=Filter.StringFilter(
                    value="/post",
                    match_type=Filter.StringFilter.MatchType.CONTAINS,
                ),
            )
        ),
        order_bys=[OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name="date"))],
    )
    response = client.run_report(request)

    result = []
    for row in response.rows:
        raw_date = row.dimension_values[0].value
        iso_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}"
        result.append({"date": iso_date, "value": int(row.metric_values[0].value)})
    return result


def fetch_blog_sources(
    *,
    property_id: str,
    credentials_path: str,
    days: int = 30,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Fontes de tráfego para posts de blog."""
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
        OrderBy,
        FilterExpression,
        Filter,
    )

    client = _client(credentials_path)
    today = date.today()
    start = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    end = today.strftime("%Y-%m-%d")

    label_map = {
        "Organic Search": "Google (Orgânico)",
        "Direct":         "Direto",
        "Organic Social": "Redes Sociais",
        "Email":          "E-mail",
        "Referral":       "Referência",
        "Paid Search":    "Pesquisa Paga",
    }
    color_map = {
        "Organic Search": "hsl(150, 40%, 45%)",
        "Direct":         "hsl(228, 33%, 43%)",
        "Organic Social": "hsl(270, 30%, 50%)",
        "Email":          "hsl(25, 97%, 55%)",
        "Referral":       "hsl(200, 60%, 45%)",
        "Paid Search":    "hsl(200, 60%, 45%)",
    }

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="sessionDefaultChannelGroup")],
        metrics=[Metric(name="screenPageViews")],
        date_ranges=[DateRange(start_date=start, end_date=end)],
        dimension_filter=FilterExpression(
            filter=Filter(
                field_name="pagePath",
                string_filter=Filter.StringFilter(
                    value="/post",
                    match_type=Filter.StringFilter.MatchType.CONTAINS,
                ),
            )
        ),
        order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"), desc=True)],
        limit=limit,
    )
    response = client.run_report(request)

    rows = [
        {
            "source": label_map.get(row.dimension_values[0].value, row.dimension_values[0].value),
            "views":  int(row.metric_values[0].value),
            "color":  color_map.get(row.dimension_values[0].value, "hsl(200, 17%, 55%)"),
        }
        for row in response.rows
    ]
    total = sum(r["views"] for r in rows) or 1
    for r in rows:
        r["pct"] = round(r["views"] / total * 100)
    return rows


def fetch_pageviews_over_time(
    *,
    property_id: str,
    credentials_path: str,
    days: int = 30,
) -> list[dict[str, Any]]:
    """Visualizações de página por dia nos últimos N dias."""
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
        OrderBy,
    )

    client = _client(credentials_path)
    today = date.today()
    start = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    end = today.strftime("%Y-%m-%d")

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="date")],
        metrics=[Metric(name="screenPageViews")],
        date_ranges=[DateRange(start_date=start, end_date=end)],
        order_bys=[OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name="date"))],
    )
    response = client.run_report(request)

    result = []
    for row in response.rows:
        raw_date = row.dimension_values[0].value
        iso_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}"
        result.append({"date": iso_date, "value": int(row.metric_values[0].value)})
    return result


def fetch_visitors_over_time(
    *,
    property_id: str,
    credentials_path: str,
    days: int = 30,
) -> list[dict[str, Any]]:
    """Visitantes únicos (activeUsers) por dia nos últimos N dias."""
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
        OrderBy,
    )

    client = _client(credentials_path)
    today = date.today()
    start = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    end = today.strftime("%Y-%m-%d")

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="date")],
        metrics=[Metric(name="activeUsers")],
        date_ranges=[DateRange(start_date=start, end_date=end)],
        order_bys=[OrderBy(dimension=OrderBy.DimensionOrderBy(dimension_name="date"))],
    )
    response = client.run_report(request)

    result = []
    for row in response.rows:
        raw_date = row.dimension_values[0].value
        iso_date = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}"
        result.append({"date": iso_date, "value": int(row.metric_values[0].value)})
    return result


def fetch_by_source(
    *,
    property_id: str,
    credentials_path: str,
    days: int = 30,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Sessões por fonte de tráfego (defaultChannelGroup)."""
    from google.analytics.data_v1beta.types import (
        DateRange,
        Dimension,
        Metric,
        RunReportRequest,
        OrderBy,
    )

    client = _client(credentials_path)
    today = date.today()
    start = (today - timedelta(days=days)).strftime("%Y-%m-%d")
    end = today.strftime("%Y-%m-%d")

    request = RunReportRequest(
        property=f"properties/{property_id}",
        dimensions=[Dimension(name="sessionDefaultChannelGroup")],
        metrics=[Metric(name="sessions")],
        date_ranges=[DateRange(start_date=start, end_date=end)],
        order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="sessions"), desc=True)],
        limit=limit,
    )
    response = client.run_report(request)

    icon_map = {
        "Organic Search":  "search",
        "Direct":          "globe",
        "Organic Social":  "share2",
        "Email":           "mail",
        "Referral":        "link2",
        "Paid Search":     "search",
        "Paid Social":     "share2",
    }
    color_map = {
        "Organic Search": "hsl(150, 40%, 45%)",
        "Direct":         "hsl(228, 33%, 43%)",
        "Organic Social": "hsl(270, 30%, 50%)",
        "Email":          "hsl(25, 97%, 55%)",
        "Referral":       "hsl(200, 60%, 45%)",
    }
    label_map = {
        "Organic Search": "Pesquisa orgânica",
        "Direct":         "Direto",
        "Organic Social": "Redes sociais",
        "Email":          "E-mail",
        "Referral":       "Referência",
        "Paid Search":    "Pesquisa paga",
        "Paid Social":    "Social pago",
    }

    rows = [
        {
            "source": label_map.get(row.dimension_values[0].value, row.dimension_values[0].value),
            "sessions": int(row.metric_values[0].value),
            "icon": icon_map.get(row.dimension_values[0].value, "globe"),
            "color": color_map.get(row.dimension_values[0].value, "hsl(200, 17%, 55%)"),
        }
        for row in response.rows
    ]
    total = sum(r["sessions"] for r in rows) or 1
    for r in rows:
        r["pct"] = round(r["sessions"] / total * 100)
    return rows
