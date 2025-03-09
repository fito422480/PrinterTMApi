// src/config/dbManager.js
const dbWorkerPool = require("./dbWorkerPool");

class DBManager {
  constructor() {
    // El pool de workers ya se inicializa automáticamente
    console.log("DBManager inicializado con worker pool");
  }

  async query(sql, params = []) {
    try {
      const result = await dbWorkerPool.executeQuery(sql, params);
      return result;
    } catch (error) {
      throw new Error(`Error en la consulta: ${error.message}`);
    }
  }

  async shutdown() {
    return dbWorkerPool.terminate();
  }
}

module.exports = new DBManager();
