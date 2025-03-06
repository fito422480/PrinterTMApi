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
    WHERE RESULT_MSG IS NULL
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

async function getInvoicesStats() {
  const cacheKey = "invoices_stats";

  // Retornar datos desde la caché si existen
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const query = `SELECT sent, approved, rejected, errors FROM MUNDO2.V_INVOICE_STATS`;

  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(query, [], {
      outFormat: oracle.OUT_FORMAT_OBJECT,
    });

    if (!result.rows.length) {
      throw new Error("No se encontraron datos en la vista.");
    }

    const stats = result.rows[0]; // Solo hay una fila
    cache.set(cacheKey, stats); // Cachear el resultado

    return stats;
  } catch (error) {
    console.error("Error al obtener estadísticas de facturas:", error);
    throw new Error("Error al obtener estadísticas de facturas.");
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

async function getInvoicesAnalytics() {
  const cacheKey = "invoices_analytics";
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const query = `SELECT "MONTH", UV, PV, AMT FROM MUNDO2.V_INVOICE_ANALYTICS`;

  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(query, [], {
      outFormat: oracle.OUT_FORMAT_OBJECT,
    });

    if (!result.rows.length) {
      throw new Error("No se encontraron datos en la vista.");
    }

    // Aquí transformamos los resultados para devolverlos como un objeto
    const analytics = result.rows.map((row) => ({
      month: row.MONTH,
      UV: row.UV,
      PV: row.PV,
      AMT: row.AMT,
    }));

    cache.set(cacheKey, analytics); // Guardamos los resultados en caché

    return analytics;
  } catch (error) {
    console.error(
      "Error al ejecutar la consulta de analítica de facturas:",
      error.message || error
    );
    throw new Error("Error al obtener analítica de facturas.");
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

async function insertInvoice(invoiceData) {
  const {
    invoiceId: invoiceId,
    traceId = null,
    requestId = null,
    customerId = null,
    invoiceOrigin = null,
    dNumTimb = null,
    dEst = null,
    dPunExp = null,
    dNumDoc = null,
    dFeEmiDe = null,
    xmlReceived = null,
    creationDate = null,
    status = null,
  } = invoiceData;

  const query = `
    INSERT INTO ${process.env.DB_SCHEMA} (
    ID, TRACE_ID, REQUEST_ID, CUSTOMER_ID, INVOICE_ORIGIN, D_NUM_TIMB, D_EST, D_PUN_EXP, D_NUM_DOC,  
    D_FE_EMI_DE, XML_RECEIVED, CREATION_DATE, STATUS) 
    VALUES (
      :invoiceId, :traceId, :requestId, :customerId, :invoiceOrigin, :dNumTimb, :dEst, :dPunExp, :dNumDoc,
      TO_TIMESTAMP(:dFeEmiDe, 'YYYY-MM-DD HH24:MI:SS.FF6'), :xmlReceived, TO_TIMESTAMP(:creationDate, 'YYYY-MM-DD HH24:MI:SS.FF6'), :status
    )`;

  const binds = {
    invoiceId,
    traceId,
    requestId,
    customerId,
    invoiceOrigin,
    dNumTimb,
    dEst,
    dPunExp,
    dNumDoc,
    dFeEmiDe,
    xmlReceived,
    creationDate,
    status,
  };

  // Agregar fechas solo si existen
  if (dFeEmiDe) binds.dFeEmiDe = dFeEmiDe;

  let connection;
  try {
    console.log("Insertando factura con datos:", invoiceData);
    connection = await getConnection();
    await connection.execute(query, binds, { autoCommit: true });
    return { message: "Factura insertada exitosamente." };
  } catch (error) {
    console.error("Error insertando factura:", error);
    throw new Error("Error al crear factura. Verifique los datos.");
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error("Error cerrando conexión:", closeError);
      }
    }
  }
}

module.exports = {
  getInvoices,
  getInvoicesStats,
  getInvoicesAnalytics,
  updateInvoice,
  insertInvoice,
};
