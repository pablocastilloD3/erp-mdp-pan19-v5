/**
 * @file W_UpdateXML.gs
 * @version 5.2.0 - RESTAURACIÓN TOTAL Y BYPASS ISO 22000
 * @description Motor de Ingesta Masiva DTE.
 */

function w_updatexml_procesarIntegracion(payloadStr) {
    const correlationId = "LOTE-" + new Date().getTime();
    try {
        const activeSS = SpreadsheetApp.getActiveSpreadsheet();
        if (activeSS) { SECRETS.SPREADSHEET_ID = activeSS.getId(); }

        const email = Session.getActiveUser().getEmail();
        if (!email) throw new Error("Sesión no autorizada.");

        const payload = JSON.parse(payloadStr);
        const safeIp = payload.ip || "0.0.0.0";

        const resultado = _logica_ejecutarIntegracionLote(payload.loteDTE, email, correlationId, safeIp);

        if (typeof registrarLogInterno === 'function') {
            registrarLogInterno("XML_BATCH", "UPDATEXML", correlationId, "N/A", JSON.stringify({ docs: payload.loteDTE.length }), "Ingesta Masiva OK", safeIp);
        }

        return JSON.stringify({ success: true, data: resultado });
    } catch (error) {
        console.error("🚨 Error en UpdateXML:", error);
        return JSON.stringify({ error: true, message: error.message });
    }
}

function _logica_ejecutarIntegracionLote(loteDTE, email, correlationId, ip) {
    const ss = SpreadsheetApp.openById(SECRETS.SPREADSHEET_ID);
    const resultados = { successes: [], errors: [], certUrl: "" };

    let folder;
    try { folder = DriveApp.getFolderById(SECRETS.FOLDER_XML_BODEGA); }
    catch (e) { folder = DriveApp.getRootFolder(); }

    // --- CACHÉ PARA BYPASS ---
    const sheetProv = ss.getSheetByName(CONFIG.DB.PROVEEDORES);
    const cProv = sheetProv ? UTIL_ExploradorCabeceras(sheetProv) : {};
    const cacheISOProveedores = {};
    if (sheetProv && cProv['RUT_ENTIDAD'] !== undefined) {
        sheetProv.getDataRange().getValues().forEach(r => {
            const rut = String(r[cProv['RUT_ENTIDAD']]).replace(/\./g, '').trim().toUpperCase();
            cacheISOProveedores[rut] = String(r[cProv['ISO_RIESGO']] || 'EVALUACION').trim().toUpperCase();
        });
    }

    const sheetItems = ss.getDataRange().getValues(); // Placeholder para búsqueda simple
    const tiposProductivos = ['MP_CRITICA', 'MP_GENERAL', 'INS_QUIM', 'EMB_CON', 'EMB_SEC'];

    loteDTE.forEach(dte => {
        try {
            const rutLimpio = String(dte.rutEmisor).replace(/\./g, '').trim().toUpperCase();
            const folioStr = String(Number(dte.folio) || 0);

            // EVALUACIÓN BYPASS
            let requiereCalidad = true;
            if (cacheISOProveedores[rutLimpio] === 'NO_APLICA') {
                requiereCalidad = false;
            } else {
                let tieneProductivo = dte.items.some(it => {
                    // Si el ítem no existe en el maestro o es de tipo productivo, requiere calidad
                    return true; // Lógica simplificada para asegurar captura inicial
                });
                if (!tieneProductivo) requiereCalidad = false;
            }

            const estadoCalidad = requiereCalidad ? 'PENDIENTE' : '';
            const idFacturaUUID = Utilities.getUuid();
            const montoTotalStr = String(Number(dte.montoTotal) || 0);

            // PERSISTENCIA DRIVE
            const xmlBlob = Utilities.newBlob(dte.xmlRaw, 'application/xml', `DTE_${rutLimpio}_${folioStr}.xml`);
            const fileXml = folder.createFile(xmlBlob);

            // 1. COMPRAS
            _ejecutarYValidar('COMPRAS', 'NUEVO', {
                ID_UUID: idFacturaUUID,
                STATUS: 'INTEGRADO',
                FECHA_EMISION: dte.fechaEmision,
                FOLIO: folioStr,
                RUT_EMISOR: rutLimpio,
                RAZON_SOCIAL: UTIL_ToProperCase(dte.razonSocial),
                MONTO_TOTAL: montoTotalStr,
                CONTROL_CALIDAD: estadoCalidad,
                ESTADO_PAGO: 'PENDIENTE',
                URL_XML_PDF: JSON.stringify({ xml: fileXml.getUrl() })
            }, ip);

            // 2. CXP
            _ejecutarYValidar('CXP', 'NUEVO', {
                ID_CXP: Utilities.getUuid(),
                ID_FACTURA: idFacturaUUID,
                RUT_PROVEEDOR: rutLimpio,
                MONTO_DEUDA: montoTotalStr,
                ESTADO_PAGO: 'PENDIENTE',
                VENCIMIENTO: dte.fechaVencimiento
            }, ip);

            resultados.successes.push(dte);
        } catch (e) {
            resultados.errors.push({ folio: dte.folio, error: e.message });
        }
    });

    return resultados;
}

// --- HELPERS OBLIGATORIOS (RESTAURADOS) ---

function _ejecutarYValidar(idTablaConfig, idRegistro, nuevosDatos, ipCliente) {
    const resStr = w_EjecutarTransaccionSegura(idTablaConfig, idRegistro, nuevosDatos, ipCliente);
    if (!resStr) throw new Error("Servidor no respondió.");
    const res = JSON.parse(resStr);
    if (res.error) throw new Error(res.message);
    return res;
}

function UTIL_ExploradorCabeceras(sheet) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const mapa = {};
    headers.forEach((h, i) => { if (h) mapa[h.toString().trim().toUpperCase()] = i; });
    return mapa;
}

function UTIL_ToProperCase(t) {
    if (!t) return "";
    return t.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}