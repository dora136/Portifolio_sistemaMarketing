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
  MousePointerClick,
  Users,
  FileText,
  TrendingUp,
  TrendingDown,
  User,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface FormsLead {
  id_lead: number;
  contact_name: string | null;
  form_name: string | null;
  submission_data: any;
  origem: string | null;
  created_date: string | null;
  imported_at: string | null;
}

// ── Form name helpers ────────────────────────────────────────────────────────

const UUID_FORM_RE = /^Formulário\s+[0-9a-f]{6,}/i;

/** Gera mapa de form_name UUID → nome amigável baseado na ordem de frequência */
function buildFormNameMap(leads: FormsLead[]): Record<string, string> {
  const counts: Record<string, number> = {};
  for (const l of leads) {
    const raw = l.form_name ?? "Formulário";
    counts[raw] = (counts[raw] ?? 0) + 1;
  }

  const sorted = Object.entries(counts)
    .filter(([name]) => UUID_FORM_RE.test(name))
    .sort((a, b) => b[1] - a[1]);

  const map: Record<string, string> = {};
  sorted.forEach(([name], i) => {
    map[name] = sorted.length === 1
      ? "Formulário de Contato"
      : `Formulário de Contato ${i + 1}`;
  });
  return map;
}

function friendlyFormName(raw: string | null, nameMap: Record<string, string>): string {
  if (!raw) return "Formulário";
  return nameMap[raw] ?? raw;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAxisDate(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length < 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

function formatTooltipDate(iso: string): string {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return iso; }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ── Cálculos ──────────────────────────────────────────────────────────────────

function leadsPerDay(leads: FormsLead[], days: number): { date: string; value: number }[] {
  const today = new Date();
  const map: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    map[isoDate(d)] = 0;
  }
  for (const lead of leads) {
    const raw = lead.created_date ?? lead.imported_at;
    if (!raw) continue;
    const key = isoDate(new Date(raw));
    if (key in map) map[key]++;
  }
  return Object.entries(map).map(([date, value]) => ({ date, value }));
}

function leadsThisMonth(leads: FormsLead[]): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return leads.filter((l) => {
    const raw = l.created_date ?? l.imported_at;
    if (!raw) return false;
    return new Date(raw) >= start;
  }).length;
}

function leadsLastMonth(leads: FormsLead[]): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end   = new Date(now.getFullYear(), now.getMonth(), 1);
  return leads.filter((l) => {
    const raw = l.created_date ?? l.imported_at;
    if (!raw) return false;
    const d = new Date(raw);
    return d >= start && d < end;
  }).length;
}

function leadsPerForm(leads: FormsLead[], nameMap: Record<string, string>): { form: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const lead of leads) {
    const key = friendlyFormName(lead.form_name, nameMap);
    map[key] = (map[key] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([form, count]) => ({ form, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

const AreaTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg px-3 py-2 shadow-md text-sm">
      <p className="text-muted-foreground text-xs mb-1">{formatTooltipDate(label)}</p>
      <p className="font-semibold">{payload[0].value} lead{payload[0].value !== 1 ? "s" : ""}</p>
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

const AnalyticsContacts = () => {
  const { data: leads = [], isLoading } = useQuery<FormsLead[]>({
    queryKey: ["forms-leads-analytics"],
    queryFn: () =>
      fetch("/portifolio/api/forms/leads?limit=500")
        .then((r) => r.json())
        .then((d) => d.leads ?? [])
        .catch(() => []),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const formNameMap   = useMemo(() => buildFormNameMap(leads),    [leads]);
  const timelineData  = useMemo(() => leadsPerDay(leads, 30),   [leads]);
  const thisMonth     = useMemo(() => leadsThisMonth(leads),     [leads]);
  const lastMonth     = useMemo(() => leadsLastMonth(leads),     [leads]);
  const formBreakdown = useMemo(() => leadsPerForm(leads, formNameMap), [leads, formNameMap]);
  const recentLeads   = useMemo(() => [...leads].sort((a, b) => {
    const da = new Date(a.created_date ?? a.imported_at ?? 0).getTime();
    const db = new Date(b.created_date ?? b.imported_at ?? 0).getTime();
    return db - da;
  }).slice(0, 20), [leads]);

  const trend = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : (thisMonth > 0 ? 100 : 0);
  const strokeColor = "hsl(25, 97%, 55%)";
  const gradId = "grad-contacts";

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
              <h1 className="text-2xl font-bold tracking-tight">Cliques para entrar em contato</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Envios de formulário — últimos 30 dias</p>
            </div>
            <Card className="border border-border shadow-sm">
              <CardContent className="px-5 py-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-secondary">
                  <MousePointerClick className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Total de leads</p>
                  <p className="text-3xl font-extrabold" style={{ color: strokeColor }}>
                    {isLoading ? "..." : leads.length.toLocaleString("pt-BR")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Leads este mês",    icon: MousePointerClick,
              value: isLoading ? "..." : String(thisMonth),
              sub: `${Math.abs(trend)}% vs mês anterior`,
              trend,
            },
            {
              label: "Leads mês anterior", icon: TrendingUp,
              value: isLoading ? "..." : String(lastMonth),
              sub: null, trend: null,
            },
            {
              label: "Total de leads",    icon: Users,
              value: isLoading ? "..." : leads.length.toLocaleString("pt-BR"),
              sub: null, trend: null,
            },
          ].map((m) => {
            const Icon = m.icon;
            const isPos = m.trend !== null && m.trend >= 0;
            return (
              <Card key={m.label} className="border border-border shadow-sm">
                <CardContent className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-1.5 rounded-lg bg-secondary"><Icon className="h-4 w-4 text-primary" /></div>
                    {m.trend !== null && (
                      <span className={`flex items-center gap-0.5 text-xs font-semibold ${isPos ? "text-emerald-600" : "text-red-500"}`}>
                        {isPos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {Math.abs(m.trend)}%
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold" style={{ color: strokeColor }}>{m.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
                  {m.sub && <p className="text-[10px] text-muted-foreground/60 mt-1">{m.sub}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Linha temporal + breakdown de formulários */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
          {/* Área chart */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Leads ao longo do tempo</CardTitle>
              <p className="text-xs text-muted-foreground">Envios de formulário por dia</p>
            </CardHeader>
            <CardContent>
              {isLoading ? <ChartSkeleton /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={timelineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={strokeColor} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={strokeColor} stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(200, 17%, 88%)" />
                    <XAxis dataKey="date" tickFormatter={formatAxisDate} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={28} />
                    <Tooltip content={<AreaTooltip />} />
                    <Area type="monotone" dataKey="value" name="leads" stroke={strokeColor} strokeWidth={2} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Breakdown por formulário */}
          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Leads por formulário</CardTitle>
              <p className="text-xs text-muted-foreground">Total acumulado por origem</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? <ChartSkeleton height={160} /> : formBreakdown.length > 0 ? (
                <>
                  {formBreakdown.map((item, i) => {
                    const maxCount = formBreakdown[0]?.count || 1;
                    const pct = Math.round((item.count / maxCount) * 100);
                    const colors = [
                      "hsl(25, 97%, 55%)", "hsl(228, 33%, 43%)", "hsl(150, 40%, 45%)",
                      "hsl(270, 30%, 50%)", "hsl(200, 60%, 45%)", "hsl(21, 85%, 50%)",
                    ];
                    const color = colors[i % colors.length];
                    return (
                      <div key={item.form}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate max-w-[150px]">{item.form}</span>
                          <span className="text-xs font-semibold tabular-nums">{item.count}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="text-xs text-muted-foreground py-2">Sem dados disponíveis.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabela de contatos recentes */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Contatos e leads</CardTitle>
            <p className="text-xs text-muted-foreground">Últimos envios de formulário</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <ChartSkeleton height={200} /> : recentLeads.length > 0 ? (
              <div className="space-y-0">
                <div className="grid grid-cols-[1fr_140px_100px] gap-2 px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                  <span>Nome / Formulário</span>
                  <span>Data</span>
                  <span>Origem</span>
                </div>
                {recentLeads.map((lead) => (
                  <div key={lead.id_lead} className="grid grid-cols-[1fr_140px_100px] gap-2 px-3 py-2.5 hover:bg-secondary/40 transition-colors items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{lead.contact_name ?? "Sem nome"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{friendlyFormName(lead.form_name, formNameMap)}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">{formatDate(lead.created_date ?? lead.imported_at)}</span>
                    <span className="text-xs text-muted-foreground capitalize">{lead.origem ?? "—"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum contato encontrado.</p>
            )}
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
};

export default AnalyticsContacts;
