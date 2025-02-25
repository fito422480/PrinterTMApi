const express = require("express");
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 600 });
const cors = require("cors");
const dbManager = require("./src/config/dbManager.js");
const invoiceRoutes = require("./src/routes/invoiceRoutes.js");

const app = express();
const PORT = process.env.PORT || 9500;
const foo = Buffer.from("foo", "utf-8");

app.use(
  cors({
    origin: process.env.URL_FRONTEND || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use((req, res, next) => {
  const key = req.originalUrl || req.url;
  const cacheValue = cache.get(key);

  if (cacheValue) {
    return res.json(cacheValue);
  }

  res.locals.cacheKey = key;
  const originalJson = res.json;
  res.json = (body) => {
    if (res.statusCode === 200 && typeof body === "object") {
      cache.set(key, body);
    }
    originalJson.call(res, body);
  };

  next();
});

// Test de conexión usando el Worker
app.get("/test-db", async (req, res) => {
  try {
    const result = await dbManager.query("SELECT * FROM DUAL");
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: "Error en la consulta" });
  }
});

app.use("/invoices", invoiceRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

app.use((err, req, res) => {
  console.error("Error global:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(PORT, async () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});

// Manejo de cierre del proceso
process.on("SIGINT", () => {
  console.log("Cerrando servidor...");
  process.exit(0);
});
