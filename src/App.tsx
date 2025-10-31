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
  phone: "11-2602-1568",
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
  const fecha = useMemo(() => now.toLocaleDateString("es-AR"), [now]);
  const hora = useMemo(() => now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }), [now]);

  async function generatePDF(): Promise<{ fileName: string; dataUrl: string }> {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    const usable = pageW - margin * 2;

    try {
      const response = await fetch("/Standard.jpg");
      const blob = await response.blob();
      const reader = new FileReader();
      const logoDataUrl: string = await new Promise((resolve) => {
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
      doc.addImage(logoDataUrl, "JPEG", pageW - 200, margin, 140, 50);
    } catch {}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`ORDEN DE TRABAJO – N° ${orderNumber}`, margin, margin + 20);

    doc.setFontSize(11);
    doc.text(`Fecha: ${fecha}  |  Hora: ${hora}`, margin, margin + 40);

    let y = margin + 90;

    const section = (t: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(t, margin, y);
      y += 12;
      doc.setDrawColor(100);
      doc.line(margin, y, pageW - margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
    };

    section("CLIENTE");
    doc.text(`Nombre: ${client.name}`, margin, y); y += 16;
    doc.text(`DNI: ${client.dni}`, margin, y); y += 16;
    doc.text(`Teléfono: ${client.phone || "-"}`, margin, y); y += 16;
    doc.text(`Email: ${client.email}`, margin, y); y += 16;

    section("EQUIPO");
    doc.text(`Sucursal: ${branch}`, margin, y); y += 16;
    doc.text(`Equipo: ${device.type} ${device.brand} ${device.model}`, margin, y); y += 16;
    doc.text(`Serie/IMEI: ${device.sn || "-"}`, margin, y); y += 16;
    doc.text(`Clave/PIN: ${device.pass || "-"}`, margin, y); y += 16;

    section("FALLA");
    const descFail = doc.splitTextToSize(fail || "-", usable);
    doc.text(descFail, margin, y);
    y += descFail.length * 14 + 10;

    section("ESTADO AL INGRESAR");
    const descState = doc.splitTextToSize(stateIn || "-", usable);
    doc.text(descState, margin, y);
    y += descState.length * 14 + 10;

    section("PRESUPUESTO");
    doc.text(`$ ${budget || "0"}`, margin, y);
    y += 40;

    const footerY = pageH - 35;
    const footer = `Tel: 11-2602-1568 (WhatsApp)   ·   Web: www.lott.com.ar   ·   Email: lucasrongo@gmail.com`;
    const tw = doc.getTextWidth(footer);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(footer, (pageW - tw) / 2, footerY);

    const dataUrl = doc.output("datauristring");
    return { fileName: `${orderNumber}.pdf`, dataUrl };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!branch) return alert("Elegí sucursal");
    if (!client.email || !client.dni || !fail || !stateIn) return alert("Campos obligatorios faltantes");

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
      equipo: `${device.type} ${device.brand} ${device.model}`,
      sucursal: branch,
    };

    const arr = [item, ...history];
    localStorage.setItem("lfp_history", JSON.stringify(arr));
    setHistory(arr);

    setSubmitting(false);
    setDone(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
          <h1 className="text-xl font-semibold">Orden de Trabajo</h1>
          <img src="/Standard.jpg" className="h-14" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <Card className="shadow-md border bg-white">
          <CardContent className="space-y-6 p-6">
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="col-span-2">
                <Label>Equipo recibido en *</Label>
                <div className="flex gap-3 mt-2">
                  {BUSINESS.locations.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setBranch(loc)}
                      className={`px-4 py-2 rounded-xl text-sm border-2 ${
                        branch === loc ? "bg-gray-900 text-white" : "bg-gray-100"
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2 space-y-1">
                <Label>Nombre *</Label>
                <Input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
              </div>

              <div className="space-y-1">
                <Label>DNI *</Label>
                <Input value={client.dni} onChange={(e) => setClient({ ...client, dni: e.target.value })} />
              </div>

              <div className="space-y-1">
                <Label>Email *</Label>
                <Input value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />
              </div>

              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
              </div>

              <div className="space-y-1">
                <Label>Técnico</Label>
                <Input value={tech} onChange={(e) => setTech(e.target.value)} placeholder="Lucas" />
              </div>

              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={device.type} onValueChange={(v) => setDevice({ ...device, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Celular">Celular</SelectItem>
                    <SelectItem value="Tablet">Tablet</SelectItem>
                    <SelectItem value="Notebook">Notebook</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1"><Label>Marca</Label><Input value={device.brand} onChange={(e) => setDevice({ ...device, brand: e.target.value })} /></div>
              <div className="space-y-1"><Label>Modelo</Label><Input value={device.model} onChange={(e) => setDevice({ ...device, model: e.target.value })} /></div>
              <div className="space-y-1"><Label>IMEI</Label><Input value={device.sn} onChange={(e) => setDevice({ ...device, sn: e.target.value })} /></div>
              <div className="space-y-1"><Label>Clave</Label><Input value={device.pass} onChange={(e) => setDevice({ ...device, pass: e.target.value })} /></div>

              <div className="col-span-2 space-y-1">
                <Label>Falla *</Label>
                <Textarea value={fail} rows={2} onChange={(e) => setFail(e.target.value)} />
              </div>

              <div className="col-span-2 space-y-1">
                <Label>Estado *</Label>
                <Textarea value={stateIn} rows={2} onChange={(e) => setStateIn(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Presupuesto ($)</Label>
                <Input value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>

              <div className="col-span-2 flex justify-end">
                <Button disabled={submitting} type="submit">
                  {submitting ? "Enviando…" : "Generar Orden (PDF)"}
                </Button>
              </div>
            </form>

            {done && (
              <div className="bg-green-100 p-3 rounded text-green-800 text-sm">
                ✅ Orden generada y registrada correctamente
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
