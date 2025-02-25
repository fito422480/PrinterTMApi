const { parentPort } = require("worker_threads");
const { createPool, getConnection } = require("./db");

// Escuchar mensajes del hilo principal
parentPort.on("message", async (msg) => {
  try {
    if (msg === "init") {
      await createPool();
      parentPort.postMessage({ status: "success", message: "Pool creado" });
    } else if (msg === "test") {
      const connection = await getConnection();
      await connection.close();
      parentPort.postMessage({
        status: "success",
        message: "Conexión exitosa",
      });
    }
  } catch (error) {
    parentPort.postMessage({ status: "error", message: error.message });
  }
});
