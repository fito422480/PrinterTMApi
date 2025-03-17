const dbWorkerPool = require("./dbWorkerPool");

class DBManager {
  constructor() {
    console.log("DBManager inicializado con worker pool");
  }

  async query(sql, params = []) {
    try {
      console.log("Ejecutando consulta SQL:", sql);
      console.log("Con parámetros:", params);
  
      const result = await dbWorkerPool.executeQuery(sql, params);
  
      if (!result || result.error) {
        console.error(
          "Error en la consulta:",
          result ? result.error : "Resultado vacío"
        );
        throw new Error(
          `Error en la consulta: ${result ? result.error : "Resultado vacío"}`
        );
      }
  
      return result;
    } catch (error) {
      console.error("Error en la consulta SQL:", error);
      throw new Error(`Error en la consulta: ${error.message}`);
    }
  }

  async shutdown() {
    try {
      console.log("Cerrando conexiones de DBWorkerPool");
      return await dbWorkerPool.terminate();
    } catch (error) {
      console.error("Error al cerrar DBWorkerPool:", error);
      throw new Error("Error al cerrar conexiones de la base de datos");
    }
  }
}

module.exports = new DBManager();
