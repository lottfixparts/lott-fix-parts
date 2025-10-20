//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LOTT FIX & PARTS - ORDEN DE TRABAJO (FINAL BUILD OK)
// Compatible con Vite + TypeScript + Tailwind
//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { CheckCircle2, Image as ImageIcon, Upload } from "lucide-react";
import jsPDF from "jspdf";
import { GAS_WEBAPP_URL, DEFAULT_LOGO } from "./config";

//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIGURACIÓN DEL NEGOCIO
//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const BUSINESS = {
  name: "Lott Fix & Parts",
  phone: "11-2602-1568",
  email: "lucasrongo@gmail.com",
  website: "www.lott.com.ar",
  locations: ["Núñez", "Vicente López"],
};

//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENTE PRINCIPAL
//━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function OrdenDeTrabajo() {
  //───────────────────────────── ESTADOS ────────────────────────────────
  const [branch, setBranch] = useState(BUSINESS.locations[0]);
  const [client, setClient] = useState({ name: "", dni: "", phone: "", email: "" });
  const [device, setDevice] = useState({ type: "Celular", brand: "", model: "", sn: "", pass: "" });
  const [fail, setFail] = useState("");
  const [stateIn, setStateIn] = useState("");
  const [budget, setBudget] = useState("");
  const [tech, setTech] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(DEFAULT_LOGO);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [activeTab, setActiveTab] = useState<"orden" | "historial">("orden");
  const [history, setHistory] = useState<Array<{ orderNumber: string; fecha: string; hora: string; cliente: string; equipo: string; sucursal: string }>>([]);

  //───────────────────────────── FECHA Y ORDEN ────────────────────────────────
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

  //───────────────────────────── HANDLERS DE IMÁGENES ────────────────────────────────
  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  //───────────────────────────── PDF GENERACIÓN ────────────────────────────────
  async function generatePDF(): Promise<{ fileName: string; dataUrl: string }> {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const width = doc.internal.pageSize.getWidth();
    const usable = width - margin * 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`ORDEN DE TRABAJO – N° ${orderNumber}`, margin, margin + 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Fecha: ${fecha}   |   Hora: ${hora}`, margin, margin + 40);

    if (logo) {
      try {
        doc.addImage(logo, "PNG", margin + usable - 200, margin, 160, 56);
      } catch {}
    }

    let y = margin + 90;
    const text = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(value || "—", margin + 120, y);
      y += 16;
    };

    text("Cliente:", client.name);
    text("DNI:", client.dni);
    text("Teléfono:", client.phone);
    text("Email:", client.email);
    text("Sucursal:", branch);
    text("Tipo de equipo:", device.type);
    text("Marca:", device.brand);
    text("Modelo:", device.model);
    text("N° Serie / IMEI:", device.sn);
    text("Clave / PIN:", device.pass);

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Descripción de la falla:", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(fail || "—", margin, y, { maxWidth: usable });
    y += 40;

    doc.setFont("helvetica", "bold");
    doc.text("Estado del equipo al ingresar:", margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.text(stateIn || "—", margin, y, { maxWidth: usable });
    y += 40;

    doc.setFont("helvetica", "bold");
    doc.text("Presupuesto estimado:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(`$ ${budget || "0"}`, margin + 160, y);
    y += 30;

    if (photo) {
      try {
        doc.addImage(photo, "JPEG", margin, y, 200, 150);
        y += 170;
      } catch {}
    }

    doc.line(margin, 780, margin + usable, 780);
    doc.setFontSize(9);
    doc.text(`${BUSINESS.name} | Tel: ${BUSINESS.phone} | ${BUSINESS.website} | ${BUSINESS.email}`, margin, 795);

    const dataUrl = doc.output("datauristring");
    doc.save(`${orderNumber}.pdf`);
    return { fileName: `${orderNumber}.pdf`, dataUrl };
  }

  //───────────────────────────── ENVÍO DEL FORMULARIO ────────────────────────────────
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
        const payload = {
          orderNumber, fecha, hora, branch,
          client, device, fail, stateIn, budget, tech,
          pdfDataUrl: pdf.dataUrl,
          fileName: pdf.fileName,
        };
        await fetch(GAS_WEBAPP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
    } catch (err) {
      console.error("Error enviando a GAS:", err);
    }

    const item = {
      orderNumber, fecha, hora,
      cliente: client.name,
      equipo: `${device.type} ${device.brand} ${device.model}`.trim(),
      sucursal: branch,
    };
    const arrRaw = localStorage.getItem("lfp_history");
    const arr = arrRaw ? JSON.parse(arrRaw) : [];
    arr.unshift(item);
    localStorage.setItem("lfp_history", JSON.stringify(arr));
    setHistory(arr);

    setSubmitting(false);
    setDone(true);
  }

  //───────────────────────────── RENDER ────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-gray-50 text-gray-900">
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">{BUSINESS.name}</h1>
            <p className="text-xs text-gray-500">Gestión de órdenes de trabajo</p>
          </div>
          {logo && <img src={logo} alt="Logo" className="h-12 md:h-16 object-contain" />}
        </div>

        <nav className="border-t flex justify-center gap-8 text-sm">
          <button
            onClick={() => setActiveTab("orden")}
            className={`py-3 px-4 border-b-2 ${
              activeTab === "orden" ? "border-gray-900 font-semibold" : "border-transparent text-gray-500"
            }`}
          >
            Orden de trabajo
          </button>
          <button
            onClick={() => setActiveTab("historial")}
            className={`py-3 px-4 border-b-2 ${
              activeTab === "historial" ? "border-gray-900 font-semibold" : "border-transparent text-gray-500"
            }`}
          >
            Historial
          </button>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        {activeTab === "orden" && (
          <Card className="rounded-2xl shadow-md border-gray-200">
            <CardContent className="p-8 space-y-6">
              <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Equipo recibido en</Label>
                  <RadioGroup defaultValue={branch} onValueChange={setBranch} className="flex gap-6">
                    {BUSINESS.locations.map((loc) => (
                      <div key={loc} className="flex items-center space-x-2">
                        <RadioGroupItem value={loc} id={loc} />
                        <Label htmlFor={loc}>{loc}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label>Técnico que recibe</Label>
                  <Input value={tech} onChange={(e) => setTech(e.target.value)} placeholder="Ej: Lucas Rongo" />
                </div>

                <div className="space-y-2">
                  <Label>Nombre y Apellido *</Label>
                  <Input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>DNI *</Label>
                  <Input value={client.dni} onChange={(e) => setClient({ ...client, dni: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de equipo</Label>
                  <Select value={device.type} onValueChange={(v) => setDevice({ ...device, type: v })}>
                    <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Celular">Celular</SelectItem>
                      <SelectItem value="Tablet">Tablet</SelectItem>
                      <SelectItem value="Notebook">Notebook</SelectItem>
                      <SelectItem value="PC">PC</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2"><Label>Marca</Label><Input value={device.brand} onChange={(e) => setDevice({ ...device, brand: e.target.value })} /></div>
                <div className="space-y-2"><Label>Modelo</Label><Input value={device.model} onChange={(e) => setDevice({ ...device, model: e.target.value })} /></div>
                <div className="space-y-2"><Label>N° Serie / IMEI</Label><Input value={device.sn} onChange={(e) => setDevice({ ...device, sn: e.target.value })} /></div>
                <div className="space-y-2"><Label>Clave / PIN</Label><Input value={device.pass} onChange={(e) => setDevice({ ...device, pass: e.target.value })} /></div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Descripción de la falla *</Label>
                  <Textarea rows={4} className="leading-relaxed" value={fail} onChange={(e) => setFail(e.target.value)} />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label>Estado del equipo al ingresar *</Label>
                  <Textarea rows={3} className="leading-relaxed" value={stateIn} onChange={(e) => setStateIn(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Presupuesto estimado ($)</Label>
                  <Input value={budget} onChange={(e) => setBudget(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Foto del equipo</Label>
                  <label className="inline-flex items-center gap-2 text-xs border px-3 py-2 rounded-xl cursor-pointer">
                    <ImageIcon className="w-4 h-4" /> Subir imagen
                    <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
                  </label>
                  {photo && (
                    <span className="text-xs text-green-700 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3 h-3" /> Imagen lista
                    </span>
                  )}
                </div>

                <div className="md:col-span-2 flex justify-end pt-6">
                  <Button type="submit" disabled={submitting} className="rounded-2xl px-8 py-2">
                    {submitting ? "Generando PDF…" : "Generar Orden (PDF)"}
                  </Button>
                </div>
              </form>

              {done && (
                <div className="mt-6 p-4 rounded-xl border text-sm bg-green-50 border-green-200 text-green-900">
                  ✅ Orden <b>{orderNumber}</b> generada y registrada.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "historial" && (
          <Card className="rounded-2xl shadow-md border-gray-200">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Historial de órdenes</h2>
              {history.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border">
                    <thead className="bg-gray-100">
                      <tr className="text-left">
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
                        <tr key={`${h.orderNumber}-${i}`}>
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
                </div>
              ) : (
            
                <p className="text-sm text-gray-500">No hay órdenes registradas todavía.</p>
              )}
            </CardContent>
          </Card>
