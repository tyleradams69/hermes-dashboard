"use client";

import { Toaster, toast } from "sonner";
import { useEffect, useRef } from "react";

export default function SystemToasts({
  signal,
}: {
  signal: string | null;
}) {
  const previous = useRef<string | null>(null);

  useEffect(() => {
    if (!signal) return;

    if (previous.current && previous.current !== signal) {
      toast.success("NEW SIGNAL DETECTED", {
        description: signal,
        duration: 3200,
      });
    }

    previous.current = signal;
  }, [signal]);

  return (
    <Toaster
      richColors
      position="top-right"
      toastOptions={{
        style: {
          background: "rgba(5,6,8,0.94)",
          border: "1px solid rgba(34,211,238,0.2)",
          color: "white",
          backdropFilter: "blur(18px)",
        },
      }}
    />
  );
}
