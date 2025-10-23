import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import jsPDF from "jspdf";
import { GAS_WEBAPP_URL } from "./config";

const BUSINESS = {
  name: "Lott Fix & Parts",
  phone: "11-2602-1568 (WhatsApp)",
  email: "lucasrongo@gmail.com",
  website: "www.lott.com.ar",
  locations: ["Núñez", "Vicente López"] as const,
};

type Location = (typeof BUSINESS.locations)[number];

export default function OrdenDeTrabajo() {
  const [branch, setBranch] = useState<Location | "">("");
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

  async function generatePDF(): Promise<{ fileName: string; dataUrl: string }> {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    const usable = pageW - margin * 2;

    doc.setFillColor(249, 249, 249);
    doc.rect(0, 0, pageW, pageH, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`ORDEN DE TRABAJO – N° ${orderNumber}`, margin, margin + 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Fecha: ${fecha}   |   Hora: ${hora}`, margin, margin + 40);

    try {
      const response = await fetch("/Standard.jpg");
      const blob = await response.blob();
      const reader = new FileReader();
      const logoDataUrl: string = await new Promise((resolve) => {
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
      doc.addImage(logoDataUrl, "JPEG", pageW - 200, margin, 140, 50);
    } catch (e) {
      console.warn("No se pudo incluir el logo en el PDF:", e);
    }

    let y = margin + 90;
    const section = (title: string) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50);
      doc.text(title, margin, y);
      y += 10;
      doc.setDrawColor(80);
      doc.line(margin, y, pageW - margin, y);
      y += 14;
    };

    section("DATOS DEL CLIENTE / EQUIPO");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    doc.text(`Cliente: ${client.name || "—"}`, margin, y); y += 16;
    doc.text(`DNI: ${client.dni || "—"}`, margin, y); y += 16;
    doc.text(`Teléfono: ${client.phone || "—"}`, margin, y); y += 16;
    doc.text(`Email: ${client.email || "—"}`, margin, y); y += 16;
    doc.text(`Sucursal: ${branch || "—"}`, margin, y); y += 16;
    doc.text(`Equipo: ${device.type} ${device.brand} ${device.model}`, margin, y); y += 16;

    section("DESCRIPCIÓN DE LA FALLA");
    const desc = doc.splitTextToSize(fail || "—", usable);
    doc.text(desc, margin, y);
    y += desc.length * 14 + 10;

    section("ESTADO DEL EQUIPO AL INGRESAR");
    const est = doc.splitTextToSize(stateIn || "—", usable);
    doc.text(est, margin, y);
    y += est.length * 14 + 10;

    section("PRESUPUESTO ESTIMADO");
    doc.text(`$ ${budget || "0"}`, margin, y);
    y += 20;

    section("RECEPCIÓN");
    doc.text(`Equipo recibido en: ${branch || "—"}`, margin, y); y += 16;
    doc.text(`Técnico que recibe: ${tech || "—"}`, margin, y);

    const footerY = pageH - 40;
    doc.setFontSize(10);
    doc.setTextColor(120);
    const footerText = "Tel: 11-2602-1568 (WhatsApp)   ·   Web: www.lott.com.ar   ·   Email: lucasrongo@gmail.com";
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageW - footerWidth) / 2, footerY);

    const dataUrl = doc.output("datauristring");
    doc.save(`${orderNumber}.pdf`);
    return { fileName: `${orderNumber}.pdf`, dataUrl };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!branch) {
      alert("Seleccioná la sucursal de recepción (obligatoria)");
      return;
    }

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
            orderNumber, fecha, hora, branch,
            client, device, fail, stateIn, budget, tech,
            pdfDataUrl: pdf.dataUrl, fileName: pdf.fileName,
          }),
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
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex flex-col items-center justify-center py-3">
          <h1 className="text-2xl font-semibold mb-2">Orden de trabajo</h1>
          <div className="flex justify-center gap-4">
            {["orden", "historial"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as "orden" | "historial")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {tab === "orden" ? "Orden" : "Historial"}
              </button>
            ))}
          </div>
        </div>
        <img src="/Standard.jpg" alt="Lott Fix & Parts" className="absolute right-6 top-3 h-12 object-contain" />
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {activeTab === "orden" ? (
          // Formulario
          <Card className="rounded-2xl shadow-md border-gray-200 bg-white">
            <CardContent className="p-6 space-y-8">
              <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sucursal */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Equipo recibido en *</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                    {BUSINESS.locations.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setBranch(loc)}
                        className={`p-6 rounded-xl border-2 text-lg font-semibold transition-all ${
                          branch === loc
                            ? "border-gray-800 bg-gray-100 shadow-md"
                            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                  {!branch && <p className="text-sm text-red-500 mt-1">Seleccioná una sucursal</p>}
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

                <div className="md:col-span-2 flex justify-end">
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
        ) : (
          // Historial
          <div className="bg-white rounded-2xl shadow-md border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Historial de órdenes</h2>
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
              <p className="text-sm text-gray-500">Todavía no hay órdenes registradas.</p>
            )}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-gray-500 py-6">
        {BUSINESS.name} • {BUSINESS.phone} • {BUSINESS.website} • {BUSINESS.email}
      </footer>
    </div>
  );
}
