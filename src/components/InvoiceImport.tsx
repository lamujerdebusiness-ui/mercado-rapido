"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Camera, FileDown, Link, Loader2, X } from "lucide-react";
import type { Category } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { getQuantityMultiplier } from "@/lib/itemInput";
import type { IScannerControls } from "@zxing/browser";

type ImportedInvoiceItem = {
  name: string;
  quantity: string | null;
  category: Category;
  unit_price: number | null;
};

type InvoiceImportProps = {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onImport: (items: ImportedInvoiceItem[]) => Promise<void>;
};

export function InvoiceImport({ open, busy, onClose, onImport }: InvoiceImportProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const scanningRef = useRef(false);
  const [qrCode, setQrCode] = useState("");
  const [items, setItems] = useState<ImportedInvoiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      stopCamera();
      setQrCode("");
      setItems([]);
      setError("");
      setLoading(false);
    }

    return () => stopCamera();
  }, [open]);

  if (!open) {
    return null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await fetchInvoice(qrCode);
  }

  async function fetchInvoice(value: string) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      setError("Leia o QR Code ou cole o link da NFC-e.");
      return;
    }

    setLoading(true);
    setError("");
    setItems([]);

    try {
      const response = await fetch("/api/nfce/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ qrCode: trimmedValue }),
      });
      const result = (await response.json()) as { error?: string; items?: ImportedInvoiceItem[] };

      if (!response.ok || !result.items) {
        setError(result.error ?? "Não foi possível importar a nota.");
        return;
      }

      setItems(result.items);
      stopCamera();
    } catch {
      setError("Não foi possível buscar a nota. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    setError("");

    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setError("Não consegui acessar a câmera neste navegador.");
      return;
    }

    setCameraLoading(true);

    try {
      stopCamera();
      scanningRef.current = true;
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        videoRef.current,
        (result) => {
          const value = result?.getText();

          if (!value || !scanningRef.current) {
            return;
          }

          scanningRef.current = false;
          setQrCode(value);
          stopCamera();
          void fetchInvoice(value);
        },
      );
    } catch {
      setError("Não foi possível abrir a câmera. Você pode colar o link da NFC-e manualmente.");
    } finally {
      setCameraLoading(false);
    }
  }

  function stopCamera() {
    scanningRef.current = false;
    controlsRef.current?.stop();
    controlsRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function importItems() {
    if (items.length === 0) {
      return;
    }

    await onImport(items);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-slate-950/50 p-3 sm:items-center sm:justify-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-4 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Importar NFC-e</h2>
            <p className="mt-1 text-sm text-slate-500">Escaneie o QR Code da nota ou cole o link da consulta.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg bg-slate-950">
          <video ref={videoRef} className="aspect-[4/3] w-full object-cover" muted playsInline />
        </div>

        <button
          type="button"
          onClick={() => void startCamera()}
          disabled={loading || cameraLoading}
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {cameraLoading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Camera size={18} aria-hidden="true" />}
          {cameraLoading ? "Abrindo câmera..." : "Escanear QR Code"}
        </button>

        <form onSubmit={submit} className="mt-3">
          <label className="sr-only" htmlFor="nfce-link">
            Link da NFC-e
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Link
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="nfce-link"
                value={qrCode}
                onChange={(event) => setQrCode(event.target.value)}
                className="h-12 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                placeholder="Cole o link do QR Code"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !qrCode.trim()}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : "Buscar"}
            </button>
          </div>
        </form>

        {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        {items.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-700">{items.length} itens encontrados</p>
            <div className="mt-2 grid max-h-64 gap-2 overflow-y-auto pr-1">
              {items.map((item, index) => (
                <div key={`${item.name}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.quantity ?? "1 un"} · {item.category} · {formatCurrency(item.unit_price)} · Total{" "}
                    {formatCurrency(Number(item.unit_price ?? 0) * getQuantityMultiplier(item.quantity))}
                  </p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void importItems()}
              disabled={busy}
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              <FileDown size={18} aria-hidden="true" />
              {busy ? "Importando..." : "Importar itens para a lista"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
