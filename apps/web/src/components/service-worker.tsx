"use client";

import { useEffect } from "react";

/** Registers the service worker (push + offline). In development it only handles push, so hot reload isn't cached. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const url = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?dev=1";
    navigator.serviceWorker.register(url).catch(() => undefined);
  }, []);
  return null;
}
