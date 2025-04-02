// src/models/invoiceModel.js
const dbManager = require("../config/dbManager");
const NodeCache = require("node-cache");
require("dotenv").config();

// Cache con TTL de 5 minutos
const cache = new NodeCache({ stdTTL: 300 });

// Función para obtener invoices con paginación y filtros
async function getInvoices({ id, startDate, endDate, page = 1, limit = 1000 }) {
  const cacheKey = `invoices:${id || "all"}:${startDate || "all"}:${
    endDate || "all"
  }:page:${page}:limit:${limit}`;

  // Retornar los datos desde el caché si existen
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  // Construcción de consulta base - sin FETCH FIRST
  const queryBase = `
    SELECT ID, D_NUM_TIMB, D_FE_EMI_DE, D_EST, D_PUN_EXP, D_NUM_DOC, XML_RECEIVED, STATUS, RESULT_MSG, RESULT_STATUS
    FROM ${process.env.DB_SCHEMA}.V_MFS_INVOICE_ALL_ERRORS
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

  try {
    console.log("Ejecutando consulta para obtener invoices:", query);
    console.log("Con parámetros:", binds);

    const result = await dbManager.query(query, binds);

    // Verificar si result existe y tiene la propiedad rows
    if (!result) {
      console.log("No se recibieron resultados de la consulta");
      return [];
    }

    console.log(`Resultado obtenido - estructura:`, Object.keys(result));

    // Determinar dónde están las filas de resultados
    let invoices = [];

    if (Array.isArray(result)) {
      // Si result es directamente un array
      invoices = result;
      console.log(
        `Se encontraron ${invoices.length} facturas (result es array)`
      );
    } else if (result.rows && Array.isArray(result.rows)) {
      // Si result tiene una propiedad rows que es un array
      invoices = result.rows;
      console.log(
        `Se encontraron ${invoices.length} facturas (usando result.rows)`
      );
    } else {
      console.log("Resultado en formato inesperado:", typeof result, result);
      return [];
    }

    // Cachear los resultados y retornar
    cache.set(cacheKey, invoices);
    return invoices;
  } catch (error) {
    console.error("Error al ejecutar la consulta de invoices:", error);
    throw new Error("Error al obtener invoices. Intente nuevamente.");
  }
}

async function getInvoicesStats() {
  const cacheKey = "invoices_stats";

  // Retornar datos desde la caché si existen
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const query = `SELECT sent, approved, rejected, errors FROM ${process.env.DB_SCHEMA}.V_INVOICE_STATS`;

  try {
    console.log("Ejecutando consulta para estadísticas de facturas:", query);

    const result = await dbManager.query(query, []);
    console.log(`Resultado de estadísticas - estructura:`, Object.keys(result));

    // Determinar dónde están las filas de resultados
    let rows = [];

    if (Array.isArray(result)) {
      // Si result es directamente un array
      rows = result;
      console.log(
        `Se encontraron ${rows.length} filas de estadísticas (result es array)`
      );
    } else if (result.rows && Array.isArray(result.rows)) {
      // Si result tiene una propiedad rows que es un array
      rows = result.rows;
      console.log(
        `Se encontraron ${rows.length} filas de estadísticas (usando result.rows)`
      );
    } else {
      console.log("Resultado en formato inesperado:", typeof result, result);
      throw new Error(
        "Formato de resultado inesperado al obtener estadísticas."
      );
    }

    // Verificar si hay datos
    if (!rows || rows.length === 0) {
      throw new Error("No se encontraron datos en la vista de estadísticas.");
    }

    const stats = rows[0]; // Solo hay una fila
    console.log("Estadísticas obtenidas:", stats);

    cache.set(cacheKey, stats); // Cachear el resultado
    return stats;
  } catch (error) {
    console.error("Error al obtener estadísticas de facturas:", error);
    throw new Error("Error al obtener estadísticas de facturas.");
  }
}

async function getInvoicesAnalytics() {
  const cacheKey = "invoices_analytics";
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const query = `SELECT "MONTH", UV, PV, AMT FROM ${process.env.DB_SCHEMA}.V_INVOICE_ANALYTICS`;

  try {
    console.log("Ejecutando consulta para analytics de facturas:", query);

    const result = await dbManager.query(query, []);
    console.log(`Resultado de analytics - estructura:`, Object.keys(result));

    // Determinar dónde están las filas de resultados
    let rows = [];

    if (Array.isArray(result)) {
      // Si result es directamente un array
      rows = result;
      console.log(
        `Se encontraron ${rows.length} filas de analytics (result es array)`
      );
    } else if (result.rows && Array.isArray(result.rows)) {
      // Si result tiene una propiedad rows que es un array
      rows = result.rows;
      console.log(
        `Se encontraron ${rows.length} filas de analytics (usando result.rows)`
      );
    } else {
      console.log("Resultado en formato inesperado:", typeof result, result);
      throw new Error("Formato de resultado inesperado al obtener analytics.");
    }

    // Verificar si hay datos
    if (!rows || rows.length === 0) {
      throw new Error("No se encontraron datos en la vista de analytics.");
    }

    // Transformamos los resultados para devolverlos como un objeto
    const analytics = rows.map((row) => ({
      month: row.MONTH,
      UV: row.UV,
      PV: row.PV,
      AMT: row.AMT,
    }));

    console.log(
      `Datos de analytics transformados: ${analytics.length} registros`
    );

    cache.set(cacheKey, analytics); // Guardamos los resultados en caché
    return analytics;
  } catch (error) {
    console.error(
      "Error al ejecutar la consulta de analítica de facturas:",
      error.message || error
    );
    throw new Error("Error al obtener analítica de facturas.");
  }
}

async function updateInvoice({ id, xml_received }) {
  if (!id) {
    throw new Error("ID es obligatorio para actualizar la factura.");
  }

  // Asegurar que xml_received sea string y truncar si es muy largo
  xml_received =
    typeof xml_received === "string" ? xml_received.substring(0, 100000) : "";

  const query = `
    UPDATE ${process.env.DB_SCHEMA}.${process.env.DB_TABLE}
    SET STATUS = 'READY', XML_RECEIVED = :xml_received
    WHERE ID = :id
  `;

  const binds = {
    id,
    xml_received,
  };

  try {
    console.log("Ejecutando consulta SQL:", query);
    console.log("Valores:", binds);

    const result = await dbManager.query(query, binds);

    // Verificar rowsAffected en lugar de result.rows
    if (!result || result.rowsAffected === 0) {
      throw new Error("No se encontró ninguna factura con el ID especificado.");
    }

    return { message: "Factura actualizada exitosamente." };
  } catch (error) {
    console.error("Error en la consulta:", error);
    throw new Error("Error al actualizar la factura. Intente nuevamente.");
  }
}

function cleanXml(xml) {
  return xml ? xml.replace(/[\n\r\t]+/g, " ").trim() : xml;
}

async function insertInvoice(invoiceData) {
  const {
    traceId = null,
    requestId = null,
    invoiceOrigin = null,
    xmlReceived = null,
    status = null,
  } = invoiceData;

  // LIMPIAR XML ANTES DE INSERTARLO
  const cleanedXml = cleanXml(xmlReceived);

  const query = `
    INSERT INTO ${process.env.DB_SCHEMA}.${process.env.DB_TABLE} (
    ID, TRACE_ID, REQUEST_ID, INVOICE_ORIGIN, XML_RECEIVED, CREATION_DATE, STATUS)
    VALUES (
      MFS_INVOICE_ID_SQ.NEXTVAL, :traceId, :requestId, :invoiceOrigin, :xmlReceived, SYSDATE, :status)`;

  const binds = {
    traceId,
    requestId,
    invoiceOrigin,
    xmlReceived: cleanedXml, // Aquí va la versión limpia del XML
    status,
  };

  try {
    console.log("Insertando factura con datos:", invoiceData);
    const result = await dbManager.query(query, binds);

    if (!result || result.rowsAffected === 0) {
      throw new Error("No se pudo insertar la factura. Verifique los datos.");
    }

    return { message: "Factura insertada exitosamente." };
  } catch (error) {
    console.error("Error insertando factura:", error);
    throw new Error("Error al crear factura. Verifique los datos.");
  }
}

module.exports = {
  getInvoices,
  getInvoicesStats,
  getInvoicesAnalytics,
  updateInvoice,
  insertInvoice,
};
