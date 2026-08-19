"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { lookupBarcode, type BarcodeLookupResult } from "@/lib/actions/barcode";

interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface BarcodeConfirmed {
  barcode: string;
  name: string;
  macros: Macros;
  servingSize: string | null;
  servingQuantityG: number | null;
  wasEdited: boolean;
}

export function BarcodeScan({ onConfirmed }: { onConfirmed: (result: BarcodeConfirmed) => void }) {
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [initial, setInitial] = useState<BarcodeLookupResult | null>(null);
  const [name, setName] = useState("");
  const [macros, setMacros] = useState<Macros>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [servingSize, setServingSize] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isLookingUp, startLookup] = useTransition();

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const runLookup = (code: string) => {
    setError(null);
    startLookup(async () => {
      const result = await lookupBarcode(code);
      setBarcode(code);
      setInitial(result);
      setNotFound(!result.found);
      setName(result.name || code);
      setMacros({
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
      });
      setServingSize(result.servingSize ?? "");
      if (result.error && !result.found) setError(result.error);
    });
  };

  const stopScanning = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };

  const startScanning = async () => {
    setError(null);
    setScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result) => {
          if (result) {
            stopScanning();
            runLookup(result.getText());
          }
        },
      );
      controlsRef.current = controls;
    } catch {
      setError("Couldn't access the camera. You can still enter a barcode manually below.");
      setScanning(false);
    }
  };

  useEffect(() => stopScanning, []);

  const wasEdited = (): boolean => {
    if (!initial) return true;
    if (notFound) return true;
    return (
      macros.calories !== initial.calories ||
      macros.protein !== initial.protein ||
      macros.carbs !== initial.carbs ||
      macros.fat !== initial.fat
    );
  };

  const reset = () => {
    setBarcode(null);
    setInitial(null);
    setManualBarcode("");
    setNotFound(false);
  };

  const continueToDetail = () => {
    if (!barcode) return;
    onConfirmed({
      barcode,
      name,
      macros,
      servingSize: servingSize || null,
      servingQuantityG: initial?.servingQuantityG ?? null,
      wasEdited: wasEdited(),
    });
    reset();
  };

  return (
    <div className="space-y-3">
      {!barcode && (
        <>
          <div className="flex flex-wrap gap-2">
            {!scanning ? (
              <button
                type="button"
                onClick={startScanning}
                className="rounded-md bg-tennessee px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark"
              >
                Scan with camera
              </button>
            ) : (
              <button
                type="button"
                onClick={stopScanning}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium dark:border-neutral-700"
              >
                Cancel scan
              </button>
            )}
          </div>

          {scanning && (
            <video ref={videoRef} className="w-full max-w-sm rounded-md border border-neutral-300 dark:border-neutral-700" />
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualBarcode.trim()) runLookup(manualBarcode.trim());
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              inputMode="numeric"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="Or type a barcode number"
              className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button
              type="submit"
              disabled={isLookingUp || !manualBarcode.trim()}
              className="rounded-md bg-tennessee px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark disabled:opacity-50"
            >
              {isLookingUp ? "Looking up…" : "Look up"}
            </button>
          </form>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {barcode && (
        <div className="space-y-3 rounded-2xl bg-neutral-50/80 p-4 dark:bg-neutral-800/40">
          {initial?.isCorrection && (
            <p className="text-xs text-neutral-500">Using your saved correction for this barcode.</p>
          )}
          {notFound && (
            <p className="text-sm text-amber-600">
              No product found for barcode {barcode}. Enter the nutrition info manually — it&apos;ll
              be saved for next time you scan this item.
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-500">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>

          {servingSize && (
            <p className="text-xs text-neutral-400">
              Reported serving: {servingSize}
              {initial?.servingQuantityG
                ? ` — the next screen will default to logging ${initial.servingQuantityG}g`
                : ""}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500">Calories /100g</label>
              <input
                type="number"
                step="any"
                value={macros.calories}
                onChange={(e) => setMacros({ ...macros, calories: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500">Protein /100g</label>
              <input
                type="number"
                step="any"
                value={macros.protein}
                onChange={(e) => setMacros({ ...macros, protein: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500">Carbs /100g</label>
              <input
                type="number"
                step="any"
                value={macros.carbs}
                onChange={(e) => setMacros({ ...macros, carbs: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500">Fat /100g</label>
              <input
                type="number"
                step="any"
                value={macros.fat}
                onChange={(e) => setMacros({ ...macros, fat: Number(e.target.value) || 0 })}
                className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={continueToDetail}
              className="rounded-md bg-tennessee px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-tennessee-dark"
            >
              Continue
            </button>
            <button type="button" onClick={reset} className="text-sm text-neutral-500 underline">
              Scan another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
