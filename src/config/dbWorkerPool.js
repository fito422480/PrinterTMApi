// src/config/dbWorkerPool.js
const { Worker } = require("worker_threads");
const path = require("path");
const os = require("os");

class DBWorkerPool {
  constructor(numWorkers = Math.max(1, os.cpus().length - 1)) {
    this.workers = [];
    this.taskQueue = [];
    this.idleWorkers = [];
    this.nextWorkerId = 0;
    this.initialize(numWorkers);
  }

  initialize(numWorkers) {
    console.log(`Inicializando pool con ${numWorkers} workers...`);

    for (let i = 0; i < numWorkers; i++) {
      this.createWorker();
    }
  }

  createWorker() {
    const workerId = this.nextWorkerId++;
    const worker = new Worker(path.join(__dirname, "../config/dbworker.js"), {
      workerData: { workerId },
    });

    worker.on("message", (message) => {
      if (message.type === "init") {
        console.log(`Worker ${workerId} inicializado`);
        this.idleWorkers.push(workerId);
        this.processQueue();
      } else if (message.type === "result") {
        // Procesar resultado de tarea completada
        if (
          message.taskId &&
          this.taskQueue.find((t) => t.id === message.taskId)
        ) {
          const task = this.taskQueue.find((t) => t.id === message.taskId);
          if (message.error) {
            task.reject(new Error(message.error));
          } else {
            task.resolve(message.data);
          }

          // Eliminar tarea completada de la cola
          this.taskQueue = this.taskQueue.filter(
            (t) => t.id !== message.taskId
          );

          // Marcar worker como disponible
          this.idleWorkers.push(workerId);
          this.processQueue();
        }
      }
    });

    worker.on("error", (err) => {
      console.error(`Error en Worker ${workerId}:`, err);
      // Reemplazar worker con error
      this.workers = this.workers.filter((w) => w.id !== workerId);
      this.idleWorkers = this.idleWorkers.filter((id) => id !== workerId);
      this.createWorker();
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(
          `Worker ${workerId} terminó con código de salida ${code}`
        );
        // Reemplazar worker terminado
        this.workers = this.workers.filter((w) => w.id !== workerId);
        this.idleWorkers = this.idleWorkers.filter((id) => id !== workerId);
        this.createWorker();
      }
    });

    // Inicializar worker y pool de conexiones
    worker.postMessage({ type: "init" });

    this.workers.push({ id: workerId, worker });
  }

  executeQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      const taskId = Date.now() + Math.random().toString(36).substr(2, 5);

      this.taskQueue.push({
        id: taskId,
        type: "query",
        sql,
        params,
        resolve,
        reject,
      });

      this.processQueue();
    });
  }

  processQueue() {
    // Si hay tareas pendientes y workers disponibles
    while (this.taskQueue.length > 0 && this.idleWorkers.length > 0) {
      const workerId = this.idleWorkers.shift();
      const task = this.taskQueue[0]; // No eliminamos la tarea hasta que se complete

      const workerObj = this.workers.find((w) => w.id === workerId);
      if (workerObj) {
        workerObj.worker.postMessage({
          type: task.type,
          taskId: task.id,
          sql: task.sql,
          params: task.params,
        });
      } else {
        // Si el worker no existe, volver a poner la tarea en la cola
        this.idleWorkers.push(workerId);
      }
    }
  }

  terminate() {
    return Promise.all(
      this.workers.map(({ worker }) => {
        return new Promise((resolve) => {
          worker.once("exit", resolve);
          worker.terminate();
        });
      })
    );
  }
}

module.exports = new DBWorkerPool();
