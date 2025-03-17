// src/config/dbWorker.js
const { parentPort, workerData } = require("worker_threads");
const oracledb = require("oracledb");
require("dotenv").config({ path: "./.env" });

// Configuración de Oracle
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

const dbPassword = process.env.DB_PASSWORD?.trim();
const { workerId } = workerData || { workerId: 0 };

if (!dbPassword || !process.env.DB_USER || !process.env.DB_HOST) {
  parentPort.postMessage({
    type: "error",
    error: "Faltan variables de entorno requeridas.",
  });
  process.exit(1);
}

// Configuración del cliente Oracle según plataforma
let clientOpts = {};
if (process.platform === "win32") {
  clientOpts = { libDir: "D:/instantclient/instantclient_23_5" };
} else {
  clientOpts = { libDir: process.env.INSTANT_CLIENT_DIR };
}

// Variables para el manejo de conexiones
let connectionPool = null;

// Inicializar el cliente Oracle
try {
  oracledb.initOracleClient(clientOpts);
} catch (error) {
  parentPort.postMessage({
    type: "error",
    error: `Error al inicializar Oracle Client: ${error.message}`,
  });
  process.exit(1);
}

// Función para inicializar el pool de conexiones
async function initializeConnectionPool() {
  try {
    connectionPool = await oracledb.createPool({
      user: process.env.DB_USER,
      password: dbPassword,
      connectString: process.env.DB_HOST,
      poolMin: 1,
      poolMax: 3,
      poolIncrement: 1,
      poolTimeout: 60,
    });

    // Notificar que el worker está listo
    parentPort.postMessage({
      type: "init",
      message: `Worker ${workerId} inicializado exitosamente`,
    });
  } catch (error) {
    parentPort.postMessage({
      type: "error",
      error: `Error creando el pool en worker ${workerId}: ${error.message}`,
    });
    process.exit(1);
  }
}

// Función para ejecutar consultas
async function executeQuery(sql, params = [], taskId) {
  let connection;
  try {
    connection = await connectionPool.getConnection();
    const result = await connection.execute(sql, params);

    // Un objeto de resultado completo para cualquier tipo de consulta
    parentPort.postMessage({
      type: "result",
      taskId,
      data: {
        rows: result.rows || [],
        rowsAffected: result.rowsAffected || 0,
        outBinds: result.outBinds || null,
        metaData: result.metaData || null,
      },
    });
  } catch (error) {
    parentPort.postMessage({
      type: "result",
      taskId,
      error: `Error en la consulta: ${error.message}`,
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error(
          `Worker ${workerId} - Error al cerrar la conexión:`,
          closeError
        );
      }
    }
  }
}

// Escuchar mensajes del hilo principal
parentPort.on("message", async (msg) => {
  try {
    if (msg.type === "init") {
      await initializeConnectionPool();
    } else if (msg.type === "query") {
      await executeQuery(msg.sql, msg.params, msg.taskId);
    }
  } catch (error) {
    parentPort.postMessage({
      type: "error",
      taskId: msg.taskId || null,
      error: error.message,
    });
  }
});

// Gestionar cierre limpio
process.on("SIGTERM", async () => {
  console.log(`Worker ${workerId} cerrando...`);
  if (connectionPool) {
    try {
      await connectionPool.close(10);
    } catch (err) {
      console.error(`Error al cerrar el pool en worker ${workerId}:`, err);
    }
  }
  process.exit(0);
});
