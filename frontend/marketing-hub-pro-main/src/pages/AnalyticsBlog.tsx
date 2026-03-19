import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  AreaChart,
  Area,
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
  Eye,
  Heart,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  BookOpen,
  Globe,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────────────

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

interface BlogGA4 {
  ok: boolean;
  views_over_time: { date: string; value: number }[];
  total_views: number;
  sources: { source: string; views: number; pct: number; color: string }[];
}

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

function formatPostDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-md text-sm">
      <p className="text-muted-foreground text-xs mb-1">{formatTooltipDate(label)}</p>
      <p className="font-semibold">{Number(payload[0].value).toLocaleString("pt-BR")} visualizações</p>
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

const ChartSkeleton = ({ height = 220 }: { height?: number }) => (
  <div className="animate-pulse" style={{ height }}>
    <div className="h-full w-full bg-secondary rounded-lg" />
  </div>
);

// ── Componente principal ──────────────────────────────────────────────────────

const AnalyticsBlog = () => {
  const { data: posts = [], isLoading: postsLoading } = useQuery<BlogPost[]>({
    queryKey: ["forms-blog-posts-analytics"],
    queryFn: () =>
      fetch("/portifolio/api/forms/blog-posts?limit=20")
        .then((r) => r.json())
        .then((d) => d.posts ?? [])
        .catch(() => []),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const { data: ga4, isLoading: ga4Loading } = useQuery<BlogGA4>({
    queryKey: ["ga4-blog-overview"],
    queryFn: () =>
      fetch("/portifolio/api/ga4/blog-overview?days=30")
        .then((r) => r.json())
        .catch(() => null),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const totalViews    = useMemo(() => posts.reduce((s, p) => s + (p.views    || 0), 0), [posts]);
  const totalLikes    = useMemo(() => posts.reduce((s, p) => s + (p.likes    || 0), 0), [posts]);
  const totalComments = useMemo(() => posts.reduce((s, p) => s + (p.comments || 0), 0), [posts]);
  const engagement    = totalLikes + totalComments;

  // Ordena posts por visualizações (maior primeiro)
  const sortedPosts = useMemo(() => [...posts].sort((a, b) => (b.views || 0) - (a.views || 0)), [posts]);

  const gradId = "grad-blog";
  const strokeColor = "hsl(270, 30%, 50%)";

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
              <h1 className="text-2xl font-bold tracking-tight">Visualizações do Post</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Últimos 30 dias</p>
            </div>
            <Card className="border border-border shadow-sm">
              <CardContent className="px-5 py-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-secondary">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Visualizações do post</p>
                  <p className="text-3xl font-extrabold" style={{ color: strokeColor }}>
                    {postsLoading ? "..." : totalViews.toLocaleString("pt-BR")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Visualizações do post", icon: Eye,            value: postsLoading ? "..." : totalViews.toLocaleString("pt-BR"),    color: strokeColor },
            { label: "Posts publicados",      icon: BookOpen,        value: postsLoading ? "..." : String(posts.length),                  color: "hsl(228, 33%, 43%)" },
            { label: "Engajamento (❤ + 💬)",  icon: Heart,           value: postsLoading ? "..." : engagement.toLocaleString("pt-BR"),    color: "hsl(25, 97%, 55%)" },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} className="border border-border shadow-sm">
                <CardContent className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-secondary"><Icon className="h-4 w-4 text-primary" /></div>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Área temporal + fontes lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
          {/* Área chart GA4 */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Visualizações ao longo do tempo</CardTitle>
              <p className="text-xs text-muted-foreground">Views de posts por dia (GA4)</p>
            </CardHeader>
            <CardContent>
              {ga4Loading ? <ChartSkeleton /> : (ga4?.views_over_time?.length ?? 0) > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={ga4!.views_over_time} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={strokeColor} stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(200, 17%, 88%)" />
                    <XAxis dataKey="date" tickFormatter={formatAxisDate} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={32} />
                    <Tooltip content={<AreaTooltip />} />
                    <Area type="monotone" dataKey="value" name="visualizações" stroke={strokeColor} strokeWidth={2} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Sem dados disponíveis para posts de blog.</div>
              )}
            </CardContent>
          </Card>

          {/* Fontes de tráfego */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Principais fontes de tráfego</CardTitle>
              <p className="text-xs text-muted-foreground">Por visualizações de posts</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {ga4Loading ? <ChartSkeleton height={160} /> : (ga4?.sources?.length ?? 0) > 0 ? (
                ga4!.sources.map((item) => (
                  <div key={item.source}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 shrink-0" style={{ color: item.color }} />
                        <span className="text-xs font-medium truncate max-w-[130px]">{item.source}</span>
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{item.views.toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-2">Sem dados de fonte disponíveis.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabela de posts */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Posts por visualizações</CardTitle>
            <p className="text-xs text-muted-foreground">Todos os posts — ordenados por visualizações</p>
          </CardHeader>
          <CardContent>
            {postsLoading ? <ChartSkeleton height={200} /> : sortedPosts.length > 0 ? (
              <div className="space-y-0">
                {/* Header */}
                <div className="grid grid-cols-[1fr_80px_64px_64px] gap-2 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                  <span>Título do post</span>
                  <span className="text-right">Data</span>
                  <span className="text-right flex items-center justify-end gap-1"><Eye className="h-3 w-3" /> Views</span>
                  <span className="text-right flex items-center justify-end gap-1"><Heart className="h-3 w-3" /><MessageCircle className="h-3 w-3" /></span>
                </div>
                {sortedPosts.map((post, i) => {
                  const maxViews = sortedPosts[0]?.views || 1;
                  const pct = Math.round(((post.views || 0) / maxViews) * 100);
                  return (
                    <div key={post.id ?? i} className="group">
                      <div className="grid grid-cols-[1fr_80px_64px_64px] gap-2 px-3 py-2.5 hover:bg-secondary/40 transition-colors items-center">
                        <div className="min-w-0">
                          <div className="flex items-start gap-1.5">
                            <span className="text-[10px] font-mono text-muted-foreground/40 w-4 shrink-0 mt-0.5">{i + 1}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate leading-tight">{post.titulo ?? "Sem título"}</p>
                              <div className="h-1 bg-border rounded-full overflow-hidden mt-1.5">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: strokeColor }} />
                              </div>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground text-right tabular-nums">{formatPostDate(post.data)}</span>
                        <span className="text-xs font-semibold text-right tabular-nums">{(post.views || 0).toLocaleString("pt-BR")}</span>
                        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{post.likes || 0}</span>
                          <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{post.comments || 0}</span>
                        </div>
                      </div>
                      {/* Link externo se disponível */}
                      {post.url && (
                        <div className="px-3 pb-1 pl-8 hidden group-hover:block">
                          <a href={post.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" />Ver post
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum post encontrado.</p>
            )}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
};

export default AnalyticsBlog;
