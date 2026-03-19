import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Link2,
  MapPin,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface EventoApi {
  id_evento: number | null;
  nome: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  nivel: string | null;
  local: string | null;
  cidade: string | null;
  site: string | null;
  permissoe: string | null;
}

interface Evento {
  id: number;
  titulo: string;
  dataInicio: string;
  dataFim: string;
  importancia: string;
  local: string;
  cidade: string;
  site: string;
  permissoe: string;
}

interface EventosResponse {
  ok: boolean;
  eventos: EventoApi[];
}

interface EventoCreateResponse {
  ok: boolean;
  evento: EventoApi;
}

type EventoEditableField = "titulo" | "dataInicio" | "dataFim" | "importancia" | "local" | "cidade" | "site" | "permissoe";

const eventoEditableFields: EventoEditableField[] = [
  "titulo",
  "dataInicio",
  "dataFim",
  "importancia",
  "local",
  "cidade",
  "site",
  "permissoe",
];

const eventoFieldLabel: Record<EventoEditableField, string> = {
  titulo: "Titulo",
  dataInicio: "Data Inicio",
  dataFim: "Data Fim",
  importancia: "Importancia",
  local: "Local",
  cidade: "Cidade",
  site: "Site",
  permissoe: "Permissao",
};

const editedFieldClass = "border-emerald-500 bg-emerald-50/70 focus-visible:ring-emerald-500/30";

const importanciaCores: Record<string, string> = {
  Baixa: "bg-blue-500 text-white",
  Media: "bg-amber-400 text-black",
  Alta: "bg-orange-500 text-white",
  "Muito Alta": "bg-red-600 text-white",
};

const importanciaDot: Record<string, string> = {
  Baixa: "bg-blue-500",
  Media: "bg-amber-400",
  Alta: "bg-orange-500",
  "Muito Alta": "bg-red-600",
};

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const mesesNome = ["Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const normalizeImportancia = (nivel: string | null): string => {
  const raw = (nivel || "").trim().toLowerCase();
  if (raw === "baixa") return "Baixa";
  if (raw === "media" || raw === "média") return "Media";
  if (raw === "alta") return "Alta";
  if (raw === "muito alta") return "Muito Alta";
  return "Media";
};

const importanceToDbNivel = (importancia: string): string => {
  if (importancia === "Baixa") return "baixa";
  if (importancia === "Alta") return "alta";
  if (importancia === "Muito Alta") return "muito alta";
  return "média";
};

const toIsoDate = (value: string | null): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const mapEventoApiToUi = (item: EventoApi): Evento => ({
  id: item.id_evento ?? Date.now(),
  titulo: item.nome || "Evento sem nome",
  dataInicio: toIsoDate(item.data_inicio),
  dataFim: toIsoDate(item.data_fim) || toIsoDate(item.data_inicio),
  importancia: normalizeImportancia(item.nivel),
  local: item.local || "",
  cidade: item.cidade || "",
  site: item.site || "",
  permissoe: item.permissoe || "",
});

const formatDateBR = (dateIso: string): string => dateIso.split("-").reverse().join("/");

const formatPeriodo = (evento: Evento): string => {
  const ini = formatDateBR(evento.dataInicio);
  const fim = formatDateBR(evento.dataFim || evento.dataInicio);
  return ini === fim ? ini : `${ini} ate ${fim}`;
};

const isDateInRange = (date: string, start: string, end: string) => {
  if (!start) return false;
  const endDate = end || start;
  return date >= start && date <= endDate;
};

const buildLocalLabel = (evento: Evento): string => {
  const parts = [evento.local, evento.cidade].filter(Boolean);
  return parts.join(" - ");
};

const Calendario = () => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregandoEventos, setCarregandoEventos] = useState(false);
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [mesAtual, setMesAtual] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);
  const [modalDiaOpen, setModalDiaOpen] = useState(false);
  const [modalNovoOpen, setModalNovoOpen] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null);
  const [eventoOriginal, setEventoOriginal] = useState<Evento | null>(null);
  const [confirmarSalvarEdicaoOpen, setConfirmarSalvarEdicaoOpen] = useState(false);
  const [eventoParaExcluir, setEventoParaExcluir] = useState<Evento | null>(null);
  const [excluindoEvento, setExcluindoEvento] = useState(false);
  const [novoEvento, setNovoEvento] = useState({
    titulo: "",
    dataInicio: "",
    dataFim: "",
    importancia: "Media",
    local: "",
    cidade: "",
    site: "",
    permissoe: "",
  });

  const abrirEdicaoEvento = (evento: Evento) => {
    const copia = { ...evento };
    setEventoEditando(copia);
    setEventoOriginal(copia);
  };

  const fecharEdicaoEvento = () => {
    setEventoEditando(null);
    setEventoOriginal(null);
    setConfirmarSalvarEdicaoOpen(false);
  };

  const camposAlteradosEdicao = useMemo(() => {
    if (!eventoEditando || !eventoOriginal) return [] as EventoEditableField[];
    return eventoEditableFields.filter((campo) => (eventoEditando[campo] || "") !== (eventoOriginal[campo] || ""));
  }, [eventoEditando, eventoOriginal]);

  const campoEventoFoiEditado = (campo: EventoEditableField): boolean => camposAlteradosEdicao.includes(campo);

  useEffect(() => {
    let mounted = true;
    const carregarEventos = async () => {
      setCarregandoEventos(true);
      try {
        const response = await fetch("/portifolio/api/eventos");
        if (!response.ok) throw new Error(`Falha ao carregar eventos (${response.status})`);
        const payload = (await response.json()) as EventosResponse;
        const mapped = (payload.eventos || []).map(mapEventoApiToUi).filter((e) => Boolean(e.dataInicio));
        if (mounted) setEventos(mapped);
      } catch (error) {
        if (mounted) {
          toast({
            title: "Erro ao carregar calendario",
            description: error instanceof Error ? error.message : "Nao foi possivel carregar os eventos.",
            variant: "destructive",
          });
        }
      } finally {
        if (mounted) setCarregandoEventos(false);
      }
    };
    carregarEventos();
    return () => {
      mounted = false;
    };
  }, []);

  const ano = mesAtual.getFullYear();
  const mes = mesAtual.getMonth();
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const diasCalendario: (number | null)[] = [];
  for (let i = 0; i < primeiroDia; i += 1) diasCalendario.push(null);
  for (let d = 1; d <= diasNoMes; d += 1) diasCalendario.push(d);

  const getEventosDoDia = (dia: number): Evento[] => {
    const dataStr = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    return eventos.filter((e) => isDateInRange(dataStr, e.dataInicio, e.dataFim));
  };

  const eventosDiaSelecionado = useMemo(() => {
    if (!diaSelecionado) return [];
    return getEventosDoDia(diaSelecionado);
  }, [diaSelecionado, eventos, ano, mes]);

  const copiarTexto = async (texto: string) => {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      toast({ title: "Link copiado", description: "O link foi copiado para a area de transferencia." });
    } catch {
      toast({ title: "Erro", description: "Nao foi possivel copiar o link.", variant: "destructive" });
    }
  };

  const resetNovoEvento = () => {
    setNovoEvento({
      titulo: "",
      dataInicio: "",
      dataFim: "",
      importancia: "Media",
      local: "",
      cidade: "",
      site: "",
      permissoe: "",
    });
  };

  const salvarNovoEvento = async () => {
    if (!novoEvento.titulo || !novoEvento.dataInicio || !novoEvento.importancia) {
      toast({ title: "Erro", description: "Preencha titulo, data inicio e importancia.", variant: "destructive" });
      return;
    }
    setSalvandoNovo(true);
    try {
      const response = await fetch("/portifolio/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoEvento.titulo,
          data_inicio: novoEvento.dataInicio,
          data_fim: novoEvento.dataFim || novoEvento.dataInicio,
          nivel: importanceToDbNivel(novoEvento.importancia),
          local: novoEvento.local || null,
          cidade: novoEvento.cidade || null,
          site: novoEvento.site || null,
          permissoe: novoEvento.permissoe || null,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Erro ao criar evento." }));
        throw new Error(err.detail || "Erro ao criar evento.");
      }

      const payload = (await response.json()) as EventoCreateResponse;
      const novo = mapEventoApiToUi(payload.evento);
      setEventos((prev) => [...prev, novo].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio)));

      if (novo.dataInicio) {
        const [yyyy, mm] = novo.dataInicio.split("-");
        if (yyyy && mm) {
          setMesAtual(new Date(Number(yyyy), Number(mm) - 1, 1));
        }
      }

      setModalNovoOpen(false);
      resetNovoEvento();
      toast({ title: "Evento criado", description: "Novo evento salvo no banco e exibido no calendario." });
    } catch (error) {
      toast({
        title: "Erro ao criar",
        description: error instanceof Error ? error.message : "Nao foi possivel criar o evento.",
        variant: "destructive",
      });
    } finally {
      setSalvandoNovo(false);
    }
  };

  const salvarEdicaoEvento = async () => {
    if (!eventoEditando) return;
    if (!eventoEditando.titulo || !eventoEditando.dataInicio || !eventoEditando.importancia) {
      toast({ title: "Erro", description: "Preencha titulo, data e importancia.", variant: "destructive" });
      return;
    }
    setSalvandoEdicao(true);
    try {
      const response = await fetch(`/portifolio/api/eventos/${eventoEditando.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: eventoEditando.titulo,
          data_inicio: eventoEditando.dataInicio,
          data_fim: eventoEditando.dataFim || eventoEditando.dataInicio,
          nivel: importanceToDbNivel(eventoEditando.importancia),
          local: eventoEditando.local || null,
          cidade: eventoEditando.cidade || null,
          site: eventoEditando.site || null,
          permissoe: eventoEditando.permissoe || null,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Erro ao salvar evento." }));
        throw new Error(err.detail || "Erro ao salvar evento.");
      }
      setEventos((prev) => prev.map((e) => (e.id === eventoEditando.id ? { ...eventoEditando } : e)));
      setConfirmarSalvarEdicaoOpen(false);
      toast({ title: "Evento atualizado", description: "Os dados do evento foram salvos com sucesso." });
      fecharEdicaoEvento();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Nao foi possivel salvar a edicao.",
        variant: "destructive",
      });
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const solicitarSalvarEdicaoEvento = () => {
    if (!eventoEditando) return;
    if (!eventoEditando.titulo || !eventoEditando.dataInicio || !eventoEditando.importancia) {
      toast({ title: "Erro", description: "Preencha titulo, data e importancia.", variant: "destructive" });
      return;
    }
    if (camposAlteradosEdicao.length === 0) {
      toast({ title: "Sem alteracoes", description: "Nenhuma mudanca detectada para salvar." });
      return;
    }
    setConfirmarSalvarEdicaoOpen(true);
  };

  const excluirEvento = async () => {
    if (!eventoParaExcluir) return;
    setExcluindoEvento(true);
    try {
      const response = await fetch(`/portifolio/api/eventos/${eventoParaExcluir.id}`, { method: "DELETE" });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Erro ao excluir evento." }));
        throw new Error(err.detail || "Erro ao excluir evento.");
      }
      setEventos((prev) => prev.filter((evento) => evento.id !== eventoParaExcluir.id));
      setEventoParaExcluir(null);
      if (eventoEditando?.id === eventoParaExcluir.id) {
        fecharEdicaoEvento();
      }
      toast({ title: "Evento excluido", description: "O evento foi removido com sucesso." });
    } catch (error) {
      toast({
        title: "Erro ao excluir",
        description: error instanceof Error ? error.message : "Nao foi possivel excluir o evento.",
        variant: "destructive",
      });
    } finally {
      setExcluindoEvento(false);
    }
  };

  const handleMesAnterior = () => setMesAtual(new Date(ano, mes - 1, 1));
  const handleProximoMes = () => setMesAtual(new Date(ano, mes + 1, 1));

  const inicioDoMes = `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
  const proximosEventos = eventos
    .filter((e) => (e.dataFim || e.dataInicio) >= inicioDoMes)
    .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));

  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Badge className="mb-2 bg-primary text-primary-foreground">CALENDARIO</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Calendario de Eventos</h1>
            <p className="text-muted-foreground mt-1">Clique no dia para abrir os eventos e editar.</p>
          </div>
          <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => setModalNovoOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Evento
          </Button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <Card className="xl:col-span-3 border border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  {mesesNome[mes]} {ano}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handleMesAnterior}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleProximoMes}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 mb-2">
                {diasSemana.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {diasCalendario.map((dia, i) => {
                  const eventosDoDia = dia ? getEventosDoDia(dia) : [];
                  const isHoje = dia && `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}` === hojeStr;
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (!dia) return;
                        setDiaSelecionado(dia);
                        setModalDiaOpen(true);
                      }}
                      className={`min-h-[98px] p-1.5 bg-card ${dia ? "cursor-pointer hover:bg-secondary/50 transition-colors" : "bg-muted/30"}`}
                    >
                      {dia && (
                        <>
                          <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${isHoje ? "bg-accent text-accent-foreground" : "text-foreground"}`}>
                            {dia}
                          </span>
                          <div className="mt-1 space-y-0.5">
                            {eventosDoDia.slice(0, 2).map((ev) => (
                              <button
                                key={ev.id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  abrirEdicaoEvento(ev);
                                }}
                                className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${importanciaCores[ev.importancia] || "bg-blue-500 text-white"}`}
                              >
                                {ev.titulo}
                              </button>
                            ))}
                            {eventosDoDia.length > 2 && (
                              <span className="text-[10px] text-muted-foreground pl-1">+{eventosDoDia.length - 2} mais</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3 mt-4">
                {Object.entries(importanciaDot).map(([nivel, cor]) => (
                  <div key={nivel} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className={`w-2.5 h-2.5 rounded-full ${cor}`} />
                    {nivel}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 xl:h-full xl:flex xl:flex-col">
            <Card className="border border-border shadow-sm xl:flex xl:flex-col xl:flex-1 xl:min-h-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Proximos Eventos</CardTitle>
                <p className="text-xs text-muted-foreground">{carregandoEventos ? "Carregando..." : "Agenda do mes"}</p>
              </CardHeader>
              <CardContent className="space-y-3 xl:flex-1 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
                {proximosEventos.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => abrirEdicaoEvento(ev)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-1 h-full min-h-[40px] rounded-full ${importanciaDot[ev.importancia] || "bg-blue-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ev.titulo}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{formatPeriodo(ev)}</span>
                        </div>
                        <Badge className={`text-[10px] mt-1.5 ${importanciaCores[ev.importancia]}`}>{ev.importancia}</Badge>
                      </div>
                    </div>
                  </button>
                ))}
                {!carregandoEventos && proximosEventos.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Nenhum evento encontrado para este mes.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border shadow-sm xl:shrink-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Resumo do Mes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(importanciaCores).map((nivel) => {
                  const count = eventos.filter(
                    (e) => e.importancia === nivel
                      && (e.dataInicio.startsWith(`${ano}-${String(mes + 1).padStart(2, "0")}`)
                        || e.dataFim.startsWith(`${ano}-${String(mes + 1).padStart(2, "0")}`)),
                  ).length;
                  return (
                    <div key={nivel} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${importanciaDot[nivel]}`} />
                        <span className="text-muted-foreground">{nivel}</span>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={modalDiaOpen} onOpenChange={setModalDiaOpen}>
          <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5">
              <DialogHeader>
                <DialogTitle className="text-xl">Eventos do Dia</DialogTitle>
                <DialogDescription className="text-slate-200">
                  {diaSelecionado ? `${String(diaSelecionado).padStart(2, "0")}/${String(mes + 1).padStart(2, "0")}/${ano}` : ""}
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {eventosDiaSelecionado.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                  Nenhum evento cadastrado para este dia.
                </div>
              )}
              {eventosDiaSelecionado.map((ev) => (
                <div key={ev.id} className="rounded-xl border border-border p-4 bg-card/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold truncate">{ev.titulo}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={importanciaCores[ev.importancia]}>{ev.importancia}</Badge>
                        <span className="text-xs text-muted-foreground">{formatPeriodo(ev)}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => abrirEdicaoEvento(ev)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm">
                    {buildLocalLabel(ev) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{buildLocalLabel(ev)}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-[16px_1fr_28px] items-center gap-2 h-9 rounded-md border border-border bg-muted/40 px-2 min-w-0">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate whitespace-nowrap">
                        {ev.site || "Sem link"}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={!ev.site}
                        onClick={() => copiarTexto(ev.site)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={modalNovoOpen} onOpenChange={setModalNovoOpen}>
          <DialogContent className="w-[95vw] max-w-2xl overflow-hidden">
            <div className="space-y-4 min-w-0">
              <DialogHeader>
                <DialogTitle className="text-xl">Novo Evento</DialogTitle>
                <DialogDescription>Cadastre um novo evento e salve direto no banco.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-2 min-w-0">
                <div className="grid gap-2 min-w-0">
                  <Label>Titulo</Label>
                  <Input className="min-w-0 max-w-full" value={novoEvento.titulo} onChange={(e) => setNovoEvento({ ...novoEvento, titulo: e.target.value })} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                  <div className="grid gap-2 min-w-0">
                    <Label>Data Inicio</Label>
                    <Input type="date" value={novoEvento.dataInicio} onChange={(e) => setNovoEvento({ ...novoEvento, dataInicio: e.target.value })} />
                  </div>
                  <div className="grid gap-2 min-w-0">
                    <Label>Data Fim</Label>
                    <Input type="date" value={novoEvento.dataFim} onChange={(e) => setNovoEvento({ ...novoEvento, dataFim: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                  <div className="grid gap-2 min-w-0">
                    <Label>Importancia</Label>
                    <Select value={novoEvento.importancia} onValueChange={(v) => setNovoEvento({ ...novoEvento, importancia: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(importanciaCores).map((item) => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2 min-w-0">
                    <Label>Permissao</Label>
                    <Input className="min-w-0 max-w-full" value={novoEvento.permissoe} onChange={(e) => setNovoEvento({ ...novoEvento, permissoe: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                  <div className="grid gap-2 min-w-0">
                    <Label>Local</Label>
                    <Input className="min-w-0 max-w-full" value={novoEvento.local} onChange={(e) => setNovoEvento({ ...novoEvento, local: e.target.value })} />
                  </div>
                  <div className="grid gap-2 min-w-0">
                    <Label>Cidade</Label>
                    <Input className="min-w-0 max-w-full" value={novoEvento.cidade} onChange={(e) => setNovoEvento({ ...novoEvento, cidade: e.target.value })} />
                  </div>
                </div>

                <div className="grid gap-2 min-w-0">
                  <Label>Site</Label>
                  <Input className="min-w-0 max-w-full" value={novoEvento.site} onChange={(e) => setNovoEvento({ ...novoEvento, site: e.target.value })} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    setModalNovoOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button variant="outline" onClick={resetNovoEvento} disabled={salvandoNovo}>
                  Limpar
                </Button>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={salvarNovoEvento} disabled={salvandoNovo}>
                  <Save className="h-4 w-4 mr-1" />
                  {salvandoNovo ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!eventoEditando} onOpenChange={(open) => { if (!open) fecharEdicaoEvento(); }}>
          <DialogContent className="w-[95vw] max-w-2xl overflow-hidden">
            {eventoEditando && (
              <div className="space-y-4 min-w-0">
                <DialogHeader>
                  <DialogTitle className="text-xl">Editar Evento</DialogTitle>
                  <DialogDescription>Atualize os dados e clique em salvar para gravar no banco.</DialogDescription>
                </DialogHeader>
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  {camposAlteradosEdicao.length > 0
                    ? `${camposAlteradosEdicao.length} campo(s) alterado(s): ${camposAlteradosEdicao.map((c) => eventoFieldLabel[c]).join(", ")}`
                    : "Nenhuma alteracao detectada ainda."}
                </div>
                <div className="grid gap-4 py-2 min-w-0">
                  <div className="grid gap-2 min-w-0">
                    <Label>Titulo</Label>
                    <Input
                      className={`min-w-0 max-w-full ${campoEventoFoiEditado("titulo") ? editedFieldClass : ""}`}
                      value={eventoEditando.titulo}
                      onChange={(e) => setEventoEditando({ ...eventoEditando, titulo: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                    <div className="grid gap-2 min-w-0">
                      <Label>Data Inicio</Label>
                      <Input
                        className={campoEventoFoiEditado("dataInicio") ? editedFieldClass : ""}
                        type="date"
                        value={eventoEditando.dataInicio}
                        onChange={(e) => setEventoEditando({ ...eventoEditando, dataInicio: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2 min-w-0">
                      <Label>Data Fim</Label>
                      <Input
                        className={campoEventoFoiEditado("dataFim") ? editedFieldClass : ""}
                        type="date"
                        value={eventoEditando.dataFim}
                        onChange={(e) => setEventoEditando({ ...eventoEditando, dataFim: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                    <div className="grid gap-2 min-w-0">
                      <Label>Importancia</Label>
                      <Select value={eventoEditando.importancia} onValueChange={(v) => setEventoEditando({ ...eventoEditando, importancia: v })}>
                        <SelectTrigger className={campoEventoFoiEditado("importancia") ? editedFieldClass : ""}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.keys(importanciaCores).map((item) => (
                            <SelectItem key={item} value={item}>{item}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2 min-w-0">
                      <Label>Permissao</Label>
                      <Input
                        className={`min-w-0 max-w-full ${campoEventoFoiEditado("permissoe") ? editedFieldClass : ""}`}
                        value={eventoEditando.permissoe}
                        onChange={(e) => setEventoEditando({ ...eventoEditando, permissoe: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
                    <div className="grid gap-2 min-w-0">
                      <Label>Local</Label>
                      <Input
                        className={`min-w-0 max-w-full ${campoEventoFoiEditado("local") ? editedFieldClass : ""}`}
                        value={eventoEditando.local}
                        onChange={(e) => setEventoEditando({ ...eventoEditando, local: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2 min-w-0">
                      <Label>Cidade</Label>
                      <Input
                        className={`min-w-0 max-w-full ${campoEventoFoiEditado("cidade") ? editedFieldClass : ""}`}
                        value={eventoEditando.cidade}
                        onChange={(e) => setEventoEditando({ ...eventoEditando, cidade: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2 min-w-0">
                    <Label>Site</Label>
                    <Input
                      className={`min-w-0 max-w-full ${campoEventoFoiEditado("site") ? editedFieldClass : ""}`}
                      value={eventoEditando.site}
                      onChange={(e) => setEventoEditando({ ...eventoEditando, site: e.target.value })}
                    />
                    <div className="grid grid-cols-[16px_1fr_28px] items-center gap-2 h-9 rounded-md border border-border bg-muted/40 px-2 min-w-0">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate whitespace-nowrap">
                        {eventoEditando.site || "Sem link"}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={!eventoEditando.site}
                        onClick={() => copiarTexto(eventoEditando.site)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                  <Button
                    variant="destructive"
                    onClick={() => setEventoParaExcluir(eventoEditando)}
                    disabled={salvandoEdicao || excluindoEvento}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={fecharEdicaoEvento}>Cancelar</Button>
                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={solicitarSalvarEdicaoEvento} disabled={salvandoEdicao}>
                      <Save className="h-4 w-4 mr-1" />
                      {salvandoEdicao ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={confirmarSalvarEdicaoOpen} onOpenChange={setConfirmarSalvarEdicaoOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar alteracoes do evento</AlertDialogTitle>
              <AlertDialogDescription>
                Serao salvas {camposAlteradosEdicao.length} mudanca(s): {camposAlteradosEdicao.map((c) => eventoFieldLabel[c]).join(", ")}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={salvarEdicaoEvento}
              >
                Salvar alteracoes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!eventoParaExcluir} onOpenChange={(open) => !open && setEventoParaExcluir(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acao remove o evento "{eventoParaExcluir?.titulo || "-"}" de forma permanente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={excluirEvento}
                disabled={excluindoEvento}
              >
                {excluindoEvento ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default Calendario;
