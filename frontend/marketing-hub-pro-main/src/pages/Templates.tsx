import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Copy,
  Eye,
  Download,
  FileText,
  Image,
  Video,
  Mail,
  Layout,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

interface Template {
  id: string | number;
  titulo: string;
  descricao: string;
  categoria: string;
  tipo: string;
  autor: string;
  data: string;
  preview: boolean;
}

const fallbackTemplates: Template[] = [];

const categorias = ["Email", "Social Media", "Landing Page", "Apresentação", "Vídeo"];

const tipoIcon: Record<string, React.ReactNode> = {
  email: <Mail className="h-5 w-5" />,
  imagem: <Image className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
  documento: <FileText className="h-5 w-5" />,
  layout: <Layout className="h-5 w-5" />,
};

const categoriaColor: Record<string, string> = {
  Email: "bg-primary text-primary-foreground",
  "Social Media": "bg-accent text-accent-foreground",
  "Landing Page": "bg-success text-success-foreground",
  "Apresentação": "bg-info text-info-foreground",
  "Vídeo": "bg-destructive text-destructive-foreground",
};

const Templates = () => {
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [templateList, setTemplateList] = useState<Template[]>(fallbackTemplates);
  const [modalOpen, setModalOpen] = useState(false);
  const [novoTemplate, setNovoTemplate] = useState({
    titulo: "",
    descricao: "",
    categoria: "",
    tipo: "",
    autor: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/portifolio/api/templates");
        if (!resp.ok) return;
        const data = await resp.json();
        const items = Array.isArray(data?.templates) ? data.templates : [];
        if (!cancelled && items.length > 0) setTemplateList(items);
      } catch {
        // mantém fallback local
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = templateList.filter((t) => {
    const matchSearch = t.titulo.toLowerCase().includes(search.toLowerCase()) || t.descricao.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategoria === "all" || t.categoria === filterCategoria;
    return matchSearch && matchCat;
  });

  const handleAddTemplate = () => {
    if (!novoTemplate.titulo || !novoTemplate.categoria || !novoTemplate.tipo) {
      toast.error("Preencha título, categoria e tipo.");
      return;
    }
    const novo: Template = {
      id: Date.now(),
      titulo: novoTemplate.titulo,
      descricao: novoTemplate.descricao,
      categoria: novoTemplate.categoria,
      tipo: novoTemplate.tipo,
      autor: novoTemplate.autor || "Usuário",
      data: new Date().toISOString().split("T")[0],
      preview: true,
    };
    setTemplateList((prev) => [novo, ...prev]);
    setNovoTemplate({ titulo: "", descricao: "", categoria: "", tipo: "", autor: "" });
    setModalOpen(false);
    toast.success("Template adicionado com sucesso!");
  };

  const tipos = [
    { value: "email", label: "Email" },
    { value: "imagem", label: "Imagem" },
    { value: "video", label: "Vídeo" },
    { value: "documento", label: "Documento" },
    { value: "layout", label: "Layout" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <Badge className="mb-2 bg-primary text-primary-foreground">REPOSITÓRIO</Badge>
            <h1 className="text-3xl font-bold tracking-tight">
              Templates de Marketing
            </h1>
            <p className="text-muted-foreground mt-1">
              Biblioteca de templates prontos para campanhas e comunicações.
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Template
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar template..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <Card key={template.id} className="border border-border shadow-sm hover:shadow-md transition-all group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-secondary text-primary">
                    {tipoIcon[template.tipo]}
                  </div>
                  <Badge className={`text-[10px] ${categoriaColor[template.categoria] || ""}`}>
                    {template.categoria}
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm mb-1">{template.titulo}</h3>
                <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                  {template.descricao}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span>{template.autor}</span>
                  <span>{new Date(template.data).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    Ver
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs px-2">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modal Novo Template */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Template</DialogTitle>
              <DialogDescription>Preencha os dados do novo template de marketing.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  placeholder="Nome do template"
                  value={novoTemplate.titulo}
                  onChange={(e) => setNovoTemplate((p) => ({ ...p, titulo: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva o template..."
                  value={novoTemplate.descricao}
                  onChange={(e) => setNovoTemplate((p) => ({ ...p, descricao: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select
                    value={novoTemplate.categoria}
                    onValueChange={(v) => setNovoTemplate((p) => ({ ...p, categoria: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={novoTemplate.tipo}
                    onValueChange={(v) => setNovoTemplate((p) => ({ ...p, tipo: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="autor">Autor</Label>
                <Input
                  id="autor"
                  placeholder="Nome do autor"
                  value={novoTemplate.autor}
                  onChange={(e) => setNovoTemplate((p) => ({ ...p, autor: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddTemplate}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Templates;
