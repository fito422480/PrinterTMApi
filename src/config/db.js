const oracledb = require("oracledb");
require("dotenv").config({ path: "./.env" });

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

const dbPassword = process.env.DB_PASSWORD?.trim();

if (!dbPassword || !process.env.DB_USER || !process.env.DB_HOST) {
  throw new Error("Faltan variables de entorno requeridas.");
}

let clientOpts = {};

if (process.platform === "win32") {
  clientOpts = { libDir: "D:/instantclient/instantclient_23_5" };
} else {
  clientOpts = { libDir: process.env.INSTANT_CLIENT_DIR };
}

try {
  oracledb.initOracleClient(clientOpts);
} catch (error) {
  throw new Error("Error al inicializar Oracle Client: " + error.message);
}

// Crear el pool de conexiones
const createPool = async () => {
  try {
    await oracledb.createPool({
      user: process.env.DB_USER,
      password: dbPassword,
      connectString: process.env.DB_HOST,
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1,
      poolTimeout: 60,
      poolAlias: "default",
    });
    console.log("Pool creado exitosamente");
  } catch (error) {
    throw new Error("Error creando el pool: " + error.message);
  }
};

// Obtener conexión
const getConnection = async () => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    console.log("Conexión obtenida exitosamente");
    return connection;
  } catch (error) {
    throw new Error("Error obteniendo conexión: " + error.message);
  }
};

module.exports = {
  createPool,
  getConnection,
  oracledb,
};
