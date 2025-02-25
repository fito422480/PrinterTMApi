const oracle = require("oracledb");
const { getConnection } = require("../config/db");
const NodeCache = require("node-cache");
require("dotenv").config();

// Cache con TTL de 5 minutos
const cache = new NodeCache({ stdTTL: 300 });

// Función para obtener invoices con paginación y filtros
async function getInvoices({ id, startDate, endDate, page = 1, limit = 100 }) {
  const cacheKey = `invoices:${id || "all"}:${startDate || "all"}:${
    endDate || "all"
  }:page:${page}:limit:${limit}`;

  // Retornar los datos desde el caché si existen
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  // Construcción de consulta base con paginación y filtros dinámicos
  const queryBase = `
    SELECT ID, D_NUM_TIMB, D_FE_EMI_DE,D_EST, D_PUN_EXP, D_NUM_DOC, XML_RECEIVED, STATUS, RESULT_MSG, RESULT_STATUS
    FROM ${process.env.DB_SCHEMA}
    WHERE RESULT_MSG IS NOT NULL
  `;
  const binds = {};

  // Agregar filtros de ID y rango de fechas
  const filters = [];
  if (id) {
    filters.push("ID = :id");
    binds.id = id;
  }
  if (startDate && endDate) {
    filters.push(
      "D_FE_EMI_DE BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') AND TO_DATE(:endDate, 'YYYY-MM-DD')"
    );
    binds.startDate = startDate;
    binds.endDate = endDate;
  }

  // Concatenar la consulta con filtros y opciones de paginación
  const query = `
    ${queryBase}
    ${filters.length ? `AND ${filters.join(" AND ")}` : ""}
    ORDER BY D_FE_EMI_DE DESC
    OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
  `;
  binds.offset = (page - 1) * limit;
  binds.limit = limit;

  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(query, binds, {
      outFormat: oracle.OUT_FORMAT_OBJECT,
    });

    // Cachear los resultados y retornar
    cache.set(cacheKey, result.rows);
    return result.rows;
  } catch (error) {
    console.error("Error al ejecutar la consulta de invoices:", error);
    throw new Error("Error al obtener invoices. Intente nuevamente.");
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error al cerrar la conexión:", closeError);
      }
    }
  }
}

async function updateInvoice({ id, xml_received }) {
  if (!id) {
    throw new Error("ID es obligatorio para actualizar la factura.");
  }
  xml_received = xml_received.substring(0, 2000);
  const query = `
    UPDATE ${process.env.DB_SCHEMA}
    SET STATUS = 'READY', XML_RECEIVED = :xml_received
    WHERE ID = :id
  `;

  const binds = {
    id,
    xml_received, //: { val: xml_received, type: oracle.CLOB },
  };

  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(query, binds, { autoCommit: true });

    if (result.rowsAffected === 0) {
      throw new Error("No se encontró ninguna factura con el ID especificado.");
    }

    return { message: "Factura actualizada exitosamente." };
  } catch (error) {
    console.error("Error al actualizar la factura:", error);
    throw new Error("Error al actualizar la factura. Intente nuevamente.");
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error al cerrar la conexión:", closeError);
      }
    }
  }
}

module.exports = { getInvoices, updateInvoice };
