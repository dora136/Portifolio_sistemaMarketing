import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoadingScreenController } from "@/components/LoadingScreenController";
import { PageTransitionLoader } from "@/components/PageTransitionLoader";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Direcionamento from "./pages/Direcionamento";

import Noticias from "./pages/Noticias";
import Kanban from "./pages/Kanban";
import CanalCustos from "./pages/CanalCustos";
import Calendario from "./pages/Calendario";
import Analytics from "./pages/Analytics";
import AnalyticsBlog from "./pages/AnalyticsBlog";
import AnalyticsContacts from "./pages/AnalyticsContacts";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LoadingScreenController />
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/portifolio">
        <PageTransitionLoader />
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Index />} />
          <Route path="/direcionamento" element={<Direcionamento />} />
          {/* Templates usa página server-side (Jinja2) — não interceptar aqui */}
          <Route path="/noticias" element={<Noticias />} />
          <Route path="/kanban" element={<Kanban />} />
          <Route path="/custos" element={<CanalCustos />} />
          <Route path="/calendario" element={<Calendario />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/analytics/blog" element={<AnalyticsBlog />} />
          <Route path="/analytics/contacts" element={<AnalyticsContacts />} />
          <Route path="/analytics/:type" element={<Analytics />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
