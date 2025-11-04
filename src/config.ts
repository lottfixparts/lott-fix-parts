// URL del WebApp (Backend GAS o API Vercel)
//
// Se prioriza el valor de la variable de entorno VITE_GAS_WEBAPP_URL si está
// presente (por ejemplo, cuando quieres apuntar a un Apps Script personalizado).  
// De lo contrario, se utiliza la ruta local "/api/orden", que apunta a la
// función serverless en Vercel encargada de guardar la orden en Google Sheets
// y enviar notificaciones por correo.  Esto evita la dependencia de un
// Apps Script que pueda caducar o no aceptar peticiones POST.

export const GAS_WEBAPP_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_GAS_WEBAPP_URL) ||
  "/api/orden";
