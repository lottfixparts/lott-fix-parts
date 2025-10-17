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

const GAS_WEBAPP_URL = import.meta.env.VITE_GAS_WEBAPP_URL || "";

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
  const safeText = (v: any) => (v === null || v === undefined ? "—" : typeof v === "string" ? v : String(v));

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
    } catch {
      return [];
    }
  });

  const [branch, setBranch] = useState("Núñez");
  const [client, setClient] = useState({ name: "", dni: "", phone: "", email: "" });
  const [device, setDevice] = useState({ type: "Celular", brand: "", model: "", sn: "", pass: "" });
  const [fail, setFail] = useState("");
  const [stateIn, setStateIn] = useState("");
  const [budget, setBudget] = useState("");
  const [tech, setTech] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const orderNumber = useMemo(() => {
    const key = "lfp_order_seq";
    let n = Number(localStorage.getItem(key) || "99");
    n += 1;
    localStorage.setItem(key, String(n));
    return `ORD-${String(n).padStart(4, "0")}`;
  }, []);

  const now = useMemo(() => new Date(), []);
  const fecha = useMemo(() => new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric" }).format(now), [now]);
  const hora = useMemo(() => new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hour12: false }).format(now), [now]);

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

  useEffect(() => {
    if (logo) {
      const link = document.querySelector("link[rel='icon']") || document.createElement("link");
      link.rel = "icon";
      link.href = logo;
      document.head.appendChild(link);
    }
  }, [logo]);

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

  async function generatePDF(): Promise<{ fileName: string; dataUrl: string }> {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const width = doc.internal.pageSize.getWidth();
    const usable = width - margin * 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`ORDEN DE TRABAJO – N° ${orderNumber}`, margin + 16, margin + 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Fecha: ${fecha}   |   Hora: ${hora}`, margin + 16, margin + 46);

    if (logo) {
      try {
        doc.addImage(logo, "PNG", margin + usable - 200, margin + 6, 160, 56);
      } catch {}
    }

    let y = margin + 100;
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL CLIENTE / EQUIPO", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: ${client.name || "—"}`, margin, y);
    y += 16;
    doc.text(`DNI: ${client.dni || "—"}`, margin, y);
    y += 16;
    doc.text(`Teléfono: ${client.phone || "—"}`, margin, y);
    y += 16;
    doc.text(`Email: ${client.email || "—"}`, margin, y);
    y += 16;
    doc.text(`Equipo: ${device.type} ${device.brand} ${device.model}`, margin, y);
    y += 16;
    doc.text(`N° Serie / IMEI: ${device.sn || "—"}`, margin, y);
    y += 16;
    doc.text(`Clave / PIN: ${device.pass || "—"}`, margin, y);
    y += 20;

    doc.setFont("helvetica", "bold");
    doc.text("DESCRIPCIÓN DE LA FALLA", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(fail || "—", usable), margin, y);
    y += 40;

    doc.setFont("helvetica", "bold");
    doc.text("ESTADO AL INGRESAR", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(stateIn || "—", usable), margin, y);
    y += 40;

    doc.setFont("helvetica", "bold");
    doc.text("PRESUPUESTO ESTIMADO", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(`$ ${budget || "0"}`, margin, y);
    y += 40;

    doc.setFont("helvetica", "bold");
    doc.text("RECEPCIÓN", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(`Sucursal: ${branch}`, margin, y);
    y += 16;
    doc.text(`Técnico: ${tech || "—"}`, margin, y);
    y += 20;

    if (photo) {
      try {
        doc.addImage(photo, "JPEG", margin, y, 200, 150);
        y += 170;
      } catch {}
    }

    doc.setFontSize(10);
    doc.text("Lott Fix & Parts • 11-2602-1568 • www.lott.com.ar • lucasrongo@gmail.com", margin, y + 30);

    const dataUrl = doc.output("datauristring");
    const fileName = `${orderNumber}.pdf`;
    return { fileName, dataUrl };
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
    } catch {}

    try {
      const entry = {
        orderNumber,
        fecha,
        hora,
        cliente: client.name,
        equipo: `${device.type} ${device.brand} ${device.model}`.trim(),
        sucursal: branch
      };
      const h = [entry, ...history];
      setHistory(h);
      localStorage.setItem("lfp_history", JSON.stringify(h));
    } catch {}

    setDone(true);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen w-full bg-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Orden de Trabajo</h1>
            <p className="text-sm mt-1">
              N° <strong>{orderNumber}</strong> • Fecha {fecha} • Hora {hora}
            </p>
          </div>
          <div>
            {logo ? (
              <img src={logo} alt="Logo" className="h-20 object-contain" />
            ) : (
              <label className="cursor-pointer text-sm border px-3 py-2 rounded flex items-center gap-2">
                <Upload size={16} />
                Cargar logo
                <input type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
              </label>
            )}
          </div>
        </div>

        <Card>
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Sucursal *</Label>
                <RadioGroup defaultValue="Núñez" onValueChange={setBranch}>
                  <div className="flex gap-4 mt-2">
                    <label className="flex gap-2 items-center">
                      <RadioGroupItem value="Núñez" />
                      Núñez
                    </label>
                    <label className="flex gap-2 items-center">
                      <RadioGroupItem value="Vicente López" />
                      Vicente López
                    </label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Técnico que recibe *</Label>
                <Input value={tech} onChange={(e) => setTech(e.target.value)} required />
              </div>

              <div>
                <Label>Nombre y Apellido *</Label>
                <Input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} required />
              </div>

              <div>
                <Label>DNI *</Label>
                <Input value={client.dni} onChange={(e) => setClient({ ...client, dni: e.target.value })} required />
              </div>

              <div>
                <Label>Teléfono</Label>
                <Input value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
              </div>

              <div>
                <Label>Email *</Label>
                <Input type="email" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} required />
              </div>

              <div>
                <Label>Tipo de equipo *</Label>
                <Select value={device.type} onValueChange={(v) => setDevice({ ...device, type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Celular">Celular</SelectItem>
                    <SelectItem value="Tablet">Tablet</SelectItem>
                    <SelectItem value="Notebook">Notebook</SelectItem>
                    <SelectItem value="PC">PC</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
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
                <Label>Descripción de la falla *</Label>
                <Textarea rows={3} value={fail} onChange={(e) => setFail(e.target.value)} required />
              </div>

              <div className="md:col-span-2">
                <Label>Estado del equipo al ingresar *</Label>
                <Textarea rows={3} value={stateIn} onChange={(e) => setStateIn(e.target.value)} required />
              </div>

              <div>
                <Label>Presupuesto estimado ($)</Label>
                <Input value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>

              <div>
                <Label>Foto del equipo (opcional)</Label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer flex items-center gap-2 border px-3 py-2 rounded">
                    <ImageIcon size={16} /> Subir imagen
                    <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
                  </label>
                  {photo && <span className="text-green-600 text-xs flex items-center gap-1"><CheckCircle2 size={14} /> Imagen cargada</span>}
                </div>
              </div>

              <div className="md:col-span-2 flex justify-between items-center pt-4">
                <a href="https://wa.me/5491126021568" target="_blank" rel="noreferrer" className="text-sm underline flex items-center gap-2">
                  <Phone size={16} /> WhatsApp soporte
                </a>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Generando PDF..." : "Generar Orden (PDF)"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {done && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-4 bg-green-100 border border-green-300 rounded">
            ✅ Orden generada y enviada correctamente
          </motion.div>
        )}

        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2">Historial de órdenes</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500">Todavía no hay órdenes registradas.</p>
          ) : (
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2 border">N°</th>
                  <th className="p-2 border">Fecha</th>
                  <th className="p-2 border">Hora</th>
                  <th className="p-2 border">Cliente</th>
                  <th className="p-2 border">Equipo</th>
                  <th className="p-2 border">Sucursal</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td className="p-2 border">{h.orderNumber}</td>
                    <td className="p-2 border">{h.fecha}</td>
                    <td className="p-2 border">{h.hora}</td>
                    <td className="p-2 border">{h.cliente}</td>
                    <td className="p-2 border">{h.equipo}</td>
                    <td className="p-2 border">{h.sucursal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
