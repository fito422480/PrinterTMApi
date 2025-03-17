const express = require("express");
const multer = require("multer");
const {
  getInvoices,
  getInvoicesStats,
  getInvoicesAnalytics,
  updateInvoice,
  insertInvoice,
} = require("../models/invoiceModel");

const router = express.Router();

// Función para validar la existencia y el formato correcto de las fechas
const isValidDate = (date) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  const parsedDate = new Date(date);
  return parsedDate instanceof Date && !isNaN(parsedDate);
};

// Ruta para obtener invoices con paginación y filtros
router.get("/", async (req, res) => {
  try {
    const filters = {
      id: req.query.id,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 100,
    };

    // Validar formato y existencia de las fechas
    if (filters.startDate && !isValidDate(filters.startDate)) {
      return res.status(400).json({
        error:
          "El formato de startDate es inválido o la fecha no existe. Debe ser 'YYYY-MM-DD'.",
      });
    }
    if (filters.endDate && !isValidDate(filters.endDate)) {
      return res.status(400).json({
        error:
          "El formato de endDate es inválido o la fecha no existe. Debe ser 'YYYY-MM-DD'.",
      });
    }

    // Validar que startDate no sea posterior a endDate
    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      if (startDate > endDate) {
        return res.status(400).json({
          error:
            "La fecha de inicio (startDate) no puede ser posterior a la fecha de fin (endDate).",
        });
      }
    }

    const invoices = await getInvoices(filters);
    res.json(invoices);
    console.log("Facturas obtenidas exitosamente", invoices);
  } catch (error) {
    console.error("Error al obtener el o las facturas:", error);
    res.status(500).json({ error: "Error al obtener el o las facturas" });
  }
});

// Nueva ruta para obtener estadísticas de facturas
router.get("/analytics", async (req, res) => {
  try {
    const anali = await getInvoicesAnalytics();
    res.json(anali);
    console.log("Estadísticas de facturas obtenidas exitosamente", anali);
  } catch (error) {
    console.error(
      "Error al obtener analítica de facturas:",
      error.message || error
    );
    console.error("Detalles del error:", error.stack || error);
    res.status(500).json({ error: "Error al obtener analítica." });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const stats = await getInvoicesStats();
    res.json(stats);
    console.log("Analisis de facturas obtenidas exitosamente por mes", stats);
  } catch (error) {
    console.error("Error al obtener estadísticas de facturas:", error);
    res.status(500).json({ error: "Error al obtener estadísticas." });
  }
});

// Ruta para actualizar una factura específica
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const numericId = Number(id);
  const xmlData = String(req.body.xml_received); // Convertimos a string

  if (!numericId || !xmlData) {
    return res.status(400).json({
      error: "ID y xml_received son campos obligatorios.",
    });
  }

  console.log("ID:", numericId);
  console.log("Tipo de xml_received:", typeof xmlData);
  console.log("Contenido xml_received:", xmlData.substring(0, 100000) + "..."); // Muestra solo una parte del XML para evitar logs gigantes

  try {
    const result = await updateInvoice({
      id: numericId,
      xml_received: xmlData,
    });
    res.json(result);
  } catch (error) {
    console.error("Error al actualizar la factura:", error);
    res
      .status(500)
      .json({ error: error.message || "Error al actualizar la factura" });
  }
});

// Ruta para insertar una nueva factura
router.post("/", async (req, res) => {
  const {
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
  } = req.body;
  // Convertir campos numéricos
  // Validar campos obligatorios
  const requiredFields = [
    "invoiceId",
    "traceId",
    "customerId",
    "invoiceOrigin",
    "dNumTimb",
    "dEst",
    "dPunExp",
    "dNumDoc",
    "dFeEmiDe",
    "xmlReceived",
    "creationDate",
    "status",
  ];

  const missingFields = requiredFields.filter((field) => !req.body[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Campos obligatorios faltantes: ${missingFields.join(", ")}`,
      details:
        "Los campos requeridos son: invoiceid, traceId, invoiceOrigin, dEst, dPunExp, dNumDoc, dFeEmiDE, xmlReceived, creationDate y status.",
    });
  }

  // Función para validar el formato TIMESTAMP de Oracle
  function isValidTimestamp(dateStr) {
    // Expresión regular para el formato YYYY-MM-DD HH:mm:ss.ffffff
    const timestampRegex =
      /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01]) (?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\.\d{3,6}$/;

    if (!timestampRegex.test(dateStr)) {
      return false;
    }

    // Convertir a formato ISO 8601 para validación de fecha
    const isoDate = dateStr.replace(" ", "T").replace(/\.(\d{3})\d{3}$/, ".$1");
    return !isNaN(new Date(isoDate).getTime());
  }

  // Validación en tu controlador
  const dateValidations = [];
  if (!isValidTimestamp(dFeEmiDe)) {
    dateValidations.push(
      "dFeEmiDe: Formato inválido. Se requiere TIMESTAMP 'YYYY-MM-DD HH24:MI:SS.FF6'"
    );
  }

  if (dateValidations.length > 0) {
    return res.status(400).json({
      error: "Error de validación de fechas",
      details: dateValidations,
    });
  }

  try {
    const result = await insertInvoice({
      invoiceId: invoiceId || null,
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
    });

    res.status(201).json({
      ...result,
      insertedId: invoiceId, // Aquí puedes asumir que invoiceId actúa como identificador único
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error en inserción de las facturas:", error);
    const statusCode = error.message.includes("existente") ? 409 : 500;
    res.status(statusCode).json({
      error: "Error en creación de factura",
      details: error.message,
    });
  }
});

module.exports = router;
