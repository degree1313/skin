"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { analyzeSkin, type SkinAnalysisResult } from "@/lib/skinAnalysis";

type Step = "capture" | "results";

export default function AnalyzePage() {
  const [step, setStep] = useState<Step>("capture");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<SkinAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const processImage = useCallback((img: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    const maxDim = 480;
    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = (height / width) * maxDim;
        width = maxDim;
      } else {
        width = (width / height) * maxDim;
        height = maxDim;
      }
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    return analyzeSkin(imageData);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setAnalyzing(true);
      try {
        const res = processImage(img);
        if (res) {
          setResult(res);
          setPhotoUrl(url);
          setStep("results");
        } else {
          setError("Analysis failed. Try another photo.");
        }
      } catch (err) {
        setError("Analysis failed. Try another photo.");
      }
      setAnalyzing(false);
    };
    img.onerror = () => {
      setError("Could not load image.");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setAnalyzing(true);
    try {
      const res = analyzeSkin(imageData);
      setResult(res);
      setPhotoUrl(canvas.toDataURL("image/jpeg", 0.9));
      setStep("results");
    } catch (err) {
      setError("Analysis failed.");
    }
    setAnalyzing(false);
  };

  const startCamera = useCallback(() => {
    if (streamRef.current) {
      setCameraActive(true);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } } })
      .then((stream) => {
        streamRef.current = stream;
        setCameraActive(true);
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Camera access denied or unavailable."));
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Stop camera when leaving the page (e.g. back to dashboard)
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const reset = useCallback(() => {
    stopCamera();
    setCameraActive(false);
    if (photoUrl?.startsWith("blob:")) URL.revokeObjectURL(photoUrl);
    setPhotoUrl(null);
    setResult(null);
    setError(null);
    setStep("capture");
  }, [photoUrl, stopCamera]);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            Back to dashboard
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">
            Skin photo analysis
          </h1>
          <div className="w-24" />
        </header>

        {step === "capture" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Take a photo or upload one. Use even lighting for best results.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary flex-1 py-2 text-sm"
                disabled={analyzing}
              >
                Upload photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={startCamera}
                className="btn-secondary flex-1 py-2 text-sm"
              >
                Use camera
              </button>
            </div>

            {cameraActive && (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full"
                />
                <div className="flex justify-center border-t border-white/10 p-3">
                  <button
                    type="button"
                    onClick={handleCapture}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
                    disabled={analyzing}
                  >
                    {analyzing ? "Analyzing..." : "Capture and analyze"}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-rose-300" role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        {step === "results" && result && photoUrl && (
          <ResultsView
            photoUrl={photoUrl}
            result={result}
            onReset={reset}
          />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function ResultsView({
  photoUrl,
  result,
  onReset,
}: {
  photoUrl: string;
  result: SkinAnalysisResult;
  onReset: () => void;
}) {
  const shineCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Draw shine overlay when image and result are ready (scale shine map to photo size)
  const drawShineOverlay = useCallback(() => {
    const img = imgRef.current;
    const canvas = shineCanvasRef.current;
    if (!img || !canvas || !result.shineMapImageData) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const map = result.shineMapImageData;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const temp = document.createElement("canvas");
    temp.width = map.width;
    temp.height = map.height;
    temp.getContext("2d")?.putImageData(map, 0, 0);
    ctx.drawImage(temp, 0, 0, map.width, map.height, 0, 0, w, h);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "rgba(255, 255, 200, 0.55)";
    ctx.fillRect(0, 0, w, h);
  }, [result.shineMapImageData]);

  const flakingLabels = ["None", "Mild", "Moderate", "Heavy"];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl border border-white/10">
        <img
          ref={imgRef}
          src={photoUrl}
          alt="Your skin"
          className="w-full"
          onLoad={drawShineOverlay}
        />
        <canvas
          ref={shineCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Redness / inflammation
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-50">
            {result.rednessIndex}
            <span className="ml-1 text-sm font-normal text-slate-400">/ 100</span>
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Higher may indicate irritation or redness.
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Shine map
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Yellow overlay shows areas of shine (oil/specular). Compare with your
            skin type.
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Dryness / flaking
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-50">
            {flakingLabels[result.suggestedFlakingSeverity]}
          </p>
          <p className="mt-1 text-xs text-slate-300">
            Suggested from texture. You can also report this in Daily check-in.
          </p>
        </div>
      </div>

      {result.drynessRegions.length > 0 && (
        <p className="text-xs text-slate-400">
          {result.drynessRegions.length} area(s) with possible dryness/flaking
          detected.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/?openCheckin=1&suggestedFlaking=${result.suggestedFlakingSeverity}`}
          className="btn-primary px-4 py-2 text-sm"
        >
          Use in daily check-in
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="btn-secondary px-4 py-2 text-sm"
        >
          New photo
        </button>
      </div>
    </div>
  );
}
