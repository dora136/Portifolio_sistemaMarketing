import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useIsFetching } from "@tanstack/react-query";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(17, 24, 39, 0.72)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  transition: "opacity 0.4s ease",
};

export function PageTransitionLoader() {
  const location = useLocation();
  const isFetching = useIsFetching();
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity] = useState(1);

  // Refs para evitar closure stale nos timers
  const isVisibleRef = useRef(false);
  const hasStartedFetchingRef = useRef(false);
  const quickFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hardFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathRef = useRef(location.pathname);

  function hide() {
    if (!isVisibleRef.current) return;
    isVisibleRef.current = false;
    if (quickFallbackRef.current) clearTimeout(quickFallbackRef.current);
    if (hardFallbackRef.current) clearTimeout(hardFallbackRef.current);
    setOpacity(0);
    setTimeout(() => setVisible(false), 400);
  }

  // Detecta mudança de rota
  useEffect(() => {
    if (location.pathname === prevPathRef.current) return;
    prevPathRef.current = location.pathname;

    isVisibleRef.current = true;
    hasStartedFetchingRef.current = false;
    setOpacity(1);
    setVisible(true);

    // Se não iniciar nenhuma query em 700ms, some (dados em cache)
    quickFallbackRef.current = setTimeout(() => {
      if (!hasStartedFetchingRef.current) hide();
    }, 700);

    // Fallback máximo de 6s
    hardFallbackRef.current = setTimeout(() => hide(), 6000);

    return () => {
      if (quickFallbackRef.current) clearTimeout(quickFallbackRef.current);
      if (hardFallbackRef.current) clearTimeout(hardFallbackRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Acompanha o fetching
  useEffect(() => {
    if (!isVisibleRef.current) return;

    if (isFetching > 0) {
      hasStartedFetchingRef.current = true;
      // Cancela o quick fallback — há dados chegando
      if (quickFallbackRef.current) clearTimeout(quickFallbackRef.current);
    }

    if (hasStartedFetchingRef.current && isFetching === 0) {
      // Pequeno delay para o React pintar os dados antes de sumir
      setTimeout(() => hide(), 150);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetching]);

  if (!visible) return null;

  return (
    <div style={{ ...overlayStyle, opacity }}>
      <img
        src="/portifolio/static/marketing/completo-branco.svg"
        alt="portifolio"
        style={{ width: 240, animation: "logoBreath 2s ease-in-out infinite" }}
      />
      <style>{`
        @keyframes logoBreath {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.93); }
        }
      `}</style>
    </div>
  );
}
