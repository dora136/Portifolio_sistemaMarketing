import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Search,
  Globe,
  Share2,
  Mail,
  Link2,
  TrendingUp,
  TrendingDown,
  MonitorPlay,
  Clock,
  FileText,
  MousePointerClick,
  Users,
  Eye,
} from "lucide-react";

// ── Tipos ────────────────────────────────────────────────────────────────────

interface SessionsOverview {
  ok: boolean;
  is_mock: boolean;
  total_sessions: number;
  sessions_over_time:  { date: string; value: number }[];
  visitors_over_time:  { date: string; value: number }[];
  new_vs_returning:    { name: string; value: number; color: string }[];
  by_device:           { name: string; value: number; color: string }[];
  by_day_of_week:      { dia: string; total: number }[];
  by_country:          { country: string; sessions: number; pct: number }[];
  by_source:           { source: string; sessions: number; pct: number; icon: string; color: string }[];
}

interface BehaviorMetric {
  value: string | number;
  trend: number;
}

interface BehaviorOverview {
  ok: boolean;
  pageviews_over_time: { date: string; value: number }[];
  avg_duration:        BehaviorMetric;
  pages_per_session:   BehaviorMetric;
  bounce_rate:         BehaviorMetric;
  top_pages: { path: string; views: number; trend: number }[];
}

// ── Mock fallback ─────────────────────────────────────────────────────────────

const MOCK_DATA: SessionsOverview = {
  ok: true,
  is_mock: true,
  total_sessions: 278,
  sessions_over_time: [],
  visitors_over_time: [],
  new_vs_returning: [
    { name: "Novo",       value: 558, color: "hsl(228, 33%, 43%)" },
    { name: "Recorrente", value: 43,  color: "hsl(200, 60%, 55%)" },
  ],
  by_device: [
    { name: "Desktop", value: 476, color: "hsl(228, 33%, 43%)" },
    { name: "Mobile",  value: 182, color: "hsl(25, 97%, 55%)"  },
    { name: "Tablet",  value: 4,   color: "hsl(200, 60%, 55%)" },
  ],
  by_day_of_week: [
    { dia: "Seg", total: 42 }, { dia: "Ter", total: 38 }, { dia: "Qua", total: 45 },
    { dia: "Qui", total: 51 }, { dia: "Sex", total: 47 }, { dia: "Sáb", total: 28 }, { dia: "Dom", total: 22 },
  ],
  by_country: [
    { country: "Brasil",         sessions: 607, pct: 88 },
    { country: "Estados Unidos", sessions: 25,  pct: 4  },
    { country: "Poland",         sessions: 3,   pct: 1  },
    { country: "India",          sessions: 3,   pct: 1  },
    { country: "Outros",         sessions: 4,   pct: 1  },
  ],
  by_source: [
    { source: "Google (Orgânico)", sessions: 265, pct: 40, icon: "search", color: "hsl(150, 40%, 45%)" },
    { source: "Direto",            sessions: 201, pct: 30, icon: "globe",  color: "hsl(228, 33%, 43%)" },
    { source: "Google (Pago)",     sessions: 106, pct: 16, icon: "search", color: "hsl(25, 97%, 55%)"  },
    { source: "Bing (Orgânico)",   sessions: 16,  pct: 2,  icon: "search", color: "hsl(200, 60%, 45%)" },
    { source: "Facebook (Org.)",   sessions: 10,  pct: 2,  icon: "share2", color: "hsl(270, 30%, 50%)" },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAxisDate(iso: string): string {
  if (!iso) return "";
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

function formatTooltipDate(iso: string): string {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return iso; }
}

const ICON_MAP: Record<string, React.ElementType> = {
  search: Search, globe: Globe, share2: Share2, mail: Mail, link2: Link2,
};

// ── Tooltips ──────────────────────────────────────────────────────────────────

const LineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-md text-sm">
      <p className="text-muted-foreground text-xs mb-1">{formatTooltipDate(label)}</p>
      <p className="font-semibold">{Number(payload[0].value).toLocaleString("pt-BR")} {payload[0].name}</p>
    </div>
  );
};

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-md text-sm">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className="font-semibold">{Number(payload[0].value).toLocaleString("pt-BR")} sessões</p>
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-md text-sm">
      <p className="font-semibold">{payload[0].name}: {Number(payload[0].value).toLocaleString("pt-BR")}</p>
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

const ChartSkeleton = ({ height = 220 }: { height?: number }) => (
  <div className="animate-pulse" style={{ height }}>
    <div className="h-full w-full bg-secondary rounded-lg" />
  </div>
);

// ── Seção de área temporal ────────────────────────────────────────────────────

const AreaTimelineSection = ({
  lineData,
  isLoading,
  title,
  subtitle,
  lineName,
  strokeColor = "hsl(228, 33%, 43%)",
}: {
  lineData: { date: string; value: number }[];
  isLoading: boolean;
  title: string;
  subtitle: string;
  lineName: string;
  strokeColor?: string;
}) => {
  const gradId = `grad-${lineName.replace(/\W/g, "")}`;
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? <ChartSkeleton /> : lineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(200, 17%, 88%)" />
              <XAxis dataKey="date" tickFormatter={formatAxisDate} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={38} />
              <Tooltip content={<LineTooltip />} />
              <Area type="monotone" dataKey="value" name={lineName} stroke={strokeColor} strokeWidth={2} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Sem dados de série temporal disponíveis.</div>
        )}
      </CardContent>
    </Card>
  );
};

// ── Donut charts com número central (Visitantes e Dispositivos) ───────────────

const DonutPairSection = ({ data, isLoading }: { data: SessionsOverview; isLoading: boolean }) => {
  const totalVisitors = data.new_vs_returning.reduce((s, r) => s + r.value, 0);
  const totalSessions = data.by_device.reduce((s, r) => s + r.value, 0);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Visitantes novos vs recorrentes */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Visitantes novos vs. recorrentes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center pb-3">
          {isLoading ? <ChartSkeleton height={190} /> : (
            <>
              <div className="relative w-full" style={{ height: 190 }}>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={data.new_vs_returning} cx="50%" cy="50%" innerRadius={58} outerRadius={82} dataKey="value" labelLine={false} startAngle={90} endAngle={-270}>
                      {data.new_vs_returning.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold tabular-nums" style={{ color: "hsl(228, 33%, 43%)" }}>{totalVisitors.toLocaleString("pt-BR")}</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight mt-0.5">Visitantes<br/>únicos</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-1">
                {data.new_vs_returning.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                    <span>{item.name}</span>
                    <span className="font-semibold text-foreground">{item.value.toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Sessões por dispositivo */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Sessões por dispositivo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center pb-3">
          {isLoading ? <ChartSkeleton height={190} /> : (
            <>
              <div className="relative w-full" style={{ height: 190 }}>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={data.by_device} cx="50%" cy="50%" innerRadius={58} outerRadius={82} dataKey="value" labelLine={false} startAngle={90} endAngle={-270}>
                      {data.by_device.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-extrabold tabular-nums" style={{ color: "hsl(228, 33%, 43%)" }}>{totalSessions.toLocaleString("pt-BR")}</span>
                  <span className="text-[10px] text-muted-foreground text-center leading-tight mt-0.5">Sessões<br/>do site</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3 mt-1">
                {data.by_device.map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                    <span>{item.name}</span>
                    <span className="font-semibold text-foreground">{item.value.toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ── Sidebar: fonte de tráfego ─────────────────────────────────────────────────

const SourceSection = ({ data, isLoading }: { data: SessionsOverview; isLoading: boolean }) => (
  <Card className="border border-border shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-semibold">Sessões por Fonte e categoria</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {isLoading ? <ChartSkeleton height={140} /> : data.by_source.map((item) => {
        const Icon = ICON_MAP[item.icon] ?? Globe;
        return (
          <div key={item.source}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: item.color }} />
                <span className="text-xs font-medium truncate max-w-[130px]">{item.source}</span>
              </div>
              <span className="text-xs font-semibold text-foreground tabular-nums">{item.sessions.toLocaleString("pt-BR")}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, background: item.color }} />
            </div>
          </div>
        );
      })}
    </CardContent>
  </Card>
);

// ── Sidebar: média por dia da semana ──────────────────────────────────────────

const DowSection = ({ data, isLoading }: { data: SessionsOverview; isLoading: boolean }) => (
  <Card className="border border-border shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-semibold">Média de sessões por dia</CardTitle>
    </CardHeader>
    <CardContent>
      {isLoading ? <ChartSkeleton height={160} /> : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.by_day_of_week} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(200, 17%, 88%)" vertical={false} />
            <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={28} />
            <Tooltip content={<BarTooltip />} />
            <Bar dataKey="total" fill="hsl(228, 33%, 43%)" radius={[3, 3, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);

// ── País ──────────────────────────────────────────────────────────────────────

const CountrySection = ({ data, isLoading, title = "Sessões por País" }: { data: SessionsOverview; isLoading: boolean; title?: string }) => (
  <Card className="border border-border shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-base font-semibold">{title}</CardTitle>
      <p className="text-xs text-muted-foreground">Principais origens geográficas</p>
    </CardHeader>
    <CardContent className="space-y-3">
      {isLoading ? <ChartSkeleton height={160} /> : data.by_country.map((item) => (
        <div key={item.country}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">{item.country}</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{item.sessions.toLocaleString("pt-BR")}</span>
              <span className="w-7 text-right">{item.pct}%</span>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: "hsl(228, 33%, 43%)" }} />
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

// ── Comportamento (pageviews) ─────────────────────────────────────────────────

const BehaviorSection = ({ behavior, loading }: { behavior: BehaviorOverview | null | undefined; loading: boolean }) => (
  <div className="space-y-4">
    <h2 className="text-base font-semibold">Visão geral do comportamento</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { label: "Duração média da sessão",     icon: Clock,             value: behavior?.avg_duration.value ?? "—",                                                              trend: behavior?.avg_duration.trend ?? null,      lowerIsBetter: false },
        { label: "Média de páginas por sessão",  icon: FileText,          value: behavior?.pages_per_session.value != null ? String(behavior!.pages_per_session.value) : "—",    trend: behavior?.pages_per_session.trend ?? null, lowerIsBetter: false },
        { label: "Taxa de rejeição",             icon: MousePointerClick, value: behavior?.bounce_rate.value != null ? `${behavior!.bounce_rate.value}%` : "—",                  trend: behavior?.bounce_rate.trend ?? null,       lowerIsBetter: true  },
      ].map((m) => {
        const isPositive = m.trend !== null && (m.lowerIsBetter ? m.trend <= 0 : m.trend >= 0);
        const Icon = m.icon;
        return (
          <Card key={m.label} className="border border-border shadow-sm">
            <CardContent className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-secondary"><Icon className="h-4 w-4 text-primary" /></div>
                {m.trend !== null && (
                  <span className={`flex items-center gap-0.5 text-xs font-semibold ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(m.trend)}%
                  </span>
                )}
              </div>
              {loading ? <div className="h-7 w-20 bg-secondary rounded animate-pulse mt-1" /> : <p className="text-2xl font-bold">{m.value}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
    <Card className="border border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Principais páginas</CardTitle>
        <p className="text-xs text-muted-foreground">Por visualizações nos últimos 30 dias</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? <ChartSkeleton height={140} /> : behavior?.top_pages?.length ? (
          behavior.top_pages.map((page, i) => {
            const maxViews = behavior.top_pages[0]?.views || 1;
            const pct = Math.round((page.views / maxViews) * 100);
            const isUp = page.trend >= 0;
            return (
              <div key={page.path} className="rounded-lg px-3 py-2.5 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-muted-foreground/50 w-4 shrink-0">{i + 1}</span>
                    <span className="text-sm font-medium truncate">{page.path}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${isUp ? "text-emerald-600" : "text-red-500"}`}>
                      {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                      {Math.abs(page.trend)}%
                    </span>
                    <span className="text-xs font-semibold text-foreground tabular-nums">{page.views.toLocaleString("pt-BR")} vis.</span>
                  </div>
                </div>
                <div className="pl-6">
                  <div className="h-1 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary/50 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })
        ) : <p className="text-sm text-muted-foreground py-2">Sem dados disponíveis.</p>}
      </CardContent>
    </Card>
  </div>
);

// ── Componente principal ──────────────────────────────────────────────────────

const Analytics = () => {
  const { pathname } = useLocation();
  const type = pathname.endsWith("pageviews") ? "pageviews"
             : pathname.endsWith("visitors")  ? "visitors"
             : "sessions";

  const { data: behavior, isLoading: behaviorLoading } = useQuery<BehaviorOverview>({
    queryKey: ["ga4-behavior-overview"],
    queryFn: () =>
      fetch("/portifolio/api/ga4/behavior-overview?days=30")
        .then((r) => r.json())
        .catch(() => null),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: raw, isLoading, isError } = useQuery<SessionsOverview>({
    queryKey: ["ga4-sessions-overview"],
    queryFn: () =>
      fetch("/portifolio/api/ga4/sessions-overview?days=30").then((r) => {
        if (!r.ok) throw new Error("erro");
        return r.json();
      }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const data = useMemo<SessionsOverview>(() => {
    if (!raw || isError) return MOCK_DATA;
    return {
      ...MOCK_DATA,
      ...raw,
      sessions_over_time: raw.sessions_over_time?.length ? raw.sessions_over_time : [],
      visitors_over_time:  raw.visitors_over_time?.length  ? raw.visitors_over_time  : [],
    };
  }, [raw, isError]);

  const isMock = !raw || isError || data.is_mock;

  const PAGE_CONFIG: Record<string, { title: string; metricLabel: string; metricValue: string; Icon: React.ElementType }> = {
    sessions:  { title: "Sessões do Site",        metricLabel: "Total de sessões",   metricValue: isLoading ? "..." : data.total_sessions.toLocaleString("pt-BR"),                                                                        Icon: MonitorPlay },
    pageviews: { title: "Visualizações da Página", metricLabel: "Taxa de rejeição",   metricValue: behaviorLoading ? "..." : (behavior?.bounce_rate.value != null ? `${behavior!.bounce_rate.value}%` : "—"),                             Icon: Eye         },
    visitors:  { title: "Visitantes Únicos",       metricLabel: "Visitantes únicos",  metricValue: isLoading ? "..." : (data.new_vs_returning.reduce((s, r) => s + r.value, 0)).toLocaleString("pt-BR"),                                  Icon: Users       },
  };
  const cfg = PAGE_CONFIG[type] ?? PAGE_CONFIG.sessions;

  // Layout em 2 colunas — main + sidebar (igual ao Forms "Visão geral do tráfego")
  const TrafficLayout = ({ isVisitors }: { isVisitors?: boolean }) => (
    <>
      <AreaTimelineSection
        lineData={isVisitors ? data.visitors_over_time : data.sessions_over_time}
        isLoading={isLoading}
        title={isVisitors ? "Visitantes ao longo do tempo" : "Sessões ao longo do tempo"}
        subtitle={isVisitors ? "Visitantes únicos por dia" : "Total de sessões por dia"}
        lineName={isVisitors ? "visitantes" : "sessões"}
        strokeColor={isVisitors ? "hsl(150, 40%, 45%)" : "hsl(228, 33%, 43%)"}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Coluna principal */}
        <div className="space-y-4">
          <DonutPairSection data={data} isLoading={isLoading} />
          <CountrySection
            data={data}
            isLoading={isLoading}
            title={isVisitors ? "Visitantes por País" : "Sessões por País"}
          />
        </div>
        {/* Sidebar */}
        <div className="space-y-4">
          <SourceSection data={data} isLoading={isLoading} />
          <DowSection data={data} isLoading={isLoading} />
          {/* Insights */}
          {!isLoading && data.by_source.length > 0 && (
            <Card className="border border-border shadow-sm bg-secondary/30">
              <CardContent className="px-4 py-3">
                <p className="text-xs font-semibold mb-0.5">Insights de tráfego</p>
                <p className="text-xs text-muted-foreground">
                  Sua origem de tráfego mais popular é <span className="font-semibold text-foreground">{data.by_source[0]?.source}</span>.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Cabeçalho */}
        <div>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Dashboard
          </Link>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <Badge className="mb-1 bg-primary text-primary-foreground text-[10px]">ANALYTICS</Badge>
              <h1 className="text-2xl font-bold tracking-tight">{cfg.title}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Últimos 30 dias</p>
            </div>
            <Card className="border border-border shadow-sm">
              <CardContent className="px-5 py-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-secondary">
                  <cfg.Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{cfg.metricLabel}</p>
                  <p className="text-3xl font-extrabold" style={{ color: "hsl(228, 33%, 43%)" }}>{cfg.metricValue}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {isMock && !isLoading && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            Dados estimados — configure o Google Analytics 4 no .env para dados em tempo real.
          </div>
        )}

        {/* ── Sessões ── */}
        {type === "sessions" && <TrafficLayout />}

        {/* ── Visualizações da página ── */}
        {type === "pageviews" && (
          <>
            <AreaTimelineSection
              lineData={behavior?.pageviews_over_time ?? []}
              isLoading={behaviorLoading}
              title="Visualizações ao longo do tempo"
              subtitle="Total de visualizações de página por dia"
              lineName="visualizações"
              strokeColor="hsl(200, 60%, 45%)"
            />
            <BehaviorSection behavior={behavior} loading={behaviorLoading} />
          </>
        )}

        {/* ── Visitantes únicos ── */}
        {type === "visitors" && <TrafficLayout isVisitors />}

      </div>
    </AppLayout>
  );
};

export default Analytics;
