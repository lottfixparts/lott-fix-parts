export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  try {
    const response = await fetch(
      "https://script.google.com/macros/s/AKfycbzjnuaRgHZNjwIdyJEJ1sPDIWIPXRKvhQdKCguQjbqxhXpafUGu2_1mXnhlP27470j0/exec",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ ok: false, error: error.toString() });
  }
}
