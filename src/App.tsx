import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { Label } from "./components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Upload, CheckCircle2, Image as ImageIcon, Search } from "lucide-react";
import jsPDF from "jspdf";

const GAS_WEBAPP_URL = import.meta.env.VITE_GAS_WEBAPP_URL || "";

/** Datos de negocio centralizados (editables a futuro) */
const BUSINESS = {
  name: "Lott Fix & Parts",
  owner: "Lucas Rongo",
  phone: "11-2602-1568",
  email: "lucasrongo@gmail.com",
  website: "www.lott.com.ar",
  locations: ["Núñez", "Vicente López"],
  // Si querés usar logo incrustado sin subir archivo, pegá aquí un DataURL base64: "data:image/png;base64,AAAA..."
  logoBase64: "" // ← opcional: si lo dejás vacío, usa el de localStorage o el fallback tipográfico
};

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

  type HistItem = {
    orderNumber: string;
    fecha: string;
    hora: string;
    cliente: string;
    equipo: string;
    sucursal: string;
    pdfDataUrl?: string; // para "Ver PDF"
  };

  const [history, setHistory] = useState<HistItem[]>(() => {
    try {
      const raw = localStorage.getItem("lfp_history");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<"orden" | "historial">("orden");

  const [branch, setBranch] = useState(BUSINESS.locations[0] || "Núñez");
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

  const [q, setQ] = useState(""); // buscador historial

  // Orden incremental local
  const orderNumber = useMemo(() => {
    const key = "lfp_order_seq";
    let n = Number(localStorage.getItem(key) || "99");
    n += 1;
    localStorage.setItem(key, String(n));
    return `ORD-${String(n).padStart(4, "0")}`;
  }, []);

  // Fecha/hora AR
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

  // Logo: base64 -> localStorage -> fallback
  useEffect(() => {
    try {
      if (BUSINESS.logoBase64) {
        setLogo(BUSINESS.logoBase64);
        localStorage.setItem("lfp_logo", BUSINESS.logoBase64);
        return;
      }
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
          ctx.fillText(BUSINESS.name, 24, 110);
          ctx.fillStyle = "#374151";
          ctx.fillRect(24, 140, 260, 8);
        }
        const fallback = canvas.toDataURL("image/png");
        localStorage.setItem("lfp_logo", fallback);
        setLogo(fallback);
      }
    } catch {}
  }, []);

  // Favicon dinámico desde logo
  useEffect(() => {
    if (!logo) return;
    const link: HTMLLinkElement =
      (document.querySelector("link[rel='icon']") as HTMLLinkElement) ||
      document.createElement("link");
    link.rel = "icon";
    link.href = logo;
    document.head.appendChild(link);
  }, [logo]);

  // Handlers
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

  // PDF
  async function generatePDF(): Promise<{ fileName: string; dataUrl: string }> {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 40;
    const width = doc.internal.pageSize.getWidth();
    const usable = width - margin * 2;

    doc.setLineWidth(1.2);
    doc.setDrawColor(60);
    doc.setTextColor(0);
    doc.roundedRect(margin, margin, usable, 70, 6, 6);

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
    doc.text(
      `${BUSINESS.name} • Tel: ${BUSINESS.phone} • ${BUSINESS.website} • ${BUSINESS.email}`,
      margin,
      y + 30
    );

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
      const entry: HistItem = {
        orderNumber,
        fecha,
        hora,
        cliente: client.name,
        equipo: `${device.type} ${device.brand} ${device.model}`.trim(),
        sucursal: branch,
        pdfDataUrl: pdf.dataUrl
      };
      const h = [entry, ...history];
      setHistory(h);
      localStorage.setItem("lfp_history", JSON.stringify(h));
    } catch {}

    setDone(true);
    setSubmitting(false);
    setActiveTab("historial"); // ir directo a historial tras crear
  }

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return history;
    return history.filter(
      (h) =>
        h.orderNumber.toLowerCase().includes(qq) ||
        h.cliente.toLowerCase().includes(qq)
    );
  }, [q, history]);

  const Required = ({ children }: { children: React.ReactNode }) => (
    <span className="after:content-['*'] after:ml-1 after:text-gray-600">{children}</span>
  );
  return (
    <div className="min-h-screen w-full bg-white text-gray-800">
      {/* Menú Superior */}
      <div className="w-full bg-white shadow-sm border-b fixed top-0 left-0 z-20">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-6 py-3">
          <h1 className="text-lg font-semibold">{BUSINESS.name}</h1>
          <div className="flex gap-2">
            <Button
              variant={activeTab === "orden" ? "default" : "outline"}
              onClick={() => setActiveTab("orden")}
            >
              Nueva Orden
            </Button>
            <Button
              variant={activeTab === "historial" ? "default" : "outline"}
              onClick={() => setActiveTab("historial")}
            >
              Historial
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-24 pb-12">
        {activeTab === "orden" && (
          <Card className="shadow-md border-gray-200">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-500">
                    Orden <strong>{orderNumber}</strong> · {fecha} {hora}
                  </p>
                </div>
                <div>
                  {logo ? (
                    <img src={logo} alt="Logo" className="h-20 object-contain" />
                  ) : (
                    <label className="text-xs border px-3 py-2 rounded cursor-pointer flex gap-1 items-center">
                      <Upload size={14} /> Subir logo
                      <input type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
                    </label>
                  )}
                </div>
              </div>

              <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label><Required>Equipo recibido en</Required></Label>
                  <RadioGroup defaultValue={branch} onValueChange={setBranch} className="flex gap-4 mt-2">
                    {BUSINESS.locations.map((loc) => (
                      <label key={loc} className="flex items-center gap-2">
                        <RadioGroupItem value={loc} /> {loc}
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Label><Required>Técnico que recibe</Required></Label>
                  <Input value={tech} onChange={(e) => setTech(e.target.value)} />
                </div>

                <div>
                  <Label><Required>Nombre y Apellido</Required></Label>
                  <Input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
                </div>

                <div>
                  <Label><Required>DNI</Required></Label>
                  <Input value={client.dni} onChange={(e) => setClient({ ...client, dni: e.target.value })} />
                </div>

                <div>
                  <Label>Teléfono</Label>
                  <Input value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
                </div>

                <div>
                  <Label><Required>Email</Required></Label>
                  <Input value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />
                </div>

                <div>
                  <Label>Tipo de equipo</Label>
                  <Select value={device.type} onValueChange={(v) => setDevice({ ...device, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Celular">Celular</SelectItem>
                      <SelectItem value="Tablet">Tablet</SelectItem>
                      <SelectItem value="Notebook">Notebook</SelectItem>
                      <SelectItem value="PC">PC</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div><Label>Marca</Label><Input value={device.brand} onChange={(e) => setDevice({ ...device, brand: e.target.value })} /></div>
                <div><Label>Modelo</Label><Input value={device.model} onChange={(e) => setDevice({ ...device, model: e.target.value })} /></div>
                <div><Label>N° Serie / IMEI</Label><Input value={device.sn} onChange={(e) => setDevice({ ...device, sn: e.target.value })} /></div>
                <div><Label>Clave / PIN</Label><Input value={device.pass} onChange={(e) => setDevice({ ...device, pass: e.target.value })} /></div>

                <div className="md:col-span-2">
                  <Label><Required>Descripción de la falla</Required></Label>
                  <Textarea rows={3} value={fail} onChange={(e) => setFail(e.target.value)} />
                </div>

                <div className="md:col-span-2">
                  <Label><Required>Estado del equipo al ingresar</Required></Label>
                  <Textarea rows={3} value={stateIn} onChange={(e) => setStateIn(e.target.value)} />
                </div>

                <div>
                  <Label>Presupuesto ($)</Label>
                  <Input value={budget} onChange={(e) => setBudget(e.target.value)} />
                </div>

                <div>
                  <Label>Foto del equipo</Label>
                  <label className="text-xs border px-3 py-2 rounded cursor-pointer flex gap-1 items-center">
                    <ImageIcon size={14} /> Subir imagen
                    <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
                  </label>
                  {photo && <p className="text-xs text-green-600 mt-1"><CheckCircle2 size={14} /> Imagen cargada</p>}
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Generando PDF..." : "Generar Orden"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "historial" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="text-gray-500" size={18} />
              <Input placeholder="Buscar por orden o cliente" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>

            {history.length === 0 ? (
              <p className="text-sm text-gray-500">Todavía no hay órdenes cargadas.</p>
            ) : (
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border p-2">N°</th>
                    <th className="border p-2">Fecha</th>
                    <th className="border p-2">Cliente</th>
                    <th className="border p-2">Equipo</th>
                    <th className="border p-2">Sucursal</th>
                    <th className="border p-2">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((h) => (
                    <tr key={h.orderNumber}>
                      <td className="border p-2">{h.orderNumber}</td>
                      <td className="border p-2">{h.fecha} {h.hora}</td>
                      <td className="border p-2">{h.cliente}</td>
                      <td className="border p-2">{h.equipo}</td>
                      <td className="border p-2">{h.sucursal}</td>
                      <td className="border p-2">
                        {h.pdfDataUrl ? (
                          <a href={h.pdfDataUrl} download={`${h.orderNumber}.pdf`} className="text-blue-600 underline">
                            Ver PDF
                          </a>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
