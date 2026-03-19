import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  ArrowLeft,
  LayoutDashboard,
  Users,
  FolderOpen,
  Newspaper,
  KanbanSquare,
  DollarSign,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", url: "/home", icon: LayoutDashboard },
  { title: "Direcionamento", url: "/direcionamento", icon: Users },
  { title: "Templates", url: "/portifolio/templates", icon: FolderOpen, external: true },
  { title: "Central de Notícias", url: "/noticias", icon: Newspaper },
  { title: "Kanban", url: "/kanban", icon: KanbanSquare },
  { title: "Custos & Acessos", url: "/custos", icon: DollarSign },
  { title: "Calendário", url: "/calendario", icon: CalendarDays },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const [portalUrl, setPortalUrl] = useState<string>("https://portal.oriontech.com.br/dashboard");

  useEffect(() => {
    let mounted = true;
    const loadConfig = async () => {
      try {
        const response = await fetch("/portifolio/api/config");
        if (!response.ok) return;
        const payload = await response.json();
        const url = String(payload?.portal_url || "#");
        if (mounted) setPortalUrl(url || "#");
      } catch {
        // ignore
      }
    };
    loadConfig();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <aside
      className={`${
        collapsed ? "w-16" : "w-64"
      } h-full pb-6 bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 border-r border-sidebar-border`}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border">
        <div className="w-6" />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-sidebar-accent transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = (item as any).external
            ? location.pathname === item.url
            : location.pathname === item.url;

          if ((item as any).external) {
            return (
              <a
                key={item.url}
                href={item.url}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </a>
            );
          }

          return (
            <NavLink
              key={item.url}
              to={item.url}
              end
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? ""
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
              activeClassName="bg-sidebar-accent text-accent"
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <a
          href={portalUrl}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground ${collapsed ? "justify-center" : ""}`}
          title="Voltar ao Portal Principal"
        >
          <ArrowLeft className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>Voltar ao Portal Principal</span>}
        </a>
      </div>
    </aside>
  );
}
