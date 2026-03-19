import { useQuery } from "@tanstack/react-query";
import { useMemo, memo } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Newspaper, Eye, MousePointerClick, MonitorPlay, TrendingUp, TrendingDown, Search, Heart, MessageCircle, PlusCircle, ExternalLink } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

interface GA4KpiMetric {
  total: number;
  today: number;
  yesterday: number;
  trend: number;
}

interface GA4KpiSummary {
  ok: boolean;
  sessions: GA4KpiMetric;
  page_views: GA4KpiMetric;
  unique_visitors: GA4KpiMetric;
}

interface FormsLead {
  id_lead: number;
  contact_name: string | null;
  form_name: string | null;
  submission_data: string | null;
  origem: string | null;
  created_date: string | null;
  imported_at: string | null;
}

interface BlogPost {
  id: string | null;
  titulo: string | null;
  data: string | null;
  capa: string | null;
  url: string | null;
  views: number;
  likes: number;
  comments: number;
}

const BLOG_POSTS_FALLBACK: BlogPost[] = [];

interface CanalPost {
  id_noticia: number;
  titulo: string | null;
  status_post: string | null;
  importancia: boolean | null;
  area: string | null;
}

const PIE_COLORS = [
  "hsl(228, 33%, 43%)",
  "hsl(25, 97%, 55%)",
  "hsl(21, 85%, 50%)",
  "hsl(200, 17%, 55%)",
  "hsl(150, 40%, 45%)",
  "hsl(270, 30%, 50%)",
];

function getMonthLabel(iso: string | null): string {
  if (!iso) return "?";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

function getDayLabel(iso: string | null): string {
  if (!iso) return "?";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("pt-BR", { dateStyle: "short" });
}

function computeLeadsPerMonth(leads: FormsLead[]) {
  const counts: Record<string, number> = {};
  leads.forEach((l) => {
    const key = getMonthLabel(l.created_date ?? l.imported_at);
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return Object.entries(counts)
    .slice(-6)
    .map(([mes, total]) => ({ mes, total }));
}

function computeLeadsPerDay(leads: FormsLead[]) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const counts: Record<string, number> = {};
  leads.forEach((l) => {
    const iso = l.created_date ?? l.imported_at;
    if (!iso) return;
    const d = new Date(iso);
    if (d < sevenDaysAgo) return;
    const key = getDayLabel(iso);
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return Object.entries(counts).map(([dia, total]) => ({ dia, total }));
}

const FORM_NAME_MAP: Record<string, string> = {
  "707e8445": "Análise de Viabilidade",
  "8bee8ca9": "Contato",
};

function normalizeFormName(raw: string | null): string {
  if (!raw) return "Sem formulário";
  for (const [prefix, label] of Object.entries(FORM_NAME_MAP)) {
    if (raw.toLowerCase().includes(prefix)) return label;
  }
  return raw;
}

function computeLeadsPerForm(leads: FormsLead[]) {
  const counts: Record<string, number> = {};
  leads.forEach((l) => {
    const key = normalizeFormName(l.form_name);
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return Object.entries(counts).map(([name, value], i) => ({
    name,
    value,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));
}

function leadsThisMonth(leads: FormsLead[]): number {
  const now = new Date();
  return leads.filter((l) => {
    const iso = l.created_date ?? l.imported_at;
    if (!iso) return false;
    const d = new Date(iso);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
}

/* ── Componentes de chart isolados para evitar re-render no scroll ── */

const BarChartLeads = memo(({ data }: { data: { mes: string; total: number }[] }) => (
  <ResponsiveContainer width="100%" height={280}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(200, 17%, 88%)" />
      <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
      <Tooltip />
      <Bar dataKey="total" name="Leads" fill="hsl(228, 33%, 43%)" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
));

const PieChartForms = memo(({ data }: { data: { name: string; value: number; color: string }[] }) => (
  <ResponsiveContainer width="100%" height={200}>
    <PieChart>
      <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
        {data.map((entry, index) => (
          <Cell key={index} fill={entry.color} />
        ))}
      </Pie>
      <Tooltip />
    </PieChart>
  </ResponsiveContainer>
));

const AreaChartLeads = memo(({ data }: { data: { dia: string; total: number }[] }) => (
  <ResponsiveContainer width="100%" height={250}>
    <AreaChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(200, 17%, 88%)" />
      <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
      <Tooltip />
      <Area
        type="monotone"
        dataKey="total"
        name="Leads"
        fill="hsl(228, 33%, 43%)"
        fillOpacity={0.15}
        stroke="hsl(228, 33%, 43%)"
        strokeWidth={2}
      />
    </AreaChart>
  </ResponsiveContainer>
));

const Dashboard = () => {
  const { data: leadsData, isLoading: leadsLoading } = useQuery<{ leads: FormsLead[]; total: number }>({
    queryKey: ["forms-leads"],
    queryFn: () => fetch("/portifolio/api/forms/leads?limit=500").then((r) => r.json()),
  });

  const { data: postsData, isLoading: postsLoading } = useQuery<{ items: CanalPost[] }>({
    queryKey: ["canal-noticias"],
    queryFn: () => fetch("/portifolio/api/canal-noticias").then((r) => r.json()),
  });

  const { data: blogData } = useQuery<{ posts: BlogPost[] }>({
    queryKey: ["forms-blog-posts"],
    queryFn: () =>
      fetch("/portifolio/api/forms/blog-posts?limit=5")
        .then((r) => r.json())
        .catch(() => ({ posts: [] })),
    staleTime: 5 * 60 * 1000,
  });

  const { data: ga4Kpi } = useQuery<GA4KpiSummary>({
    queryKey: ["ga4-kpi-summary"],
    queryFn: () =>
      fetch("/portifolio/api/ga4/kpi-summary")
        .then((r) => r.json())
        .catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const { data: siteInfo } = useQuery<{ site_id: string }>({
    queryKey: ["forms-site-info"],
    queryFn: () => fetch("/portifolio/api/forms/site-info").then((r) => r.json()),
    staleTime: Infinity,
  });

  const siteId = siteInfo?.site_id ?? "";
  const formsBase = siteId ? `https://manage.forms.com/dashboard/${siteId}` : "https://manage.forms.com";

  const leads      = useMemo(() => leadsData?.leads ?? [],      [leadsData]);
  const posts      = useMemo(() => postsData?.items ?? [],      [postsData]);
  const blogPosts  = useMemo(
    () => (blogData?.posts?.length ? blogData.posts : BLOG_POSTS_FALLBACK),
    [blogData],
  );

  const barData     = useMemo(() => computeLeadsPerMonth(leads), [leads]);
  const areaData    = useMemo(() => computeLeadsPerDay(leads),   [leads]);
  const pieData     = useMemo(() => computeLeadsPerForm(leads),  [leads]);
  const thisMonth   = useMemo(() => leadsThisMonth(leads),       [leads]);
  const recentLeads = useMemo(() => leads.slice(0, 5),           [leads]);

  const analyticsStats = useMemo(() => {
    const s  = ga4Kpi?.sessions;
    const pv = ga4Kpi?.page_views;
    const uv = ga4Kpi?.unique_visitors;
    return [
      {
        label: "Sessões do site",
        value: s ? s.total.toLocaleString("pt-BR") : "—",
        trend: s?.trend ?? null,
        hoje: s?.today ?? null,
        ontem: s?.yesterday ?? null,
        icon: MonitorPlay,
        to: "/analytics/sessions",
      },
      {
        label: "Visualizações da página",
        value: pv ? pv.total.toLocaleString("pt-BR") : "—",
        trend: pv?.trend ?? null,
        hoje: pv?.today ?? null,
        ontem: pv?.yesterday ?? null,
        icon: Eye,
        to: "/analytics/pageviews",
      },
      {
        label: "Visitantes únicos",
        value: uv ? uv.total.toLocaleString("pt-BR") : "—",
        trend: uv?.trend ?? null,
        hoje: uv?.today ?? null,
        ontem: uv?.yesterday ?? null,
        icon: Users,
        to: "/analytics/visitors",
      },
      {
        label: "Cliques para contato",
        value: leadsLoading ? "..." : String(thisMonth),
        trend: null,
        hoje: null,
        ontem: null,
        icon: MousePointerClick,
        to: "/analytics/contacts",
      },
      {
        label: "Total de leads",
        value: leadsLoading ? "..." : String(leads.length),
        trend: null,
        hoje: null,
        ontem: null,
        icon: FileText,
        to: "/direcionamento",
      },
      {
        label: "Visualizações do post",
        value: postsLoading ? "..." : String(posts.reduce((s: number, p: any) => s + (p.views || 0), 0)),
        trend: null,
        hoje: null,
        ontem: null,
        icon: Newspaper,
        to: "/analytics/blog",
      },
    ];
  }, [ga4Kpi, leadsLoading, leads, thisMonth, postsLoading, posts]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Badge className="mb-2 bg-primary text-primary-foreground">DASHBOARD</Badge>
          <h1 className="text-3xl font-bold tracking-tight">Performance do Marketing</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral de leads Forms, formulários e posts.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {analyticsStats.map((stat) => {
            const positivo = stat.trend !== null && stat.trend >= 0;
            const inner = (
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-secondary">
                    <stat.icon className="h-4 w-4 text-primary" />
                  </div>
                  {stat.trend !== null && (
                    <span className={`flex items-center gap-0.5 text-xs font-semibold ${positivo ? "text-emerald-600" : "text-red-500"}`}>
                      {positivo ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(stat.trend)}%
                    </span>
                  )}
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{stat.label}</p>
                {stat.hoje !== null && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {stat.hoje} hoje · {stat.ontem} ontem
                  </p>
                )}
              </CardContent>
            );
            return stat.to ? (
              <Link key={stat.label} to={stat.to} className="block">
                <Card className="border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
                  {inner}
                </Card>
              </Link>
            ) : (
              <Card key={stat.label} className="border border-border shadow-sm h-full">
                {inner}
              </Card>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar Chart - Leads por mês */}
          <Card className="lg:col-span-2 border border-border shadow-sm" style={{ contain: "layout style" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Leads por Mês</CardTitle>
              <p className="text-xs text-muted-foreground">Histórico de envios de formulário</p>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                  Nenhum dado disponível. Sincronize os leads primeiro.
                </div>
              ) : (
                <BarChartLeads data={barData} />
              )}
            </CardContent>
          </Card>

          {/* Pie Chart - Leads por formulário */}
          <Card className="border border-border shadow-sm" style={{ contain: "layout style" }}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Por Formulário</CardTitle>
                  <p className="text-xs text-muted-foreground">Distribuição de origem</p>
                </div>
                <Link to="/direcionamento">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary">
                    Ver todos <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {pieData.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  Sem dados
                </div>
              ) : (
                <>
                  <PieChartForms data={pieData} />
                  <div className="space-y-1.5 mt-2 w-full">
                    {pieData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground truncate">{d.name}</span>
                        <span className="ml-auto font-semibold">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Area Chart + Recent Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Area chart - Leads últimos 7 dias */}
          <Card className="border border-border shadow-sm" style={{ contain: "layout style" }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Últimos 7 Dias</CardTitle>
              <p className="text-xs text-muted-foreground">Leads recebidos por dia</p>
            </CardHeader>
            <CardContent>
              {areaData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                  Nenhum lead nos últimos 7 dias.
                </div>
              ) : (
                <AreaChartLeads data={areaData} />
              )}
            </CardContent>
          </Card>

          {/* Leads recentes */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Leads Recentes</CardTitle>
              <p className="text-xs text-muted-foreground">Últimas entradas do Forms</p>
            </CardHeader>
            <CardContent>
              {recentLeads.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum lead ainda.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentLeads.map((lead) => (
                    <div
                      key={lead.id_lead}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {(lead.contact_name ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{lead.contact_name ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{normalizeFormName(lead.form_name)}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(lead.created_date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Google Search Performance + Blog Posts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Desempenho no Google */}
          <Card className="border border-border shadow-sm overflow-hidden">
            {/* Header com gradiente sutil */}
            <div className="px-5 pt-5 pb-4 border-b border-border bg-secondary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-border flex items-center justify-center shrink-0">
                    <Search className="h-4 w-4 text-[#4285F4]" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Desempenho no Google</CardTitle>
                    <p className="text-[11px] text-muted-foreground">Consultas de pesquisa orgânica</p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-1 rounded-full border border-border">
                  10 fev – 10 mar
                </span>
              </div>

              {/* Totais resumidos */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { label: "Impressões", value: "463" },
                  { label: "Cliques",    value: "110" },
                  { label: "Posição",    value: "1,7" },
                ].map((m) => (
                  <div key={m.label} className="bg-background rounded-lg px-3 py-2 border border-border text-center">
                    <p className="text-base font-bold">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabela de consultas */}
            <div className="px-5 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Principais consultas
              </p>
              <div className="space-y-1">
                {[
                  { query: "orion tech",                        impressoes: 303, cliques: 100, posicao: 2.1 },
                  { query: "bandeira tarifária dezembro 2025",  impressoes: 152, cliques: 5,   posicao: 1.8 },
                  { query: "grupo orion tech",                  impressoes: 8,   cliques: 5,   posicao: 1.1 },
                ].map((row, i) => {
                  const maxImpressoes = 303;
                  const pct = Math.round((row.impressoes / maxImpressoes) * 100);
                  return (
                    <div key={row.query} className="group rounded-lg px-3 py-2.5 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-mono text-muted-foreground/50 w-4 shrink-0">{i + 1}</span>
                          <span className="text-sm font-medium truncate">{row.query}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className="text-xs text-muted-foreground">{row.cliques} cliques</span>
                          <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                            #{row.posicao}
                          </span>
                        </div>
                      </div>
                      {/* Barra de impressões */}
                      <div className="flex items-center gap-2 pl-6">
                        <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/40 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-14 text-right">{row.impressoes} imp.</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Posts do Blog */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Posts do Blog</CardTitle>
                    <p className="text-xs text-muted-foreground">Publicações recentes do site</p>
                  </div>
                </div>
                <a href={`${formsBase}/blog/create-post`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="text-xs gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    Novo Post
                  </Button>
                </a>
              </div>
            </CardHeader>
            <CardContent className="pt-2 space-y-0">
              {blogPosts.map((post, i) => {
                const dataFmt = post.data
                  ? new Date(post.data).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
                  : "—";
                const Thumbnail = () => (
                  <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-secondary flex items-center justify-center">
                    {post.capa ? (
                      <img
                        src={post.capa}
                        alt={post.titulo ?? ""}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                );
                return (
                  <div key={post.id ?? i} className="flex gap-3 py-3 border-b border-border last:border-0">
                    {/* Thumbnail clicável */}
                    {post.url ? (
                      <a href={post.url} target="_blank" rel="noopener noreferrer" className="shrink-0 hover:opacity-80 transition-opacity">
                        <Thumbnail />
                      </a>
                    ) : (
                      <Thumbnail />
                    )}

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      {post.url ? (
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium leading-snug line-clamp-2 hover:text-primary transition-colors"
                        >
                          {post.titulo ?? "—"}
                        </a>
                      ) : (
                        <p className="text-sm font-medium leading-snug line-clamp-2">{post.titulo ?? "—"}</p>
                      )}
                      <p className="text-[11px] text-primary mt-0.5">Publicado em {dataFmt}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.views}</span>
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.likes}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{post.comments}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Posts Central de Conteudo */}
        {posts.length > 0 && (
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                Posts Recentes — Central de Conteudo
              </CardTitle>
              <p className="text-xs text-muted-foreground">Últimas publicações internas</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {posts.slice(0, 6).map((post) => (
                  <div
                    key={post.id_noticia}
                    className="p-3 rounded-lg border border-border bg-secondary/20 space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium line-clamp-2 flex-1">{post.titulo ?? "—"}</p>
                      {post.importancia && (
                        <Badge className="text-[9px] bg-accent text-accent-foreground shrink-0">
                          Importante
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {post.area && (
                        <span className="text-[10px] text-muted-foreground">{post.area}</span>
                      )}
                      {post.status_post && (
                        <Badge
                          className={`text-[9px] ml-auto ${
                            post.status_post === "publicado"
                              ? "bg-success text-success-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {post.status_post}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
