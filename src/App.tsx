import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import jsPDF from "jspdf";

/**
 * Lott Fix & Parts - Orden de Trabajo
 * Versión final con logo embebido, PDF gris claro y pie centrado gris sutil
 */

// URL backend (Google Apps Script)
const GAS_WEBAPP_URL = import.meta.env.VITE_GAS_WEBAPP_URL as string;

// Logo embebido (base64 transparente)
const LOGO_BASE64 = <img src="/Standard.jpg" alt="Lott Fix & Parts" className="h-20 object-contain ml-auto" /> ;

export default function OrdenDeTrabajo() {
  const [branch, setBranch] = useState("Núñez");
  const [client, setClient] = useState({ name: "", dni: "", phone: "", email: "" });
  const [device, setDevice] = useState({ type: "Celular", brand: "", model: "", sn: "", pass: "" });
  const [fail, setFail] = useState("");
  const [stateIn, setStateIn] = useState("");
  const [budget, setBudget] = useState("");
  const [tech, setTech] = useState("");
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
  const fecha = useMemo(() => new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(now), [now]);
  const hora = useMemo(() => new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now), [now]);

  async function generatePDF(): try {
  const logoImg = await fetch("/Standard.jpg")
    .then((r) => r.blob())
    .then(
      (b) =>
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(b);
        })
    );
  doc.addImage(logoImg, "JPEG", margin + usable - 200, margin + 6, 160, 56);
} catch (e) {
  console.warn("⚠️ No se pudo agregar el logo al PDF:", e);
}


    // Fondo gris claro
    doc.setFillColor(249, 249, 249);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");

    // Encabezado
    doc.setLineWidth(1);
    doc.setDrawColor(80);
    doc.roundedRect(margin, margin, usable, 70, 6, 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`ORDEN DE TRABAJO – ${orderNumber}`, margin + 16, margin + 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Fecha: ${fecha} | Hora: ${hora}`, margin + 16, margin + 46);

    try {
      doc.addImage(LOGO_BASE64, "PNG", margin + usable - 200, margin + 6, 160, 56);
    } catch (e) {
      console.warn("Logo PDF error:", e);
    }

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

    // DATOS DEL CLIENTE / EQUIPO
    section("DATOS DEL CLIENTE / EQUIPO");
    const leftX = margin;
    const rightX = margin + colW + colGap;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    let yLeft = y, yRight = y;

    doc.text("Cliente:", leftX, yLeft); doc.text(client.name || "—", leftX + 120, yLeft); yLeft += 18;
    doc.text("DNI:", leftX, yLeft); doc.text(client.dni || "—", leftX + 120, yLeft); yLeft += 18;
    doc.text("Teléfono:", leftX, yLeft); doc.text(client.phone || "—", leftX + 120, yLeft); yLeft += 18;
    doc.text("Email:", leftX, yLeft); doc.text(client.email || "—", leftX + 120, yLeft); yLeft += 18;

    doc.text("Sucursal:", rightX, yRight); doc.text(branch, rightX + 120, yRight); yRight += 18;
    doc.text("Tipo de equipo:", rightX, yRight); doc.text(device.type, rightX + 120, yRight); yRight += 18;
    doc.text("Marca:", rightX, yRight); doc.text(device.brand || "—", rightX + 120, yRight); yRight += 18;
    doc.text("Modelo:", rightX, yRight); doc.text(device.model || "—", rightX + 120, yRight); yRight += 18;
    doc.text("N° Serie / IMEI:", rightX, yRight); doc.text(device.sn || "—", rightX + 120, yRight); yRight += 18;
    doc.text("Clave / PIN:", rightX, yRight); doc.text(device.pass || "—", rightX + 120, yRight); yRight += 18;

    y = Math.max(yLeft, yRight) + 10;

    // DESCRIPCIÓN DE LA FALLA
    section("DESCRIPCIÓN DE LA FALLA");
    const desc = doc.splitTextToSize(fail || "—", usable);
    doc.text(desc, margin, y);
    y += Math.max(40, desc.length * 14);

    // ESTADO AL INGRESAR
    section("ESTADO DEL EQUIPO AL INGRESAR");
    const est = doc.splitTextToSize(stateIn || "—", usable);
    doc.text(est, margin, y);
    y += Math.max(36, est.length * 14);

    // PRESUPUESTO
    section("PRESUPUESTO ESTIMADO");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20);
    doc.setFontSize(14);
    doc.text(`$ ${budget || "0"}`, margin, y);
    y += 28;
    // RECEPCIÓN
    section("RECEPCIÓN");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40);
    doc.setFontSize(11);
    doc.text(`Equipo recibido en: ${branch}`, margin, y); y += 18;
    doc.text(`Técnico que recibe: ${tech || "—"}`, margin, y); y += 22;

    // Pie centrado gris sutil
    const footerY = 820;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    const footerText = "📞 11-2602-1568 (WhatsApp)    🌐 www.lott.com.ar    ✉️ lucasrongo@gmail.com";
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (width - footerWidth) / 2, footerY);

    const dataUrl = doc.output("datauristring");
    doc.save(`${orderNumber}.pdf`);
    return { fileName: `${orderNumber}.pdf`, dataUrl };
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
            orderNumber, fecha, hora, branch,
            client, device, fail, stateIn, budget, tech,
            pdfDataUrl: pdf.dataUrl, fileName: pdf.fileName
          }),
        });
      }
    } catch (err) {
      console.error("Error enviando a GAS:", err);
    }
    setSubmitting(false);
    setDone(true);
  }

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#f9f9f9", color: "#1F2937" }}>
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Orden de trabajo</h1>
            <p className="text-sm mt-1">
              N° <span className="font-semibold">{orderNumber}</span> · Fecha {fecha} · Hora {hora}
            </p>
          </div>
          <img src={LOGO_BASE64} alt="Logo" className="h-20 object-contain" />
        </div>

        {/* Form */}
        <Card className="rounded-2xl shadow-md border-gray-200 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 space-y-6">
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <Label>Equipo recibido en</Label>
                <RadioGroup defaultValue="Núñez" className="flex gap-6" onValueChange={setBranch}>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="Núñez" id="n"/><Label htmlFor="n">Núñez</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="Vicente López" id="v"/><Label htmlFor="v">Vicente López</Label></div>
                </RadioGroup>
              </div>
              <div>
                <Label>Técnico que recibe</Label>
                <Input value={tech} onChange={(e)=>setTech(e.target.value)} placeholder="Ej: Lucas Rongo"/>
              </div>

              <div><Label>Nombre y Apellido *</Label><Input value={client.name} onChange={(e)=>setClient({...client, name:e.target.value})} /></div>
              <div><Label>DNI *</Label><Input value={client.dni} onChange={(e)=>setClient({...client, dni:e.target.value})} /></div>
              <div><Label>Teléfono</Label><Input value={client.phone} onChange={(e)=>setClient({...client, phone:e.target.value})} /></div>
              <div><Label>Email *</Label><Input type="email" value={client.email} onChange={(e)=>setClient({...client, email:e.target.value})} /></div>

              <div>
                <Label>Tipo de equipo</Label>
                <Select value={device.type} onValueChange={(v)=>setDevice({...device, type:v})}>
                  <SelectTrigger><SelectValue placeholder="Tipo"/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Celular">Celular</SelectItem>
                    <SelectItem value="Tablet">Tablet</SelectItem>
                    <SelectItem value="Notebook">Notebook</SelectItem>
                    <SelectItem value="PC">PC</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Marca</Label><Input value={device.brand} onChange={(e)=>setDevice({...device, brand:e.target.value})} /></div>
              <div><Label>Modelo</Label><Input value={device.model} onChange={(e)=>setDevice({...device, model:e.target.value})} /></div>
              <div><Label>N° Serie / IMEI</Label><Input value={device.sn} onChange={(e)=>setDevice({...device, sn:e.target.value})} /></div>
              <div><Label>Clave / PIN</Label><Input value={device.pass} onChange={(e)=>setDevice({...device, pass:e.target.value})} /></div>

              <div className="md:col-span-2"><Label>Descripción de la falla *</Label><Textarea rows={4} value={fail} onChange={(e)=>setFail(e.target.value)} /></div>
              <div className="md:col-span-2"><Label>Estado al ingresar *</Label><Textarea rows={3} value={stateIn} onChange={(e)=>setStateIn(e.target.value)} /></div>
              <div><Label>Presupuesto estimado ($)</Label><Input value={budget} onChange={(e)=>setBudget(e.target.value)} /></div>

              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={submitting} className="rounded-2xl px-6">
                  {submitting ? "Generando PDF…" : "Generar Orden (PDF)"}
                </Button>
              </div>
            </form>

            {done && (
              <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="mt-4 p-4 rounded-xl border text-sm bg-green-50 border-green-200 text-green-900">
                ✅ Orden <b>{orderNumber}</b> generada y enviada por email.
              </motion.div>
            )}
          </CardContent>
        </Card>

        <div className="mt-10 text-center text-xs text-gray-500">
          Lott Fix & Parts • Núñez / Vicente López • Tel: 11-2602-1568 (WhatsApp) • www.lott.com.ar • lucasrongo@gmail.com
        </div>
      </div>
    </div>
  );
}
