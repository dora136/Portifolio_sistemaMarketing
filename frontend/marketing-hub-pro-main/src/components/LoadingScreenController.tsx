import { useEffect, useRef, useState } from "react";
import { useIsFetching } from "@tanstack/react-query";

function hideLoadingScreen() {
  const loading = document.getElementById("loading-screen");
  if (loading) {
    loading.classList.add("fade-out");
    setTimeout(() => loading.remove(), 500);
  }
}

export function LoadingScreenController() {
  const isFetching = useIsFetching();
  const [hasStartedFetching, setHasStartedFetching] = useState(false);
  const isHiddenRef = useRef(false);

  useEffect(() => {
    if (isFetching > 0) setHasStartedFetching(true);
  }, [isFetching]);

  // Some quando todas as queries da página terminarem
  useEffect(() => {
    if (hasStartedFetching && isFetching === 0 && !isHiddenRef.current) {
      isHiddenRef.current = true;
      // Pequeno delay para o React pintar os dados na tela antes de sumir
      setTimeout(hideLoadingScreen, 200);
    }
  }, [hasStartedFetching, isFetching]);

  // Fallback: página sem queries some em 2s
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isHiddenRef.current) {
        isHiddenRef.current = true;
        hideLoadingScreen();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
