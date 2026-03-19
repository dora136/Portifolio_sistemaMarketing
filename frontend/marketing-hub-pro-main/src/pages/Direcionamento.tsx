import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Search, RefreshCw, Loader2, Paperclip, Mail, Phone, FileText, Calendar, ClipboardList, UserCheck } from "lucide-react";

interface FormsLead {
  id_lead: number;
  submission_id: string | null;
  contact_id: string | null;
  contact_name: string | null;
  form_id: string | null;
  form_name: string | null;
  submission_data: string | null;
  origem: string | null;
  created_date: string | null;
  imported_at: string | null;
  redirecionar: string | null;
  area: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PHONE_RE = /^[\d\s\+\-\(\)]{7,20}$/;

function formatDateTime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "-", time: "" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("pt-BR"),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}

interface Attachment {
  name: string;
  url: string | null;
}

interface ParsedSubmission {
  name: string | null;
  email: string | null;
  phone: string | null;
  attachments: Attachment[];
  extras: string[];
}

function parseSubmission(submission_data: string | null): ParsedSubmission {
  const result: ParsedSubmission = { name: null, email: null, phone: null, attachments: [] as Attachment[], extras: [] };
  if (!submission_data) return result;

  let raw: unknown;
  try { raw = JSON.parse(submission_data); } catch { return result; }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result;

  const item = raw as Record<string, unknown>;
  const subs = (item.submissions ?? item.formFieldValues ?? item) as Record<string, unknown>;

  if (!subs || typeof subs !== "object" || Array.isArray(subs)) return result;

  for (const [key, value] of Object.entries(subs)) {
    const k = key.toLowerCase();

    // Anexos: array de objetos com displayName e url
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v && typeof v === "object") {
          const att = v as Record<string, unknown>;
          const dname = att.displayName ?? att.name;
          const url = typeof att.url === "string" ? att.url : null;
          if (typeof dname === "string" && dname.trim()) {
            result.attachments.push({ name: dname.trim(), url });
          }
        }
      }
      continue;
    }

    if (typeof value !== "string" || !value.trim()) continue;
    const v = value.trim();
    if (UUID_RE.test(v)) continue;

    // E-mail: por chave ou valor com @
    if (k.includes("email") || k.includes("e_mail") || k.includes("e-mail")) {
      if (!result.email) result.email = v;
      continue;
    }
    if (!result.email && v.includes("@") && v.includes(".")) {
      result.email = v;
      continue;
    }

    // Telefone: por chave ou padrão numérico
    if (k.includes("telefone") || k.includes("phone") || k.includes("fone") || k.includes("celular") || k.includes("whatsapp")) {
      if (!result.phone) result.phone = v;
      continue;
    }
    if (!result.phone && PHONE_RE.test(v)) {
      result.phone = v;
      continue;
    }

    // Nome: por chave conhecida
    if (k.includes("nome") || k.includes("name") || k.includes("full")) {
      if (!result.name && v.length < 100) { result.name = v; continue; }
    }

    // Extras: textos curtos que não são URL
    if (!v.startsWith("http") && v.length < 150) {
      result.extras.push(v);
    }
  }

  return result;
}

const FORM_NAME_MAP: Record<string, string> = {
  "707e8445": "Análise de Viabilidade",
  "8bee8ca9": "Contato",
};

function displayForm(raw: string | null): string {
  if (!raw) return "—";
  const lower = raw.toLowerCase();
  for (const [prefix, label] of Object.entries(FORM_NAME_MAP)) {
    if (lower.includes(prefix)) return label;
  }
  if (UUID_RE.test(raw)) return `Formulário ${raw.slice(0, 8)}…`;
  return raw;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

function LeadSheet({ lead, open, onClose, onUpdate }: {
  lead: FormsLead | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id_lead: number, redirecionar: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const [localRedirecionar, setLocalRedirecionar] = useState<string | null>(null);
  const isDirty = localRedirecionar !== (lead?.redirecionar ?? null);

  useEffect(() => {
    setLocalRedirecionar(lead?.redirecionar ?? null);
  }, [lead?.id_lead]);

  const { data: colabData } = useQuery<{ colaboradores: string[] }>({
    queryKey: ["forms-colaboradores"],
    queryFn: () => fetch("/portifolio/api/forms/colaboradores").then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: (redirecionar: string | null) =>
      fetch(`/portifolio/api/forms/leads/${lead!.id_lead}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirecionar, area: lead!.area }),
      }).then(r => r.json()),
    onSuccess: (_, redirecionar) => {
      queryClient.invalidateQueries({ queryKey: ["forms-leads"] });
      onUpdate(lead!.id_lead, redirecionar);
      toast.success("Responsável salvo com sucesso.");
    },
    onError: () => {
      toast.error("Erro ao salvar responsável.");
    },
  });

  if (!lead) return null;
  const parsed = parseSubmission(lead.submission_data);
  const dt = formatDateTime(lead.created_date);
  const name = parsed.name ?? lead.contact_name ?? "—";
  const showName = UUID_RE.test(name) ? "—" : name;
  const initials = showName !== "—" ? showName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";

  const colaboradores = colabData?.colaboradores ?? [];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="sr-only">Detalhes do Lead</SheetTitle>

          {/* Avatar + nome */}
          <div className="flex items-center gap-4 pt-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">{showName}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{displayForm(lead.form_name)}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Direcionamento */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Direcionamento</h3>
            <div className="rounded-lg border border-border">
              <div className="flex items-center gap-3 px-4 py-3">
                <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Redirecionar para</p>
                  <Select
                    value={localRedirecionar ?? "__none__"}
                    onValueChange={val => setLocalRedirecionar(val === "__none__" ? null : val)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecionar colaborador..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Nenhum —</SelectItem>
                      {colaboradores.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {isDirty && (
              <Button
                className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
                size="sm"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate(localRedirecionar)}
              >
                {updateMutation.isPending ? (
                  <><Loader2 className="h-3 w-3 animate-spin mr-2" /> Salvando...</>
                ) : (
                  "Salvar responsável"
                )}
              </Button>
            )}
          </section>

          {/* Contato */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Contato</h3>
            <div className="rounded-lg border border-border px-4">
              <InfoRow icon={<Mail className="h-4 w-4" />} label="E-mail" value={parsed.email} />
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Telefone" value={parsed.phone} />
            </div>
          </section>

          {/* Envio */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Envio</h3>
            <div className="rounded-lg border border-border px-4">
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Data" value={`${dt.date} às ${dt.time}`} />
              <InfoRow icon={<ClipboardList className="h-4 w-4" />} label="Formulário" value={displayForm(lead.form_name)} />
            </div>
          </section>

          {/* Outros dados */}
          {parsed.extras.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Outros dados</h3>
              <div className="rounded-lg border border-border px-4">
                {parsed.extras.map((ex, i) => (
                  <div key={i} className="py-3 border-b border-border last:border-0">
                    <p className="text-sm break-words">{ex}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Documentos anexados */}
          {parsed.attachments.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Documentos</h3>
              <div className="rounded-lg border border-border divide-y divide-border">
                {parsed.attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-3 p-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{att.name}</p>
                    </div>
                    {att.url && (
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <Button variant="outline" size="sm" className="text-xs">Baixar</Button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const Direcionamento = () => {
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<FormsLead | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery<{ leads: FormsLead[]; total: number }>({
    queryKey: ["forms-leads"],
    queryFn: () => fetch("/portifolio/api/forms/leads?limit=500").then((r) => r.json()),
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      fetch("/portifolio/api/forms/sync", { method: "POST" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forms-leads"] });
    },
  });

  const leads = data?.leads ?? [];

  const filtered = leads.filter((lead) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const parsed = parseSubmission(lead.submission_data);
    return (
      (parsed.name ?? "").toLowerCase().includes(q) ||
      (parsed.email ?? "").toLowerCase().includes(q) ||
      (parsed.phone ?? "").toLowerCase().includes(q) ||
      (lead.form_name ?? "").toLowerCase().includes(q)
    );
  });

  // Agrupa por formulário para os KPI cards
  const formCounts = leads.reduce<Record<string, number>>((acc, l) => {
    const key = displayForm(l.form_name);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className="mb-2 bg-primary text-primary-foreground">DIRECIONAMENTO</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Envios de Formulário</h1>
            <p className="text-muted-foreground mt-1">
              Leads capturados pelo site Forms via formulários.
            </p>
          </div>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="shrink-0"
          >
            {syncMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sincronizar Forms
          </Button>
        </div>

        {syncMutation.isSuccess && (
          <div className="text-sm text-success font-medium">
            ✓ Sincronizado — {(syncMutation.data as { synced?: number })?.synced ?? 0} envios importados.
          </div>
        )}
        {syncMutation.isError && (
          <div className="text-sm text-destructive font-medium">
            Falha ao sincronizar. Verifique FORMS_API_KEY e FORMS_SITE_ID no .env.
          </div>
        )}

        {/* KPI cards por formulário */}
        {Object.keys(formCounts).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(formCounts).map(([form, count]) => (
              <Card key={form} className="border border-border shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{form}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Busca */}
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail, telefone ou formulário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card className="border border-border shadow-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              Envios ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Carregando...
              </div>
            ) : isError ? (
              <div className="text-center py-16 text-destructive text-sm">
                Erro ao carregar leads.
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Nenhum envio encontrado.{" "}
                <button className="underline text-primary" onClick={() => syncMutation.mutate()}>
                  Sincronizar agora
                </button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead className="w-36">Horário do envio</TableHead>
                    <TableHead>Nome Completo</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Formulário</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Documento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => {
                    const parsed = parseSubmission(lead.submission_data);
                    const dt = formatDateTime(lead.created_date);
                    const name = parsed.name ?? lead.contact_name ?? "—";
                    const showName = UUID_RE.test(name) ? "—" : name;

                    return (
                      <TableRow
                        key={lead.id_lead}
                        className="hover:bg-secondary/30 transition-colors align-top cursor-pointer"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <TableCell className="text-xs">
                          <p className="font-medium">{dt.date}</p>
                          <p className="text-muted-foreground">{dt.time}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {showName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium">{showName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {parsed.email ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {parsed.phone ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs">{displayForm(lead.form_name)}</span>
                        </TableCell>
                        <TableCell>
                          {lead.redirecionar ? (
                            <Badge variant="secondary" className="text-xs font-normal">
                              {lead.redirecionar}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {parsed.attachments.length > 0 ? (
                              parsed.attachments.map((att, i) => (
                                <div key={i} className="flex items-center gap-1 text-xs">
                                  <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  <span className="truncate max-w-[160px] text-muted-foreground">{att.name}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <LeadSheet
        lead={selectedLead}
        open={selectedLead !== null}
        onClose={() => setSelectedLead(null)}
        onUpdate={(id_lead, redirecionar) => {
          setSelectedLead(prev => prev && prev.id_lead === id_lead ? { ...prev, redirecionar } : prev);
        }}
      />
    </AppLayout>
  );
};

export default Direcionamento;
