import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import jsPDF from "jspdf";
import { GAS_WEBAPP_URL } from "./config";

// ─────────────────────────────────────────────────────────────────────────────
// Lott Fix & Parts – Orden de Trabajo (FINAL)
// - Logo desde /public/Standard.jpg (app y PDF)
// - PDF con fondo gris claro y pie centrado gris sutil
// - Sucursal: radio (una sola opción)
// - Sin "variant" en Button (compila en Vercel)
// ─────────────────────────────────────────────────────────────────────────────

const BUSINESS = {
  name: "Lott Fix & Parts",
  phone: "11-2602-1568",
  email: "lucasrongo@gmail.com",
  website: "www.lott.com.ar",
  locations: ["Núñez", "Vicente López"] as const,
};

type Location = (typeof BUSINESS.locations)[number];

export default function OrdenDeTrabajo() {
  // Estado general
  const [branch, setBranch] = useState<Location>("Núñez");
  const [client, setClient] = useState({ name: "", dni: "", phone: "", email: "" });
  const [device, setDevice] = useState({ type: "Celular", brand: "", model: "", sn: "", pass: "" });
  const [fail, setFail] = useState("");
  const [stateIn, setStateIn] = useState("");
  const [budget, setBudget] = useState("");
  const [tech, setTech] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [activeTab, setActiveTab] = useState<"orden" | "historial">("orden");
  const [history, setHistory] = useState<
    Array<{ orderNumber: string; fecha: string; hora: string; cliente: string; equipo: string; sucursal: string }>
  >(() => {
    try {
      const raw = localStorage.getItem("lfp_history");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Número de orden y fecha/hora (AR)
  const orderNumber = useMemo(() => {
    const key = "lfp_order_seq";
    let n = Number(localStorage.getItem(key) || "99");
    n += 1;
    localStorage.setItem(key, String(n));
    return `ORD-${String(n).padStart(4, "0")}`;
  }, []);

  const now = useMemo(() => new Date(), []);
  const fecha = useMemo(
    () =>
      new Intl.DateTimeFormat("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(now),
    [now]
  );
  const hora = useMemo(
    () =>
      new Intl.DateTimeFormat("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now),
    [now]
  );

  // PDF (logo real desde /public/Standard.jpg)
  async function generatePDF(): Promise<{ fileName: string; dataUrl: string }> {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    const usable = pageW - margin * 2;

    // Fondo gris claro
    doc.setFillColor(249, 249, 249);
    doc.rect(0, 0, pageW, pageH, "F");

    // Encabezado
    doc.setLineWidth(1);
    doc.setDrawColor(80);
    doc.roundedRect(margin, margin, usable, 70, 6, 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`ORDEN DE TRABAJO – N° ${orderNumber}`, margin + 16, margin + 26);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Fecha: ${fecha}   |   Hora: ${hora}`, margin + 16, margin + 46);

    // Logo (carga desde /public/Standard.jpg → base64 → addImage)
    try {
      const response = await fetch("/Standard.jpg");
      const blob = await response.blob();
      const reader = new FileReader();
      const logoDataUrl: string = await new Promise((resolve) => {
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
      // Usamos JPEG para Standard.jpg
      doc.addImage(logoDataUrl, "JPEG", margin + usable - 200, margin + 6, 160, 56);
    } catch (e) {
      // No rompemos el PDF si el logo falla
      // eslint-disable-next-line no-console
      console.warn("No se pudo incluir el logo en el PDF:", e);
    }

    // Secciones
    let y = margin + 100;
    const colGap = 24;
    const colW = (usable - colGap) / 2;
    function section(title: string) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50);
      doc.setFontSize(12);
      doc.text(title, margin, y);
      y += 6;
      doc.setDrawColor(60);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + usable, y);
      y += 14;
    }

    // Datos cliente/equipo (2 columnas)
    section("DATOS DEL CLIENTE / EQUIPO");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const leftX = margin;
    const rightX = margin + colW + colGap;
    let yLeft = y;
    let yRight = y;

    const put = (label: string, val: string | undefined, x: number, yv: number) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, x, yv);
      doc.setFont("helvetica", "normal");
      doc.text(val && val.trim() ? val : "—", x + 120, yv);
    };

    put("Cliente:", client.name, leftX, yLeft); yLeft += 18;
    put("DNI:", client.dni, leftX, yLeft); yLeft += 18;
    put("Teléfono:", client.phone, leftX, yLeft); yLeft += 18;
    put("Email:", client.email, leftX, yLeft); yLeft += 18;

    put("Sucursal:", branch, rightX, yRight); yRight += 18;
    put("Tipo de equipo:", device.type, rightX, yRight); yRight += 18;
    put("Marca:", device.brand, rightX, yRight); yRight += 18;
    put("Modelo:", device.model, rightX, yRight); yRight += 18;
    put("N° Serie / IMEI:", device.sn, rightX, yRight); yRight += 18;
    put("Clave / PIN:", device.pass, rightX, yRight); yRight += 18;

    y = Math.max(yLeft, yRight) + 10;

    // Falla
    section("DESCRIPCIÓN DE LA FALLA");
    const desc = doc.splitTextToSize(fail || "—", usable);
    doc.text(desc, margin, y);
    y += Math.max(40, desc.length * 14);

    // Estado al ingresar
    section("ESTADO DEL EQUIPO AL INGRESAR");
    const est = doc.splitTextToSize(stateIn || "—", usable);
    doc.text(est, margin, y);
    y += Math.max(36, est.length * 14);

    // Presupuesto
    section("PRESUPUESTO ESTIMADO");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20);
    doc.setFontSize(14);
    doc.text(`$ ${budget || "0"}`, margin, y);
    y += 28;

    // Recepción
    section("RECEPCIÓN");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40);
    doc.setFontSize(11);
    doc.text(`Equipo recibido en: ${branch}`, margin, y); y += 18;
    doc.text(`Técnico que recibe: ${tech || "—"}`, margin, y); y += 22;

    // Pie centrado (gris sutil)
    const footerY = pageH - 40;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    const footerText = "📞 11-2602-1568 (WhatsApp)    🌐 www.lott.com.ar    ✉️ lucasrongo@gmail.com";
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageW - footerWidth) / 2, footerY);

    // Export
    const dataUrl = doc.output("datauristring");
    doc.save(`${orderNumber}.pdf`);
    return { fileName: `${orderNumber}.pdf`, dataUrl };
  }

  // Submit
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!client.email || !client.dni || !fail || !stateIn) {
      alert("Completá Email, DNI, Falla y Estado al ingresar (obligatorios)");
      return;
    }
    setSubmitting(true);

    const pdf = await generatePDF();

    // Enviar a GAS (si está configurado)
    try {
      if (GAS_WEBAPP_URL) {
        await fetch(GAS_WEBAPP_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderNumber, fecha, hora, branch,
            client, device, fail, stateIn, budget, tech,
            pdfDataUrl: pdf.dataUrl, fileName: pdf.fileName,
          }),
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error enviando a GAS:", err);
    }

    // Guardar en historial local
    const item = {
      orderNumber, fecha, hora,
      cliente: client.name,
      equipo: `${device.type} ${device.brand} ${device.model}`.trim(),
      sucursal: branch,
    };
    try {
      const key = "lfp_history";
      const arrRaw = localStorage.getItem(key);
      const arr = arrRaw ? JSON.parse(arrRaw) : [];
      arr.unshift(item);
      localStorage.setItem(key, JSON.stringify(arr));
      setHistory(arr);
    } catch {}

    setSubmitting(false);
    setDone(true);
  }

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#f3f4f6", color: "#1F2937" }}>
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold">Orden de trabajo</h1>
            <p className="text-xs text-gray-500">Gestión de órdenes de servicio</p>
          </div>
          {/* Logo de /public */}
          <img src="/Standard.jpg" alt="Lott Fix & Parts" className="h-16 md:h-20 object-contain" />
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
          <Card className="rounded-2xl shadow-md border-gray-200 bg-white">
            <CardContent className="p-8 space-y-8">
              <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Radio: UNA SOLA SUCURSAL */}
                <div className="space-y-2">
                  <Label>Equipo recibido en</Label>
                  <RadioGroup value={branch} onValueChange={(v) => setBranch(v as Location)} className="flex gap-6">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Núñez" id="n" />
                      <Label htmlFor="n">Núñez</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Vicente López" id="v" />
                      <Label htmlFor="v">Vicente López</Label>
                    </div>
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

                <div className="md:col-span-2 flex justify-end pt-2">
                  <Button type="submit" disabled={submitting} className="rounded-2xl px-8 py-2">
                    {submitting ? "Generando PDF…" : "Generar Orden (PDF)"}
                  </Button>
                </div>
              </form>

              {done && (
                <div className="mt-4 p-4 rounded-xl border text-sm bg-green-50 border-green-200 text-green-900">
                  ✅ Orden <b>{orderNumber}</b> generada y registrada.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "historial" && (
          <Card className="rounded-2xl shadow-md border-gray-200 bg-white">
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
        )}
      </main>

      <footer className="text-center text-xs text-gray-500 py-6">
        {BUSINESS.name} • Tel: {BUSINESS.phone} • {BUSINESS.website} • {BUSINESS.email}
      </footer>
    </div>
  );
}
