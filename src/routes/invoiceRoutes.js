const express = require("express");
const {
  getInvoices,
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
  } catch (error) {
    console.error("Error al obtener el o las facturas:", error);
    res.status(500).json({ error: "Error al obtener el o las facturas" });
  }
});

// Ruta para actualizar una factura específica
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { xml_received } = req.body;

  if (!id || !xml_received) {
    return res.status(400).json({
      error: "ID y xml_received son campos obligatorios.",
    });
  }

  try {
    const result = await updateInvoice({ id, xml_received });
    res.json(result);
  } catch (error) {
    console.error("Error al actualizar la factura:", error);
    res.status(500).json({ error: "Error al actualizar la factura" });
  }
});

// Ruta para insertar una nueva factura
router.post("/", async (req, res) => {
  const {
    invoiceId,
    traceId,
    documentNumber,
    dNumTimb,
    dEst,
    dPunExp,
    dNumDoc,
    dSerie,
    dFeEmiDe,
    cdc,
    xmlReceived,
    xmlSent,
    status,
    resultStatus,
    resultMsg,
    dFeEmiDeBk,
  } = req.body;

  // Validar campos obligatorios
  const requiredFields = ["traceId", "dFeEmiDe", "xmlReceived", "status"];
  const missingFields = requiredFields.filter((field) => !req.body[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Campos obligatorios faltantes: ${missingFields.join(", ")}`,
      details:
        "Los campos requeridos son: traceId, dFeEmiDe, xmlReceived y status",
    });
  }

  // Validar formato de fechas
  const dateValidations = [];
  if (!isValidDate(dFeEmiDe)) {
    dateValidations.push(
      "dFeEmiDe con formato inválido (YYYY-MM-DD requerido)"
    );
  }
  if (dFeEmiDeBk && !isValidDate(dFeEmiDeBk)) {
    dateValidations.push(
      "dFeEmiDeBk con formato inválido (YYYY-MM-DD requerido)"
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
      invoiceId: invoiceId || 0,
      traceId,
      documentNumber: documentNumber || 0,
      dNumTimb: dNumTimb || 0,
      dEst: dEst || "",
      dPunExp: dPunExp || "",
      dNumDoc: dNumDoc || 0,
      dSerie: dSerie || "",
      dFeEmiDe,
      cdc: cdc || "",
      xmlReceived,
      xmlSent: xmlSent || "",
      status,
      resultStatus: resultStatus || "",
      resultMsg: resultMsg || "",
      dFeEmiDeBk,
    });

    res.status(201).json({
      ...result,
      insertedId: traceId, // Asumiendo que traceId actúa como identificador único
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
