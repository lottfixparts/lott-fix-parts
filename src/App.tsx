import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Upload, Phone, CheckCircle2, Image as ImageIcon } from "lucide-react";
import jsPDF from "jspdf";

// ▶ Backend URL (Google Apps Script Web App) - secure variable for Vercel
const GAS_WEBAPP_URL = import.meta.env.VITE_GAS_WEBAPP_URL as string;

// Convert SVG logo DataURL -> PNG DataURL
async function svgToPng(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width || 600;
      canvas.height = img.height || 200;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.src = dataUrl;
  });
}

export default function OrdenDeTrabajo() {
  const safeText = (v: any) =>
    v === null || v === undefined ? "—" : typeof v === "string" ? v : String(v);

  // ---- Local history (persist) ----
  const [history, setHistory] = useState<
    Array<{
      orderNumber: string;
      fecha: string;
      hora: string;
      cliente: string;
      equipo: string;
      sucursal: string;
    }>
  >(() => {
    try {
      const raw = localStorage.getItem("lfp_history");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  });

  // ---- Brand palette ----
  const brand = { primary: "#1F2937" }; // dark gray

  // ---- Local state ----
  const [branch, setBranch] = useState("Núñez");
  const [client, setClient] = useState({
    name: "",
    dni: "",
    phone: "",
    email: ""
  });
  const [device, setDevice] = useState({
    type: "Celular",
    brand: "",
    model: "",
    sn: "",
    pass: ""
  });
  const [fail, setFail] = useState("");
  const [stateIn, setStateIn] = useState("");
  const [budget, setBudget] = useState("");
  const [tech, setTech] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // ---- Order number ----
  const orderNumber = useMemo(() => {
    const key = "lfp_order_seq";
    let n = Number(localStorage.getItem(key) || "99");
    n += 1;
    localStorage.setItem(key, String(n));
    return `ORD-${String(n).padStart(4, "0")}`;
  }, []);

  // ---- Date/time ----
  const now = useMemo(() => new Date(), []);
  const fecha = useMemo(
    () =>
      new Intl.DateTimeFormat("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(now),
    [now]
  );
  const hora = useMemo(
    () =>
      new Intl.DateTimeFormat("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(now),
    [now]
  );

  // ---- Auto load logo ----
  useEffect(() => {
    try {
      const saved = localStorage.getItem("lfp_logo");
      if (saved) {
        setLogo(saved);
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 180;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "#111827";
          ctx.font = "bold 64px Helvetica";
          ctx.fillText("Lott Fix & Parts", 24, 110);
          ctx.fillStyle = "#EF4444";
          ctx.fillRect(24, 140, 260, 8);
        }
        const fallback = canvas.toDataURL("image/png");
        localStorage.setItem("lfp_logo", fallback);
        setLogo(fallback);
      }
    } catch {}
  }, []);

  // ---- Dynamic favicon ----
  useEffect(() => {
    if (!logo) return;
    const link: HTMLLinkElement =
      (document.querySelector("link[rel='icon']") as HTMLLinkElement) ||
      document.createElement("link");
    link.rel = "icon";
    link.href = logo;
    document.head.appendChild(link);
  }, [logo]);

  // ---- Handlers ----
  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let result = String(reader.result || "");
      if (file.type === "image/svg+xml" || result.includes("svg+xml")) {
        result = await svgToPng(result);
      }
      setLogo(result);
      try {
        localStorage.setItem("lfp_logo", result);
      } catch {}
    };
    reader.readAsDataURL(file);
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  // ---- PDF generation ----
  async function generatePDF(): Promise<{
    fileName: string;
    dataUrl: string;
  }> {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const width = doc.internal.pageSize.getWidth();
    const usable = width - margin * 2;
    // ---- Section separator in PDF ----
    const section = (title: string) => {
      // draw section header
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20);
      doc.setFontSize(12);
      let y = doc.lastAutoTable?.finalY || 160;
      if (!y) y = 160;
      doc.text(title, margin, y);
      return y;
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!client.email || !client.dni || !fail || !stateIn) {
      alert("Completá Email, DNI, Falla y Estado al ingresar (obligatorios)");
      return;
    }
    setSubmitting(true);

    const pdf = await generatePDF();

    try {
      if (GAS_WEBAPP_URL) {
        await fetch(GAS_WEBAPP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderNumber,
            fecha,
            hora,
            branch,
            client,
            device,
            fail,
            stateIn,
            budget,
            tech,
            pdfDataUrl: pdf.dataUrl,
            fileName: pdf.fileName
          })
        });
      }
    } catch (err) {
      console.error("Error enviando a GAS:", err);
    }

    try {
      const entry = {
        orderNumber,
        fecha,
        hora,
        cliente: client.name,
        equipo: `${device.type} ${device.brand} ${device.model}`.trim(),
        sucursal: branch
      };
      const historyRaw = localStorage.getItem("lfp_history");
      const historyArr = historyRaw ? JSON.parse(historyRaw) : [];
      historyArr.unshift(entry);
      localStorage.setItem("lfp_history", JSON.stringify(historyArr));
      setHistory(historyArr);
    } catch {}

    setDone(true);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Orden de Trabajo</h1>
            <p className="text-sm mt-1">
              N° <strong>{orderNumber}</strong> · Fecha {fecha} · Hora {hora}
            </p>
          </div>
          <div>
            {logo ? (
              <img src={logo} alt="Logo" className="h-20" />
            ) : (
              <label className="cursor-pointer text-sm border px-4 py-2 rounded-lg flex items-center gap-2">
                <Upload size={16} /> Cargar logo
                <input
                  type="file"
                  accept="image/*,.svg"
                  className="hidden"
                  onChange={onLogoChange}
                />
              </label>
            )}
          </div>
        </div>

        {/* Form */}
        <Card className="rounded-lg border shadow">
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Sucursal *</Label>
                <RadioGroup defaultValue="Núñez" onValueChange={setBranch}>
                  <div className="flex gap-3 mt-2">
                    <label className="flex gap-2 items-center">
                      <RadioGroupItem value="Núñez" /> Núñez
                    </label>
                    <label className="flex gap-2 items-center">
                      <RadioGroupItem value="Vicente López" /> Vicente López
                    </label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Técnico *</Label>
                <Input value={tech} onChange={(e) => setTech(e.target.value)} placeholder="Ej: Lucas Rongo" />
              </div>

              <div>
                <Label>Nombre *</Label>
                <Input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
              </div>

              <div>
                <Label>DNI *</Label>
                <Input value={client.dni} onChange={(e) => setClient({ ...client, dni: e.target.value })} />
              </div>

              <div>
                <Label>Teléfono</Label>
                <Input value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
              </div>

              <div>
                <Label>Email *</Label>
                <Input value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />
              </div>

              <div>
                <Label>Tipo *</Label>
                <Select value={device.type} onValueChange={(v) => setDevice({ ...device, type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Celular">Celular</SelectItem>
                    <SelectItem value="Tablet">Tablet</SelectItem>
                    <SelectItem value="Notebook">Notebook</SelectItem>
                    <SelectItem value="PC">PC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Marca</Label>
                <Input value={device.brand} onChange={(e) => setDevice({ ...device, brand: e.target.value })} />
              </div>

              <div>
                <Label>Modelo</Label>
                <Input value={device.model} onChange={(e) => setDevice({ ...device, model: e.target.value })} />
              </div>

              <div>
                <Label>N° Serie / IMEI</Label>
                <Input value={device.sn} onChange={(e) => setDevice({ ...device, sn: e.target.value })} />
              </div>

              <div>
                <Label>Clave / PIN</Label>
                <Input value={device.pass} onChange={(e) => setDevice({ ...device, pass: e.target.value })} />
              </div>

              <div className="md:col-span-2">
                <Label>Falla *</Label>
                <Textarea rows={3} value={fail} onChange={(e) => setFail(e.target.value)} />
              </div>

              <div className="md:col-span-2">
                <Label>Estado al ingresar *</Label>
                <Textarea rows={3} value={stateIn} onChange={(e) => setStateIn(e.target.value)} />
              </div>

              <div>
                <Label>Presupuesto ($)</Label>
                <Input value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>

              <div>
                <Label>Foto del equipo</Label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer flex items-center gap-2 border px-3 py-2 rounded">
                    <ImageIcon size={14} /> Subir
                    <input type="file" className="hidden" accept="image/*" onChange={onPhotoChange} />
                  </label>
                  {photo && <span className="text-green-600 text-xs">✅ Imagen ok</span>}
                </div>
              </div>

              <div className="md:col-span-2 flex justify-between">
                <a href="https://wa.me/5491126021568" target="_blank" className="text-sm underline flex items-center gap-1">
                  <Phone size={14} /> WhatsApp soporte
                </a>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Generando orden…" : "Generar Orden (PDF)"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Resultado */}
        {done && (
          <motion.div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
            ✅ Orden generada y enviada correctamente
          </motion.div>
        )}
      </div>
    </div>
  );
}
