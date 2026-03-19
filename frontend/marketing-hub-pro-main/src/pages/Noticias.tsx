import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Newspaper, Plus, Trash2, Pencil, Save, X, Star } from "lucide-react";
import { toast } from "sonner";

interface Noticia {
  id_noticia: number;
  titulo: string;
  descricao: string | null;
  link: string | null;
  status_post: string | null;
  observacao: string | null;
  importancia?: boolean | null;
  possui_midia: boolean;
}

interface NoticiasResponse {
  ok: boolean;
  noticias: Noticia[];
}

interface NoticiaResponse {
  ok: boolean;
  noticia: Noticia;
}

const statusColor: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  "pronto para envio": "bg-warning text-warning-foreground",
  enviado: "bg-warning text-warning-foreground",
  publicado: "bg-success text-success-foreground",
};

const statusOptions = [
  { value: "rascunho", label: "Rascunho" },
  { value: "pronto para envio", label: "Pronto para Envio" },
  { value: "enviado", label: "Enviado" },
];

const normalizeStatus = (status: string | null | undefined) => {
  const value = (status || "rascunho").toLowerCase();
  if (value === "publicado") return "enviado";
  return value;
};

const getStatusLabel = (status: string | null | undefined) => {
  const normalized = normalizeStatus(status);
  return statusOptions.find((item) => item.value === normalized)?.label || normalized;
};

const defaultForm = {
  titulo: "",
  descricao: "",
  link: "",
  status_post: "rascunho",
  observacao: "",
  importancia: false,
};

type NoticiaForm = typeof defaultForm;
type NoticiaFormField = keyof NoticiaForm;

const noticiaFormFields: NoticiaFormField[] = [
  "titulo",
  "descricao",
  "link",
  "status_post",
  "observacao",
  "importancia",
];

const noticiaFieldLabel: Record<NoticiaFormField, string> = {
  titulo: "Titulo",
  descricao: "Descricao",
  link: "Link",
  status_post: "Status",
  observacao: "Observacao",
  importancia: "Importancia",
};

const editedFieldClass = "border-emerald-500 bg-emerald-50/70 focus-visible:ring-emerald-500/30";

const Noticias = () => {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviandoIds, setEnviandoIds] = useState<Record<number, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(defaultForm);
  const [originalFormData, setOriginalFormData] = useState(defaultForm);
  const [imgVideoBase64, setImgVideoBase64] = useState<string | null>(null);
  const [selectedMediaName, setSelectedMediaName] = useState("");
  const [existingMediaUrl, setExistingMediaUrl] = useState<string | null>(null);
  const [removeExistingMedia, setRemoveExistingMedia] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [noticiaParaExcluir, setNoticiaParaExcluir] = useState<Noticia | null>(null);

  const hasDraftNovaNoticia = useMemo(() => {
    if (editingId !== null) return false;
    if (imgVideoBase64) return true;
    if (selectedMediaName.trim()) return true;
    return noticiaFormFields.some((campo) => String(formData[campo] || "").trim() !== "");
  }, [editingId, formData, imgVideoBase64, selectedMediaName]);

  const camposAlterados = useMemo(() => {
    if (!editingId) return [] as NoticiaFormField[];
    return noticiaFormFields.filter((campo) => (formData[campo] || "") !== (originalFormData[campo] || ""));
  }, [editingId, formData, originalFormData]);

  const campoFoiEditado = (campo: NoticiaFormField): boolean => editingId !== null && camposAlterados.includes(campo);

  const carregarNoticias = async () => {
    setCarregando(true);
    try {
      const response = await fetch("/portifolio/api/canal-noticias");
      if (!response.ok) throw new Error("Falha ao carregar noticias.");
      const payload = (await response.json()) as NoticiasResponse;
      setNoticias(payload.noticias || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar noticias.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarNoticias();
  }, []);

  const resetForm = () => {
    setFormData(defaultForm);
    setOriginalFormData(defaultForm);
    setEditingId(null);
    setImgVideoBase64(null);
    setSelectedMediaName("");
    setExistingMediaUrl(null);
    setRemoveExistingMedia(false);
    setConfirmSaveOpen(false);
    setShowForm(false);
  };

  const fecharForm = () => {
    setShowForm(false);
    setConfirmSaveOpen(false);
  };

  const limparNovaNoticia = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setOriginalFormData(defaultForm);
    setImgVideoBase64(null);
    setSelectedMediaName("");
    setExistingMediaUrl(null);
    setRemoveExistingMedia(false);
    setConfirmSaveOpen(false);
  };

  const abrirNovaNoticia = () => {
    if (hasDraftNovaNoticia && !showForm) {
      setShowForm(true);
      return;
    }
    setEditingId(null);
    setFormData(defaultForm);
    setOriginalFormData(defaultForm);
    setImgVideoBase64(null);
    setSelectedMediaName("");
    setShowForm(true);
  };

  const handleMediaChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImgVideoBase64(null);
      setSelectedMediaName("");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Limite de 25MB.");
      event.target.value = "";
      return;
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
        reader.readAsDataURL(file);
      });
      setImgVideoBase64(base64);
      setSelectedMediaName(file.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao processar arquivo.");
      setImgVideoBase64(null);
      setSelectedMediaName("");
    }
  };

  const salvarNoticia = async () => {
    if (!formData.titulo.trim()) {
      toast.error("Preencha o titulo.");
      return;
    }
    setSalvando(true);
    try {
      const endpoint = editingId ? `/portifolio/api/canal-noticias/${editingId}` : "/portifolio/api/canal-noticias";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: formData.titulo,
          descricao: formData.descricao || null,
          link: formData.link || null,
          status_post: formData.status_post || "rascunho",
          observacao: formData.observacao || null,
          importancia: formData.importancia,
          img_video_base64: imgVideoBase64,
          remove_midia: removeExistingMedia || false,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Erro ao salvar noticia." }));
        throw new Error(err.detail || "Erro ao salvar noticia.");
      }

      if (editingId) {
        setNoticias((prev) => prev.map((n) => (
          n.id_noticia === editingId
            ? {
              ...n,
              titulo: formData.titulo,
              descricao: formData.descricao || null,
              link: formData.link || null,
              status_post: formData.status_post || "rascunho",
              observacao: formData.observacao || null,
              importancia: formData.importancia,
              possui_midia: removeExistingMedia ? false : (imgVideoBase64 ? true : n.possui_midia),
            }
            : n
        )));
        setConfirmSaveOpen(false);
        toast.success("Noticia atualizada com sucesso.");
      } else {
        const payload = (await response.json()) as NoticiaResponse;
        setNoticias((prev) => [payload.noticia, ...prev]);
        toast.success("Noticia criada com sucesso.");
      }

      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar noticia.");
    } finally {
      setSalvando(false);
    }
  };

  const solicitarSalvar = () => {
    if (editingId) {
      if (camposAlterados.length === 0 && !imgVideoBase64 && !removeExistingMedia) {
        toast.error("Nenhuma alteracao detectada.");
        return;
      }
      setConfirmSaveOpen(true);
      return;
    }
    salvarNoticia();
  };

  const editar = (noticia: Noticia) => {
    const dadosEdicao = {
      titulo: noticia.titulo || "",
      descricao: noticia.descricao || "",
      link: noticia.link || "",
      status_post: noticia.status_post || "rascunho",
      observacao: noticia.observacao || "",
      importancia: !!noticia.importancia,
    };
    setEditingId(noticia.id_noticia);
    setFormData(dadosEdicao);
    setOriginalFormData(dadosEdicao);
    setImgVideoBase64(null);
    setSelectedMediaName("");
    setExistingMediaUrl(noticia.possui_midia ? `/portifolio/api/canal-noticias/${noticia.id_noticia}/midia` : null);
    setRemoveExistingMedia(false);
    setShowForm(true);
  };

  const remover = async (id_noticia: number) => {
    try {
      const response = await fetch(`/portifolio/api/canal-noticias/${id_noticia}`, { method: "DELETE" });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Erro ao excluir noticia." }));
        throw new Error(err.detail || "Erro ao excluir noticia.");
      }
      setNoticias((prev) => prev.filter((n) => n.id_noticia !== id_noticia));
      setNoticiaParaExcluir(null);
      toast.success("Noticia excluida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir noticia.");
    }
  };

  const enviarNoticia = async (noticia: Noticia) => {
    const id = noticia.id_noticia;
    if (enviandoIds[id]) return;

    setEnviandoIds((prev) => ({ ...prev, [id]: true }));
    try {
      const response = await fetch(`/portifolio/api/canal-noticias/${id}/enviar`, { method: "POST" });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Erro ao enviar noticia." }));
        throw new Error(err.detail || "Erro ao enviar noticia.");
      }
      setNoticias((prev) => prev.map((n) => (n.id_noticia === id ? { ...n, status_post: "enviado" } : n)));
      toast.success("Noticia marcada como enviada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao enviar noticia.");
    } finally {
      setEnviandoIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const toggleImportancia = async (noticia: Noticia) => {
    const id = noticia.id_noticia;
    try {
      const response = await fetch(`/portifolio/api/canal-noticias/${id}/importancia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importancia: !noticia.importancia }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Erro ao atualizar importancia." }));
        throw new Error(err.detail || "Erro ao atualizar importancia.");
      }
      setNoticias((prev) =>
        prev.map((n) => (n.id_noticia === id ? { ...n, importancia: !n.importancia } : n)),
      );
      toast.success("Importancia atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar importancia.");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className="mb-2 bg-primary text-primary-foreground">CANAL DE NOTICIAS</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Noticias</h1>
            <p className="text-muted-foreground mt-1">Cadastre, edite e remova noticias do Central de Conteudo.</p>
          </div>
          <Button onClick={abrirNovaNoticia} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" />
            Nova Noticia
          </Button>
        </div>

        <Dialog
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open);
            if (!open) setConfirmSaveOpen(false);
          }}
        >
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Noticia" : "Nova Noticia"}</DialogTitle>
              <DialogDescription>Preencha os dados e salve para gravar no banco.</DialogDescription>
            </DialogHeader>
            {editingId && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {camposAlterados.length > 0
                  ? `${camposAlterados.length} campo(s) alterado(s): ${camposAlterados.map((c) => noticiaFieldLabel[c]).join(", ")}`
                  : "Nenhuma alteracao detectada ainda."}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Titulo *</Label>
                  <Input
                    className={campoFoiEditado("titulo") ? editedFieldClass : ""}
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    placeholder="Titulo da noticia"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status_post} onValueChange={(val) => setFormData({ ...formData, status_post: val })}>
                    <SelectTrigger className={campoFoiEditado("status_post") ? editedFieldClass : ""}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destaque</Label>
                  <button
                    type="button"
                    className={`h-10 w-full flex items-center gap-3 px-3 rounded-md border transition-all duration-200 ${
                      formData.importancia
                        ? "border-amber-400/60 bg-amber-50 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                        : "border-border bg-background hover:border-amber-300/40 hover:bg-amber-50/30"
                    } ${campoFoiEditado("importancia") ? editedFieldClass : ""}`}
                    onClick={() => setFormData({ ...formData, importancia: !formData.importancia })}
                  >
                    <Star
                      className={`h-4.5 w-4.5 transition-all duration-200 ${formData.importancia ? "scale-110" : "scale-100"}`}
                      style={{
                        color: "#f59e0b",
                        fill: formData.importancia ? "#f59e0b" : "transparent",
                        filter: formData.importancia ? "drop-shadow(0 0 4px rgba(245,158,11,0.5))" : "none",
                      }}
                    />
                    <span className={`text-sm font-medium ${formData.importancia ? "text-amber-700" : "text-muted-foreground"}`}>
                      {formData.importancia ? "Destaque ativo" : "Sem destaque"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descricao</Label>
                <Textarea
                  className={campoFoiEditado("descricao") ? editedFieldClass : ""}
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descricao da noticia..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Link</Label>
                  <Input
                    className={campoFoiEditado("link") ? editedFieldClass : ""}
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observacao</Label>
                  <Input
                    className={campoFoiEditado("observacao") ? editedFieldClass : ""}
                    value={formData.observacao}
                    onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                    placeholder="Observacoes"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Imagem ou Video</Label>

                {/* Mídia existente (só aparece ao editar) */}
                {existingMediaUrl && !removeExistingMedia && !imgVideoBase64 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/30">
                    <img
                      src={existingMediaUrl}
                      alt="Midia atual"
                      className="h-20 w-28 object-cover rounded-md flex-shrink-0 border border-border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-medium text-foreground">Midia atual</p>
                      <p className="text-xs text-muted-foreground">
                        Selecione um novo arquivo para substituir, ou remova a imagem abaixo.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 w-fit"
                        onClick={() => setRemoveExistingMedia(true)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Remover imagem
                      </Button>
                    </div>
                  </div>
                )}

                {/* Feedback quando imagem foi marcada para remoção */}
                {removeExistingMedia && (
                  <div className="flex items-center gap-2 p-2 rounded-md border border-destructive/30 bg-destructive/5">
                    <p className="text-xs text-destructive flex-1">Imagem sera removida ao salvar.</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setRemoveExistingMedia(false)}
                    >
                      Desfazer
                    </Button>
                  </div>
                )}

                <Input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaChange}
                  disabled={removeExistingMedia}
                />

                {/* Preview do novo arquivo selecionado */}
                {imgVideoBase64 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50/50">
                    {imgVideoBase64.startsWith("data:video") ? (
                      <video
                        src={imgVideoBase64}
                        className="h-24 w-36 object-cover rounded-md flex-shrink-0 border border-border"
                        muted
                        playsInline
                        onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                        onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                      />
                    ) : (
                      <img
                        src={imgVideoBase64}
                        alt="Preview"
                        className="h-24 w-36 object-cover rounded-md flex-shrink-0 border border-border"
                      />
                    )}
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <p className="text-xs font-medium text-emerald-700">Novo arquivo selecionado</p>
                      <p className="text-xs text-muted-foreground truncate">{selectedMediaName}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 w-fit"
                        onClick={() => {
                          setImgVideoBase64(null);
                          setSelectedMediaName("");
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Remover
                      </Button>
                    </div>
                  </div>
                )}

                {!imgVideoBase64 && (
                  <p className="text-xs text-muted-foreground">
                    {existingMediaUrl && !removeExistingMedia
                      ? "Selecione um arquivo para substituir a midia atual."
                      : "Campo opcional. Aceita imagem ou video (max. 25MB)."}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              {editingId === null && (
                <Button type="button" variant="outline" onClick={limparNovaNoticia} disabled={salvando}>
                  Limpar
                </Button>
              )}
              <Button variant="outline" onClick={fecharForm} disabled={salvando}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button onClick={solicitarSalvar} disabled={salvando} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Save className="h-4 w-4 mr-1" />
                {salvando ? "Salvando..." : editingId ? "Salvar Edicao" : "Criar Noticia"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary text-primary">
                <Newspaper className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold">{noticias.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          {statusOptions.map((status) => {
            const count = noticias.filter((n) => normalizeStatus(n.status_post) === status.value).length;
            return (
              <Card key={status.value} className="border border-border shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{status.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border border-border shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead>ID</TableHead>
                  <TableHead>Titulo</TableHead>
                  <TableHead className="hidden md:table-cell">Descricao</TableHead>
                  <TableHead className="hidden lg:table-cell">Link</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Observacao</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carregando && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Carregando noticias...
                    </TableCell>
                  </TableRow>
                )}

                {!carregando && noticias.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhuma noticia cadastrada.
                    </TableCell>
                  </TableRow>
                )}

                {!carregando && noticias.map((n) => (
                  <TableRow key={n.id_noticia} className="hover:bg-secondary/30 transition-colors">
                    <TableCell className="font-medium">{n.id_noticia}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm flex items-center gap-1">
                        {n.importancia ? (
                          <Star className="h-3.5 w-3.5" style={{ color: "#f59e0b", fill: "#f59e0b" }} />
                        ) : null}
                        <span>{n.titulo}</span>
                      </p>
                      {n.possui_midia && <p className="text-[10px] text-muted-foreground mt-1">Com midia</p>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-xs text-muted-foreground line-clamp-2 max-w-sm">{n.descricao || "-"}</p>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-[220px]">{n.link || "-"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${statusColor[normalizeStatus(n.status_post)] || "bg-muted text-muted-foreground"}`}>
                        {getStatusLabel(n.status_post)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]">{n.observacao || "-"}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-7 w-7 px-0 transition-all duration-200 ${
                            n.importancia
                              ? "border-amber-400/60 bg-amber-50 hover:bg-amber-100"
                              : "hover:border-amber-300/40 hover:bg-amber-50/30"
                          }`}
                          onClick={() => toggleImportancia(n)}
                          aria-label="Marcar como destaque"
                        >
                          <Star
                            className="h-3.5 w-3.5"
                            style={{
                              color: "#f59e0b",
                              fill: n.importancia ? "#f59e0b" : "transparent",
                              filter: n.importancia ? "drop-shadow(0 0 3px rgba(245,158,11,0.4))" : "none",
                            }}
                          />
                        </Button>
                        {normalizeStatus(n.status_post) === "enviado" ? (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-muted text-muted-foreground"
                            disabled
                          >
                            Enviado
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white"
                            onClick={() => enviarNoticia(n)}
                            disabled={!!enviandoIds[n.id_noticia]}
                          >
                            {enviandoIds[n.id_noticia] ? "Enviando..." : "Enviar"}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => editar(n)}>
                          <Pencil className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => setNoticiaParaExcluir(n)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar alteracoes</AlertDialogTitle>
              <AlertDialogDescription>
                Serao salvas {camposAlterados.length + (imgVideoBase64 ? 1 : 0) + (removeExistingMedia ? 1 : 0)} mudanca(s)
                {camposAlterados.length > 0 ? `: ${camposAlterados.map((c) => noticiaFieldLabel[c]).join(", ")}` : ""}
                {imgVideoBase64 ? `${camposAlterados.length > 0 ? ", " : ": "}Nova Midia` : ""}
                {removeExistingMedia ? `${(camposAlterados.length > 0 || imgVideoBase64) ? ", " : ": "}Remover Midia` : ""}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={salvarNoticia}
              >
                Salvar alteracoes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!noticiaParaExcluir} onOpenChange={(open) => !open && setNoticiaParaExcluir(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir noticia?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa acao remove a noticia "{noticiaParaExcluir?.titulo || "-"}" de forma permanente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => noticiaParaExcluir && remover(noticiaParaExcluir.id_noticia)}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default Noticias;
