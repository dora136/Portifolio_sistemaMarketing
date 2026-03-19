import { DragEvent, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Star,
  Pencil,
  Plus,
  Save,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface KanbanEtapa {
  id: number;
  nome: string;
  cor: string;
}

interface KanbanAtividade {
  id_atividade: number;
  id_kanban: number;
  id_responsavel: number | null;
  titulo: string;
  descricao: string | null;
  observacao: string | null;
  data_criacao: string | null;
  data_prazo: string | null;
  data_finalizado: string | null;
  finalizado: boolean;
  urgencia: boolean;
  prioridade: string | null;
}

interface KanbanHistoryItem {
  id_registro: number;
  responsavel: string;
  data_hora: string;
  dado_antigo: string;
  dado_novo: string;
  local_alteracao: string;
  acao: string;
}

interface KanbanDataResponse {
  ok: boolean;
  items: KanbanAtividade[];
  etapas: KanbanEtapa[];
}

interface KanbanHistoryResponse {
  ok: boolean;
  items: KanbanHistoryItem[];
}

const prioridadeBadge: Record<string, string> = {
  baixa: "bg-blue-100 text-blue-700",
  media: "bg-amber-100 text-amber-700",
  alta: "bg-orange-100 text-orange-700",
  urgente: "bg-red-100 text-red-700",
};

const prioridadeCardTone: Record<string, string> = {
  baixa: "!bg-slate-50 !border-slate-200",
  media: "!bg-amber-50 !border-amber-200",
  alta: "!bg-orange-50 !border-orange-200",
  urgente: "!bg-red-100 !border-red-200",
};

const colorPalette = ["#64748b", "#2563eb", "#f59e0b", "#16a34a", "#8b5cf6", "#ec4899"];

const defaultForm = {
  id_kanban: 1,
  id_responsavel: "",
  titulo: "",
  descricao: "",
  observacao: "",
  data_prazo: "",
  prioridade: "media",
  importante: false,
};

type KanbanForm = typeof defaultForm;
type KanbanFormField = keyof KanbanForm;

const kanbanFormFields: KanbanFormField[] = [
  "id_kanban",
  "id_responsavel",
  "titulo",
  "descricao",
  "observacao",
  "data_prazo",
  "prioridade",
  "importante",
];

const kanbanFieldLabel: Record<KanbanFormField, string> = {
  id_kanban: "Etapa",
  id_responsavel: "Responsavel",
  titulo: "Titulo",
  descricao: "Descricao",
  observacao: "Observacao",
  data_prazo: "Data Prazo",
  prioridade: "Prioridade",
  importante: "Importante",
};

const editedFieldClass = "border-emerald-500 bg-emerald-50/70 focus-visible:ring-emerald-500/30";

const normalizePrioridade = (value: string | null | undefined) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "media";
  if (raw.includes("urg")) return "urgente";
  if (raw.includes("baix")) return "baixa";
  if (raw.includes("alt")) return "alta";
  if (raw.includes("med") || raw.includes("mÃ©d") || raw.includes("média")) return "media";
  if (raw.includes("muito")) return "alta";
  return raw;
};

const prioridadeLabel = (value: string) => {
  const normalized = normalizePrioridade(value);
  if (normalized === "baixa") return "Baixa";
  if (normalized === "alta") return "Alta";
  if (normalized === "urgente") return "Urgente";
  return "Media";
};

const priorityButtonStyle = (value: string) => {
  const normalized = normalizePrioridade(value);
  if (normalized === "media") return { backgroundColor: "#fde68a", borderColor: "#fcd34d", color: "#111827" };
  if (normalized === "alta") return { backgroundColor: "#fdba74", borderColor: "#fb923c", color: "#111827" };
  if (normalized === "urgente") return { backgroundColor: "#fda4af", borderColor: "#fb7185", color: "#111827" };
  return { backgroundColor: "#ffffff", borderColor: "#e5e7eb", color: "#111827" };
};

const priorityButtonRingClass = (value: string, active: boolean) => {
  if (!active) return "";
  const normalized = normalizePrioridade(value);
  if (normalized === "media") return "ring-2 ring-amber-400 ring-offset-2";
  if (normalized === "alta") return "ring-2 ring-orange-400 ring-offset-2";
  if (normalized === "urgente") return "ring-2 ring-rose-400 ring-offset-2";
  return "ring-2 ring-muted-foreground/20 ring-offset-2";
};

const getContrastColor = (hexColor: string) => {
  const clean = (hexColor || "#64748b").replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? "#111827" : "#ffffff";
};

const formatDateBr = (isoDate?: string | null) => {
  if (!isoDate) return "-";
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const Kanban = () => {
  const [atividades, setAtividades] = useState<KanbanAtividade[]>([]);
  const [etapas, setEtapas] = useState<KanbanEtapa[]>([]);
  const [historico, setHistorico] = useState<KanbanHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [modalAtividadeOpen, setModalAtividadeOpen] = useState(false);
  const [atividadeEditando, setAtividadeEditando] = useState<KanbanAtividade | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [originalFormData, setOriginalFormData] = useState(defaultForm);
  const [salvandoAtividade, setSalvandoAtividade] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  const [modalEtapasOpen, setModalEtapasOpen] = useState(false);
  const [etapasDraft, setEtapasDraft] = useState<KanbanEtapa[]>([]);
  const [salvandoEtapas, setSalvandoEtapas] = useState(false);

  const [atividadeParaExcluir, setAtividadeParaExcluir] = useState<KanbanAtividade | null>(null);
  const [excluindoAtividade, setExcluindoAtividade] = useState(false);

  const etapasOrdenadas = useMemo(
    () => [...etapas].sort((a, b) => a.id - b.id),
    [etapas],
  );

  const etapaMap = useMemo(() => {
    const mapping = new Map<number, KanbanEtapa>();
    etapasOrdenadas.forEach((item) => mapping.set(item.id, item));
    return mapping;
  }, [etapasOrdenadas]);

  const camposAlterados = useMemo(() => {
    if (!atividadeEditando) return [] as KanbanFormField[];

    const normalizeValue = (field: KanbanFormField, value: KanbanForm[KanbanFormField]) => {
      if (field === "prioridade") return normalizePrioridade(String(value || ""));
      if (field === "titulo" || field === "descricao" || field === "observacao" || field === "id_responsavel") {
        return String(value || "").trim();
      }
      if (field === "data_prazo") return String(value || "");
      if (field === "id_kanban") return String(Number(value || 0));
      if (field === "importante") return String(Boolean(value));
      return String(value ?? "");
    };

    return kanbanFormFields.filter((field) => (
      normalizeValue(field, formData[field]) !== normalizeValue(field, originalFormData[field])
    ));
  }, [atividadeEditando, formData, originalFormData]);

  const campoFoiEditado = (field: KanbanFormField) => Boolean(atividadeEditando) && camposAlterados.includes(field);

  const carregarKanban = async () => {
    setLoading(true);
    try {
      const response = await fetch("/portifolio/api/kanban/data");
      if (!response.ok) throw new Error("Falha ao carregar o Kanban.");
      const payload = (await response.json()) as KanbanDataResponse;
      setAtividades(payload.items || []);
      setEtapas(payload.etapas || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar Kanban.");
    } finally {
      setLoading(false);
    }
  };

  const carregarHistorico = async () => {
    try {
      const response = await fetch("/portifolio/api/kanban/historico");
      if (!response.ok) throw new Error("Falha ao carregar historico.");
      const payload = (await response.json()) as KanbanHistoryResponse;
      setHistorico(payload.items || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar historico.");
    }
  };

  useEffect(() => {
    carregarKanban();
    carregarHistorico();
  }, []);

  const abrirModalCriar = (idEtapa: number) => {
    const hasDraftNovaAtividade = Boolean(
      formData.titulo.trim()
      || formData.descricao.trim()
      || formData.observacao.trim()
      || formData.data_prazo.trim()
      || formData.id_responsavel.trim(),
    );

    if (!atividadeEditando && hasDraftNovaAtividade && !modalAtividadeOpen) {
      setFormData((prev) => ({ ...prev, id_kanban: idEtapa }));
      setModalAtividadeOpen(true);
      return;
    }

    setAtividadeEditando(null);
    const next = { ...defaultForm, id_kanban: idEtapa };
    setFormData(next);
    setOriginalFormData(next);
    setModalAtividadeOpen(true);
  };

  const abrirModalEditar = (atividade: KanbanAtividade) => {
    setAtividadeEditando(atividade);
    const next = {
      id_kanban: atividade.id_kanban,
      id_responsavel: atividade.id_responsavel ? String(atividade.id_responsavel) : "",
      titulo: atividade.titulo || "",
      descricao: atividade.descricao || "",
      observacao: atividade.observacao || "",
      data_prazo: atividade.data_prazo || "",
      prioridade: normalizePrioridade(atividade.prioridade || "media"),
      importante: Boolean(atividade.urgencia),
    };
    setFormData(next);
    setOriginalFormData(next);
    setModalAtividadeOpen(true);
  };

  const resetModalAtividade = () => {
    setAtividadeEditando(null);
    setFormData(defaultForm);
    setOriginalFormData(defaultForm);
    setConfirmSaveOpen(false);
    setModalAtividadeOpen(false);
  };

  const fecharModalAtividade = () => {
    setModalAtividadeOpen(false);
    setConfirmSaveOpen(false);
  };

  const limparNovaAtividade = () => {
    const idKanban = formData.id_kanban || 1;
    const next = { ...defaultForm, id_kanban: idKanban };
    setAtividadeEditando(null);
    setFormData(next);
    setOriginalFormData(next);
    setConfirmSaveOpen(false);
  };

  const salvarAtividade = async () => {
    if (!formData.titulo.trim()) {
      toast.error("Preencha o titulo da atividade.");
      return;
    }

    setSalvandoAtividade(true);
    try {
      const payload = {
        id_kanban: formData.id_kanban,
        id_responsavel: formData.id_responsavel ? Number(formData.id_responsavel) : null,
        titulo: formData.titulo.trim(),
        descricao: formData.descricao || null,
        observacao: formData.observacao || null,
        data_prazo: formData.data_prazo || null,
        prioridade: normalizePrioridade(formData.prioridade || "media"),
        urgencia: formData.importante,
      };

      const endpoint = atividadeEditando
        ? `/portifolio/api/kanban/editar/${atividadeEditando.id_atividade}`
        : "/portifolio/api/kanban/criar";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Erro ao salvar atividade." }));
        throw new Error(err.detail || "Erro ao salvar atividade.");
      }

      toast.success(atividadeEditando ? "Atividade atualizada." : "Atividade criada.");
      setConfirmSaveOpen(false);
      resetModalAtividade();
      await carregarKanban();
      await carregarHistorico();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar atividade.");
    } finally {
      setSalvandoAtividade(false);
    }
  };

  const solicitarSalvarAtividade = () => {
    if (atividadeEditando) {
      if (!camposAlterados.length) {
        toast.error("Nenhuma alteracao detectada.");
        return;
      }
      setConfirmSaveOpen(true);
      return;
    }
    salvarAtividade();
  };

  const moverAtividade = async (idAtividade: number, idEtapa: number) => {
    try {
      const response = await fetch("/portifolio/api/kanban/atualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_atividade: idAtividade, id_kanban: idEtapa }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Erro ao mover atividade." }));
        throw new Error(err.detail || "Erro ao mover atividade.");
      }
      await carregarKanban();
      await carregarHistorico();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao mover atividade.");
    }
  };

  const excluirAtividade = async () => {
    if (!atividadeParaExcluir) return;
    setExcluindoAtividade(true);
    try {
      const response = await fetch(`/portifolio/api/kanban/excluir/${atividadeParaExcluir.id_atividade}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Erro ao excluir atividade." }));
        throw new Error(err.detail || "Erro ao excluir atividade.");
      }
      setAtividadeParaExcluir(null);
      toast.success("Atividade excluida.");
      await carregarKanban();
      await carregarHistorico();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir atividade.");
    } finally {
      setExcluindoAtividade(false);
    }
  };

  const iniciarEdicaoEtapas = () => {
    setEtapasDraft(etapasOrdenadas.map((etapa) => ({ ...etapa })));
    setModalEtapasOpen(true);
  };

  const adicionarEtapa = () => {
    const nextId = etapasDraft.length ? Math.max(...etapasDraft.map((e) => e.id)) + 1 : 1;
    const nextColor = colorPalette[(nextId - 1) % colorPalette.length];
    setEtapasDraft((prev) => [...prev, { id: nextId, nome: `Nova Etapa ${nextId}`, cor: nextColor }]);
  };

  const removerEtapa = (id: number) => {
    const temCards = atividades.some((item) => item.id_kanban === id);
    if (temCards) {
      toast.error("Nao e possivel remover etapa com atividades vinculadas.");
      return;
    }
    setEtapasDraft((prev) => prev.filter((item) => item.id !== id));
  };

  const salvarEtapas = async () => {
    if (!etapasDraft.length) {
      toast.error("Mantenha ao menos uma etapa.");
      return;
    }
    if (etapasDraft.some((etapa) => !etapa.nome.trim())) {
      toast.error("Preencha o nome de todas as etapas.");
      return;
    }

    setSalvandoEtapas(true);
    try {
      const response = await fetch("/portifolio/api/kanban/etapas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          etapas: etapasDraft.map((item) => ({
            id: item.id,
            nome: item.nome.trim(),
            cor: item.cor,
          })),
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Erro ao salvar etapas." }));
        throw new Error(err.detail || "Erro ao salvar etapas.");
      }
      toast.success("Etapas atualizadas.");
      setModalEtapasOpen(false);
      await carregarKanban();
      await carregarHistorico();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar etapas.");
    } finally {
      setSalvandoEtapas(false);
    }
  };

  const onDragStartCard = (event: DragEvent<HTMLDivElement>, idAtividade: number) => {
    event.dataTransfer.setData("text/plain", String(idAtividade));
    event.dataTransfer.effectAllowed = "move";
  };

  const onDropColuna = async (event: DragEvent<HTMLDivElement>, idEtapa: number) => {
    event.preventDefault();
    const idAtividade = Number(event.dataTransfer.getData("text/plain"));
    if (!idAtividade) return;
    const atividade = atividades.find((item) => item.id_atividade === idAtividade);
    if (!atividade || atividade.id_kanban === idEtapa) return;
    await moverAtividade(idAtividade, idEtapa);
  };

  const onDragOverColuna = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge className="mb-2 bg-primary text-primary-foreground">KANBAN</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Atividades do Marketing</h1>
            <p className="text-muted-foreground mt-1">
              Dados reais do banco, com historico de atividades e edicao de etapas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={iniciarEdicaoEtapas} title="Editar etapas">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => abrirModalCriar(etapasOrdenadas[0]?.id || 1)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nova Atividade
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="xl:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {etapasOrdenadas.map((etapa, index) => {
                const cards = atividades.filter((item) => item.id_kanban === etapa.id);
                const textColor = getContrastColor(etapa.cor);
                return (
                  <div key={etapa.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold truncate"
                          style={{ backgroundColor: etapa.cor, color: textColor }}
                        >
                          {etapa.nome}
                        </span>
                        <span className="text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5">
                          {cards.length}
                        </span>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => abrirModalCriar(etapa.id)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div
                      className="space-y-2 min-h-[240px] p-2 rounded-lg border bg-secondary/20"
                      onDrop={(event) => onDropColuna(event, etapa.id)}
                      onDragOver={onDragOverColuna}
                    >
                      {cards.map((atividade) => {
                        const idxAtual = etapasOrdenadas.findIndex((item) => item.id === atividade.id_kanban);
                        const etapaAnterior = idxAtual > 0 ? etapasOrdenadas[idxAtual - 1] : null;
                        const proximaEtapa = idxAtual < etapasOrdenadas.length - 1 ? etapasOrdenadas[idxAtual + 1] : null;
                        const prioridade = normalizePrioridade(atividade.prioridade || "media");
                        const isImportante = Boolean(atividade.urgencia);
                        const isDone = idxAtual === etapasOrdenadas.length - 1;
                        const tone = prioridadeCardTone[prioridade] || "!bg-card !border-border";
                        return (
                          <Card
                            key={atividade.id_atividade}
                            className={[
                              "border shadow-sm hover:shadow-md transition-all",
                              tone,
                              isImportante ? "ring-1 ring-amber-200" : "",
                              isDone ? "opacity-80" : "",
                            ].join(" ")}
                            draggable
                            onDragStart={(event) => onDragStartCard(event, atividade.id_atividade)}
                          >
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 min-w-0">
                                  {isImportante && (
                                    <Star className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" fill="#f59e0b" />
                                  )}
                                  <h4 className={`text-sm font-semibold leading-tight truncate ${isDone ? "line-through" : ""}`}>
                                    {atividade.titulo}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => abrirModalEditar(atividade)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => setAtividadeParaExcluir(atividade)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {atividade.descricao && (
                                <p className="text-xs text-muted-foreground line-clamp-3">{atividade.descricao}</p>
                              )}

                              <div className="flex items-center justify-between gap-2">
                                <Badge className={`text-[10px] ${prioridadeBadge[prioridade] || "bg-muted text-muted-foreground"}`}>
                                  {prioridadeLabel(prioridade)}
                                </Badge>
                              </div>

                              <div className="space-y-1 text-xs text-muted-foreground">
                                {atividade.id_responsavel !== null && (
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    <span>ID {atividade.id_responsavel}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>Prazo: {formatDateBr(atividade.data_prazo)}</span>
                                </div>
                                {isDone && atividade.data_finalizado && (
                                  <div className="text-[10px] text-emerald-700">
                                    Concluido em {formatDateBr(atividade.data_finalizado)}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-1 pt-1">
                                <div className="flex w-full items-center justify-between gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-9"
                                    title="Voltar"
                                    disabled={!etapaAnterior}
                                    onClick={() => etapaAnterior && moverAtividade(atividade.id_atividade, etapaAnterior.id)}
                                  >
                                    <ChevronLeft className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-9"
                                    title="Avancar"
                                    disabled={!proximaEtapa}
                                    onClick={() => proximaEtapa && moverAtividade(atividade.id_atividade, proximaEtapa.id)}
                                  >
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {!cards.length && (
                        <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                          {loading ? "Carregando..." : "Sem atividades nesta etapa."}
                        </div>
                      )}
                    </div>
                    {index === etapasOrdenadas.length - 1 && (
                      <p className="text-[10px] text-muted-foreground">
                        Dica: arraste os cards para mover entre etapas.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Card className="border border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historico de Atividades</CardTitle>
              <p className="text-xs text-muted-foreground">Ultimos registros da semana</p>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[640px] overflow-y-auto">
              {historico.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Nenhuma alteracao registrada.
                </div>
              )}
              {historico.map((registro) => (
                <div key={registro.id_registro} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{registro.local_alteracao || "Kanban"}</p>
                      <p className="text-xs text-muted-foreground">Antes: {registro.dado_antigo || "-"}</p>
                      <p className="text-xs text-muted-foreground">Depois: {registro.dado_novo || "-"}</p>
                      <p className="text-xs text-muted-foreground">Responsavel: {registro.responsavel || "Sistema"}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">{registro.data_hora || "-"}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={modalAtividadeOpen}
        onOpenChange={(open) => {
          setModalAtividadeOpen(open);
          if (!open) setConfirmSaveOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{atividadeEditando ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
            <DialogDescription>Preencha os campos para salvar no banco real do Kanban.</DialogDescription>
          </DialogHeader>
          {atividadeEditando && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {camposAlterados.length > 0
                ? `${camposAlterados.length} campo(s) alterado(s): ${camposAlterados.map((c) => kanbanFieldLabel[c]).join(", ")}`
                : "Nenhuma alteracao detectada ainda."}
            </div>
          )}

          <div className="grid gap-4 py-1">
            <div className="grid gap-2">
              <Label>Titulo *</Label>
              <Input
                className={campoFoiEditado("titulo") ? editedFieldClass : ""}
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Etapa</Label>
                <Select
                  value={String(formData.id_kanban)}
                  onValueChange={(value) => setFormData({ ...formData, id_kanban: Number(value) })}
                >
                  <SelectTrigger className={campoFoiEditado("id_kanban") ? editedFieldClass : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {etapasOrdenadas.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Prioridade</Label>
                <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 ${campoFoiEditado("prioridade") ? "ring-1 ring-emerald-300 rounded-xl p-1" : ""}`}>
                  {["baixa", "media", "alta", "urgente"].map((value) => {
                    const active = normalizePrioridade(formData.prioridade) === normalizePrioridade(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        className={[
                          "h-11 w-full rounded-xl border text-sm font-semibold transition-shadow hover:brightness-[0.98]",
                          priorityButtonRingClass(value, active),
                        ].join(" ")}
                        style={priorityButtonStyle(value)}
                        onClick={() => setFormData({ ...formData, prioridade: value })}
                      >
                        {prioridadeLabel(value)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data Prazo</Label>
                <Input
                  className={campoFoiEditado("data_prazo") ? editedFieldClass : ""}
                  type="date"
                  value={formData.data_prazo}
                  onChange={(e) => setFormData({ ...formData, data_prazo: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>ID Responsavel</Label>
                <Input
                  className={campoFoiEditado("id_responsavel") ? editedFieldClass : ""}
                  type="number"
                  value={formData.id_responsavel}
                  onChange={(e) => setFormData({ ...formData, id_responsavel: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Descricao</Label>
              <Textarea
                rows={3}
                className={campoFoiEditado("descricao") ? editedFieldClass : ""}
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Observacao</Label>
              <Textarea
                rows={2}
                className={campoFoiEditado("observacao") ? editedFieldClass : ""}
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
              />
            </div>

            <div className={`rounded-xl border border-amber-200 bg-amber-50/60 p-4 ${campoFoiEditado("importante") ? "ring-1 ring-emerald-300" : ""}`}>
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={formData.importante}
                  onCheckedChange={(checked) => setFormData({ ...formData, importante: Boolean(checked) })}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" fill="#f59e0b" />
                    <p className="text-sm font-semibold text-foreground">Marcar como importante</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Atividades importantes aparecem destacadas no quadro Kanban
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            {!atividadeEditando && (
              <Button variant="outline" onClick={limparNovaAtividade} disabled={salvandoAtividade}>
                Limpar
              </Button>
            )}
            <Button variant="outline" onClick={fecharModalAtividade} disabled={salvandoAtividade}>
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={solicitarSalvarAtividade} disabled={salvandoAtividade}>
              <Save className="h-4 w-4 mr-1" />
              {salvandoAtividade ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteracoes</AlertDialogTitle>
            <AlertDialogDescription>
              Serao salvas {camposAlterados.length} mudanca(s)
              {camposAlterados.length ? `: ${camposAlterados.map((c) => kanbanFieldLabel[c]).join(", ")}` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={salvarAtividade}
            >
              Salvar alteracoes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={modalEtapasOpen} onOpenChange={setModalEtapasOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Etapas do Kanban</DialogTitle>
            <DialogDescription>
              Personalize nome e cor de cada etapa. O quadro usa essa configuracao em tempo real.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {etapasDraft.map((etapa) => (
              <div key={etapa.id} className="grid grid-cols-[1fr_90px_44px] gap-2 items-end">
                <div className="grid gap-1">
                  <Label className="text-xs">Nome da Etapa {etapa.id}</Label>
                  <Input
                    value={etapa.nome}
                    onChange={(e) => setEtapasDraft((prev) => prev.map((item) => (
                      item.id === etapa.id ? { ...item, nome: e.target.value } : item
                    )))}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Cor</Label>
                  <Input
                    type="color"
                    value={etapa.cor}
                    onChange={(e) => setEtapasDraft((prev) => prev.map((item) => (
                      item.id === etapa.id ? { ...item, cor: e.target.value } : item
                    )))}
                    className="p-1 h-10"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-destructive"
                  onClick={() => removerEtapa(etapa.id)}
                  disabled={etapasDraft.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" onClick={adicionarEtapa}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Etapa
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setModalEtapasOpen(false)}>Cancelar</Button>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={salvarEtapas} disabled={salvandoEtapas}>
                {salvandoEtapas ? "Salvando..." : "Salvar Etapas"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!atividadeParaExcluir} onOpenChange={(open) => !open && setAtividadeParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa acao remove "{atividadeParaExcluir?.titulo || "-"}" permanentemente do Kanban.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={excluirAtividade}
              disabled={excluindoAtividade}
            >
              {excluindoAtividade ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Kanban;
