// src/config/dbManager.js
const { createPool, getConnection } = require("./db");

class DBManager {
  constructor() {
    this.initialize();
  }

  async initialize() {
    try {
      await createPool();
      console.log("Pool de conexiones creado");
    } catch (error) {
      console.error("Error inicializando el pool:", error);
      process.exit(1);
    }
  }

  async query(sql, params = []) {
    let connection;
    try {
      connection = await getConnection();
      const result = await connection.execute(sql, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Error en la consulta: ${error.message}`);
    } finally {
      if (connection) await connection.close();
    }
  }
}

module.exports = new DBManager();
