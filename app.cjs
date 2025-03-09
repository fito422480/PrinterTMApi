// app.cjs
const express = require("express");
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 600 });
const cors = require("cors");
const dbManager = require("./src/config/dbManager.js");
const invoiceRoutes = require("./src/routes/invoiceRoutes.js");
const cluster = require("cluster");
const os = require("os");

// Número de workers de cluster (distinto de los worker threads para DB)
const NUM_CLUSTERS =
  process.env.NUM_CLUSTERS || Math.max(1, os.cpus().length - 1);

if (cluster.isMaster && process.env.ENABLE_CLUSTERING === "true") {
  console.log(
    `Iniciando servidor en modo cluster con ${NUM_CLUSTERS} procesos`
  );

  // Fork workers
  for (let i = 0; i < NUM_CLUSTERS; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} murió. Reiniciando...`);
    cluster.fork();
  });
} else {
  const app = express();
  const PORT = process.env.PORT || 9500;

  app.use(
    cors({
      origin: process.env.URL_FRONTEND || "http://localhost:3000",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json({ limit: "50mb" }));
  app.use(
    express.urlencoded({
      limit: "50mb",
      extended: true,
      parameterLimit: 100000,
    })
  );

  // Middleware de caché
  app.use((req, res, next) => {
    // No cachear peticiones POST, PUT, DELETE
    if (req.method !== "GET") {
      return next();
    }

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

  // Test de conexión usando el Worker Pool
  app.get("/test-db", async (req, res) => {
    try {
      const result = await dbManager.query("SELECT * FROM DUAL");
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ error: `Error en la consulta: ${error.message}` });
    }
  });

  // Rutas de la aplicación
  app.use("/invoices", invoiceRoutes);

  // Manejador de rutas no encontradas
  app.use((req, res) => {
    res.status(404).json({ error: "Ruta no encontrada" });
  });

  // Manejador global de errores
  app.use((err, req, res, next) => {
    console.error("Error global:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  });

  // Iniciar servidor
  const server = app.listen(PORT, async () => {
    console.log(
      `Servidor corriendo en el puerto ${PORT} (PID: ${process.pid})`
    );
  });

  // Manejo de señales para cierre graceful
  const shutdown = async () => {
    console.log("Cerrando servidor...");

    server.close(async () => {
      console.log("Conexiones HTTP cerradas.");

      try {
        await dbManager.shutdown();
        console.log("Conexiones a base de datos cerradas.");
        process.exit(0);
      } catch (err) {
        console.error("Error al cerrar conexiones de base de datos:", err);
        process.exit(1);
      }
    });

    // Forzar cierre después de 10 segundos
    setTimeout(() => {
      console.error("Forzando cierre después de 10s de timeout");
      process.exit(1);
    }, 10000);
  };

  // Manejar señales de terminación
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("uncaughtException", (err) => {
    console.error("Excepción no capturada:", err);
    shutdown();
  });
}
