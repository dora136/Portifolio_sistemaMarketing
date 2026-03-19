import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

type NotificationLevel = "danger" | "orange" | "warning" | "success" | "info";

interface NotificationItem {
  title: string;
  subtitle?: string;
  dueDate: string;
  label: string;
  level: NotificationLevel;
}

interface KanbanAtividadeApi {
  id_atividade: number;
  id_kanban: number;
  titulo: string;
  descricao: string | null;
  data_prazo: string | null;
}

interface KanbanDataResponse {
  ok: boolean;
  items: KanbanAtividadeApi[];
  etapas: { id: number; nome: string; cor: string }[];
}

interface EventoApi {
  id_evento: number | null;
  nome: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  local: string | null;
  cidade: string | null;
}

interface EventosResponse {
  ok: boolean;
  eventos: EventoApi[];
}

const chipClass: Record<NotificationLevel, string> = {
  danger: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  warning: "bg-amber-100 text-amber-700",
  success: "bg-emerald-100 text-emerald-700",
  info: "bg-sky-100 text-sky-700",
};

const parseFlexibleDate = (value: string): Date | null => {
  const text = String(value || "").trim();
  if (!text) return null;

  // ISO date (yyyy-mm-dd) -> treat as end of day to match "prazo" expectations.
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 23, 59, 0, 0);
  }

  // BR (dd/mm/yyyy)
  const brMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const d = Number(brMatch[1]);
    const m = Number(brMatch[2]);
    const y = Number(brMatch[3]);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 23, 59, 0, 0);
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const formatDateISO = (value: string) => {
  const date = parseFlexibleDate(value);
  if (!date) return value;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}`;
};

const getDueBadgeInfo = (dateStr: string) => {
  const dueDate = parseFlexibleDate(dateStr);
  if (!dueDate) return null;
  const now = new Date();
  const diffHours = (dueDate.getTime() - now.getTime()) / 3600000;

  if (diffHours <= 1) return { label: "FALTA 1 HORA", level: "danger" as const };
  if (diffHours <= 24) return { label: "FALTA 1 DIA", level: "orange" as const };
  if (diffHours <= 72) return { label: "FALTAM 3 DIAS", level: "warning" as const };
  if (diffHours <= 168) return { label: "FALTA 1 SEMANA", level: "success" as const };
  return null;
};

const computeCalendarNotification = (dateText: string) => {
  const eventDate = parseFlexibleDate(dateText);
  if (!eventDate) return null;
  const now = new Date();
  const dayMs = 1000 * 60 * 60 * 24;
  const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / dayMs);
  if (diffDays < 0) return null;
  if (diffDays === 1) return { label: "FALTA 1 DIA", level: "orange" as const };
  if (diffDays === 3) return { label: "FALTAM 3 DIAS", level: "warning" as const };
  if (diffDays === 7) return { label: "FALTA 1 SEMANA", level: "success" as const };
  return null;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const count = items.length;

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const [kanbanRes, eventosRes] = await Promise.all([
        fetch("/portifolio/api/kanban/data"),
        fetch("/portifolio/api/eventos"),
      ]);

      const notifications: NotificationItem[] = [];

      if (kanbanRes.ok) {
        const kanban = (await kanbanRes.json()) as KanbanDataResponse;
        const etapas = Array.isArray(kanban.etapas) ? kanban.etapas : [];
        const lastStageId = etapas.length ? etapas[etapas.length - 1].id : 4;
        const activities = Array.isArray(kanban.items) ? kanban.items : [];
        activities
          .filter((a) => a && a.id_kanban !== lastStageId)
          .forEach((activity) => {
            const dueDate = activity.data_prazo;
            if (!dueDate) return;
            const info = getDueBadgeInfo(dueDate);
            if (!info) return;
            notifications.push({
              title: activity.titulo || "Atividade",
              subtitle: activity.descricao || "",
              dueDate: formatDateISO(dueDate),
              label: info.label,
              level: info.level,
            });
          });
      }

      if (eventosRes.ok) {
        const eventosPayload = (await eventosRes.json()) as EventosResponse;
        const eventos = Array.isArray(eventosPayload.eventos) ? eventosPayload.eventos : [];
        eventos.forEach((ev) => {
          const start = ev.data_inicio;
          if (!start) return;
          const info = computeCalendarNotification(start);
          if (!info) return;
          const subtitleParts = [ev.cidade, ev.local].filter(Boolean);
          notifications.push({
            title: ev.nome ? `Evento - ${ev.nome}` : "Evento",
            subtitle: subtitleParts.join(" - "),
            dueDate: formatDateISO(start),
            label: info.label,
            level: info.level,
          });
        });
      }

      setItems(notifications);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(() => loadNotifications(), 60 * 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const content = useMemo(() => {
    if (loading && items.length === 0) {
      return (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          Carregando notificacoes...
        </div>
      );
    }
    if (!items.length) {
      return (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          Sem notificacoes no momento.
        </div>
      );
    }
    return (
      <ScrollArea className="max-h-[360px]">
        <div className="divide-y divide-border/60">
          {items.map((item, idx) => (
            <div key={`${item.title}-${idx}`} className="px-4 py-3 flex flex-col gap-1.5">
              <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${chipClass[item.level]}`}>
                {item.label === "FALTA 1 HORA" ? "E HOJE" : item.label}
              </span>
              <span className="text-sm font-semibold text-foreground">{item.title}</span>
              {item.subtitle ? (
                <span className="text-xs text-muted-foreground line-clamp-1">{item.subtitle}</span>
              ) : null}
              <span className="text-xs text-muted-foreground">Prazo: {item.dueDate}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }, [items, loading]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative h-10 w-10 rounded-md border border-border bg-card text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
          aria-label="Notificacoes"
        >
          <Bell className="h-[18px] w-[18px]" />
          {count > 0 && (
            <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border text-[11px] font-bold text-muted-foreground uppercase">
          <span>Notificacoes</span>
          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px]">
            {count}
          </span>
        </div>
        {content}
      </PopoverContent>
    </Popover>
  );
}

