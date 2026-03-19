import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Eye, EyeOff, ExternalLink, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface Acesso {
  id_assinatura: number | null;
  plataforma: string | null;
  area: string | null;
  valor: number | null;
  data_referencia: string | null;
  data_criacao: string | null;
  link: string | null;
  email: string | null;
  senha: string | null;
}

interface AcessosResponse {
  ok: boolean;
  acessos: Acesso[];
}

interface AcessoResponse {
  ok: boolean;
  acesso: Acesso;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString("pt-BR");
};

const defaultForm = {
  plataforma: "",
  valor: "",
  data_referencia: "",
  link: "",
  email: "",
  senha: "",
};

type AcessoForm = typeof defaultForm;

const dataReferenciaCobrancaOptions: readonly string[] = [
  "Cobrança Mensal",
  "Cobrança Anual",
  "Cobrança 2 Anos",
  "Cobrança Única",
  "Cobrança Trimestral",
  "Cobrança Semestral",
];

const CanalCustos = () => {
  const [acessos, setAcessos] = useState<Acesso[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AcessoForm>(defaultForm);
  const [senhaVisivelForm, setSenhaVisivelForm] = useState(false);
  const [senhasVisiveis, setSenhasVisiveis] = useState<Record<string, boolean>>({});
  const [acessoParaExcluir, setAcessoParaExcluir] = useState<Acesso | null>(null);

  const total = useMemo(() => acessos.length, [acessos]);
  const dataReferenciaValue = formData.data_referencia.trim();

  const carregarAcessos = async () => {
    setCarregando(true);
    try {
      const response = await fetch("/portifolio/api/acessos");
      if (!response.ok) throw new Error("Falha ao carregar acessos.");
      const payload = (await response.json()) as AcessosResponse;
      setAcessos(payload.acessos || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao carregar acessos.");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarAcessos();
  }, []);

  const hasDraftNovoAcesso = useMemo(() => {
    if (editingId !== null) return false;
    return Object.values(formData).some((value) => value.trim() !== "");
  }, [editingId, formData]);

  const resetForm = () => {
    setFormData(defaultForm);
    setEditingId(null);
    setSenhaVisivelForm(false);
    setShowForm(false);
  };

  const fecharForm = () => {
    setShowForm(false);
    setSenhaVisivelForm(false);
  };

  const limparNovoAcesso = () => {
    setEditingId(null);
    setFormData(defaultForm);
    setSenhaVisivelForm(false);
  };

  const abrirNovoAcesso = () => {
    if (hasDraftNovoAcesso && !showForm) {
      setShowForm(true);
      return;
    }
    setEditingId(null);
    setFormData(defaultForm);
    setSenhaVisivelForm(false);
    setShowForm(true);
  };

  const abrirEdicao = (acesso: Acesso) => {
    setEditingId(acesso.id_assinatura ?? null);
    setFormData({
      plataforma: acesso.plataforma || "",
      valor: typeof acesso.valor === "number" ? String(acesso.valor) : "",
      data_referencia: acesso.data_referencia || "",
      link: acesso.link || "",
      email: acesso.email || "",
      senha: acesso.senha || "",
    });
    setSenhaVisivelForm(false);
    setShowForm(true);
  };

  const buildPayload = (data: AcessoForm) => {
    const plataforma = data.plataforma.trim();
    if (!plataforma) throw new Error("Plataforma e obrigatoria.");

    const rawValor = data.valor.trim();
    const valor = rawValor ? Number(rawValor) : null;
    if (rawValor && Number.isNaN(valor)) throw new Error("Valor invalido.");

    const normalize = (value: string) => {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    };

    return {
      plataforma,
      valor,
      data_referencia: normalize(data.data_referencia),
      link: normalize(data.link),
      email: normalize(data.email),
      senha: normalize(data.senha),
    };
  };

  const salvarAcesso = async () => {
    setSalvando(true);
    try {
      const payload = buildPayload(formData);
      const isEdit = editingId !== null;
      const endpoint = isEdit ? `/portifolio/api/acessos/${editingId}` : "/portifolio/api/acessos";
      const response = await fetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Falha ao salvar acesso.");

      if (!isEdit) {
        const created = (await response.json()) as AcessoResponse;
        if (!created.acesso) throw new Error("Falha ao salvar acesso.");
      }

      toast.success(isEdit ? "Acesso atualizado." : "Acesso criado.");
      resetForm();
      await carregarAcessos();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar acesso.");
    } finally {
      setSalvando(false);
    }
  };

  const toggleSenha = (key: string) => {
    setSenhasVisiveis((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const abrirLink = (link: string) => {
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const excluirAcesso = async (acesso: Acesso) => {
    if (acesso.id_assinatura == null) return;
    setSalvando(true);
    try {
      const response = await fetch(`/portifolio/api/acessos/${acesso.id_assinatura}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Falha ao excluir acesso.");
      toast.success("Acesso excluido.");
      setAcessoParaExcluir(null);
      await carregarAcessos();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir acesso.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Badge className="mb-2 bg-primary text-primary-foreground">ACESSOS</Badge>
            <h1 className="text-3xl font-bold tracking-tight">Credenciais & Custos</h1>
            <p className="text-muted-foreground mt-1">Lista de acessos das plataformas de marketing ({total}).</p>
          </div>
          <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={abrirNovoAcesso}>
            <Plus className="h-4 w-4" />
            Adicionar acesso
          </Button>
        </div>

        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Acessos cadastrados
            </CardTitle>
            <p className="text-xs text-muted-foreground">Senhas ficam ocultas por padrao (use o olhinho).</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data ref.</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Senha</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acessos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-sm text-muted-foreground py-8 text-center">
                        {carregando ? "Carregando..." : "Nenhum acesso encontrado."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    acessos.map((acesso, index) => {
                      const rowKey = String(acesso.id_assinatura ?? `row-${index}`);
                      const senhaVisivel = !!senhasVisiveis[rowKey];
                      const link = (acesso.link || "").trim();

                      return (
                        <TableRow key={rowKey}>
                          <TableCell className="font-medium text-sm">{acesso.plataforma || "-"}</TableCell>
                          <TableCell className="text-sm">{acesso.area || "Marketing"}</TableCell>
                          <TableCell className="text-sm font-semibold">
                            {typeof acesso.valor === "number" ? formatCurrency(acesso.valor) : "-"}
                          </TableCell>
                          <TableCell className="text-sm">{acesso.data_referencia || "-"}</TableCell>
                          <TableCell className="text-sm">{formatDateTime(acesso.data_criacao)}</TableCell>
                          <TableCell className="text-sm">
                            {link ? (
                              <div className="flex items-center gap-2 max-w-[320px]">
                                <span className="truncate text-xs text-muted-foreground">{link}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => abrirLink(link)}
                                  aria-label="Abrir link"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{acesso.email || "-"}</TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              <Input
                                value={acesso.senha || ""}
                                type={senhaVisivel ? "text" : "password"}
                                readOnly
                                className="h-8 w-48 font-mono text-xs"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => toggleSenha(rowKey)}
                                aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
                              >
                                {senhaVisivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => abrirEdicao(acesso)}
                                aria-label="Editar acesso"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setAcessoParaExcluir(acesso)}
                                aria-label="Excluir acesso"
                                disabled={acesso.id_assinatura == null}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog
          open={showForm}
          onOpenChange={(open) => {
            setShowForm(open);
            if (!open) setSenhaVisivelForm(false);
          }}
        >
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar acesso" : "Adicionar acesso"}</DialogTitle>
              <DialogDescription>Preencha os dados e salve.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Plataforma</Label>
                <Input
                  value={formData.plataforma}
                  onChange={(e) => setFormData((prev) => ({ ...prev, plataforma: e.target.value }))}
                  placeholder="Ex: Meta Ads"
                />
              </div>

              <div className="grid gap-2">
                <Label>Area</Label>
                <Input value="Marketing" readOnly disabled />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Valor</Label>
                  <Input
                    value={formData.valor}
                    onChange={(e) => setFormData((prev) => ({ ...prev, valor: e.target.value }))}
                    placeholder="Ex: 129.90"
                    inputMode="decimal"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Data referencia</Label>
                  <Select
                    value={dataReferenciaValue || undefined}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, data_referencia: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a cobrança" />
                    </SelectTrigger>
                    <SelectContent>
                      {dataReferenciaCobrancaOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                      {dataReferenciaValue && !dataReferenciaCobrancaOptions.includes(dataReferenciaValue) && (
                          <SelectItem value={dataReferenciaValue}>
                            Personalizado: {dataReferenciaValue}
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.link}
                    onChange={(e) => setFormData((prev) => ({ ...prev, link: e.target.value }))}
                    placeholder="https://..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => formData.link.trim() && abrirLink(formData.link.trim())}
                    disabled={!formData.link.trim()}
                    aria-label="Abrir link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="email@empresa.com"
                />
              </div>

              <div className="grid gap-2">
                <Label>Senha</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={formData.senha}
                    type={senhaVisivelForm ? "text" : "password"}
                    onChange={(e) => setFormData((prev) => ({ ...prev, senha: e.target.value }))}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => setSenhaVisivelForm((prev) => !prev)}
                    aria-label={senhaVisivelForm ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {senhaVisivelForm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              {editingId === null && (
                <Button type="button" variant="outline" onClick={limparNovoAcesso} disabled={salvando}>
                  Limpar
                </Button>
              )}
              <Button type="button" variant="outline" onClick={fecharForm} disabled={salvando}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                onClick={salvarAcesso}
                disabled={salvando}
              >
                <Save className="h-4 w-4 mr-1" />
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!acessoParaExcluir} onOpenChange={(open) => !open && setAcessoParaExcluir(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir acesso?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acao remove o acesso de forma permanente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={salvando}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => acessoParaExcluir && excluirAcesso(acessoParaExcluir)}
                disabled={salvando}
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

export default CanalCustos;
