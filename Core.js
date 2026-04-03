/**
* @file Core.gs
* @description Punto de entrada HTTP y Motor Backend URS-28. v5.0.0
* @arquitectura Memory-First / Única Fuente de Verdad / Escritura Universal
* @cumplimiento ISO 22000 / SII Chile (Trazabilidad Forense SHA-256)
*/

/**
* ============================================================================
* 0. DESPLIEGUE HTTP (FRONTEND SERVING)
* ============================================================================
*/
function doGet(e) {
  try {
    const template = HtmlService.createTemplateFromFile('Index');
    template.APP_VERSION = (typeof CONFIG !== 'undefined' && CONFIG.VERSION) ? CONFIG.VERSION : "4.0.0";
   
    return template.evaluate()
      .setTitle(CONFIG.APP_NAME || "ERP MDP - PAN19")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (error) {
    console.error("[PGA] Fallo Crítico en doGet:", error);
    return HtmlService.createHtmlOutput(`
      <body style="background:#1a1a1a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">
        <div style="border:1px solid red;padding:2rem;border-radius:1rem;background:#000">
          <h2 style="color:red">⚠️ Error 500: Núcleo Detenido</h2>
          <code>${error.message}</code>
        </div>
      </body>`);
  }
}

function include(filename) {
  try {
    return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
  } catch (error) {
    console.error(`[PGA] Error crítico al inyectar módulo: ${filename}`, error);
    return ``;
  }
}

/**
* ============================================================================
* 1. GUARDIÁN ZERO TRUST (RBAC EN VIVO)
* ============================================================================
*/
function w_verificarEstadoSesion(moduloRequerido) {
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) return false;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetUsers = ss.getSheetByName(CONFIG.DB.USUARIOS);
    const dataUsers = sheetUsers.getDataRange().getValues();
    const headUsers = dataUsers[0].map(h => String(h).trim().toUpperCase());
    
    const idxEmail = headUsers.indexOf('EMAIL');
    const idxStatus = headUsers.indexOf('STATUS');
    const idxRol = headUsers.indexOf('NIVEL_ACCESO');

    let userRow = dataUsers.find(r => r[idxEmail] === email);
    if (!userRow || userRow[idxStatus] !== 'ACTIVO') return false;

    if (!moduloRequerido) return true;

    // Validación de Permisos (Matriz de Roles)
    const sheetRoles = ss.getSheetByName(CONFIG.DB.ROLES);
    const dataRoles = sheetRoles.getDataRange().getValues();
    const headRoles = dataRoles[0].map(h => String(h).trim().toUpperCase());
    const idxIdRol = headRoles.indexOf('ID_ROL');
    const idxPermisos = headRoles.indexOf('PERMISOS_JSON');

    const rolRow = dataRoles.find(r => String(r[idxIdRol]) === String(userRow[idxRol]));
    if (!rolRow) return false;

    const permisosArr = JSON.parse(rolRow[idxPermisos] || '[]');
    return permisosArr.includes('*') || permisosArr.includes(moduloRequerido);
  } catch (e) {
    console.error("❌ Error en Guardián Backend:", e);
    return false;
  }
}

/**
* ============================================================================
* 2. MOTOR DE ESCRITURA UNIVERSAL Y DIFERENCIAS (DIFF ENGINE)
* ============================================================================
*/

/**
 * @function w_EjecutarTransaccionSegura
 * @description Motor Universal Calibrado para cualquier Llave Primaria (ID o PARAM_KEY)
 * @param {string} idTablaConfig - ID de tabla en CONFIG.DB
 * @param {string} idRegistro - Valor de la llave a buscar (o 'NUEVO')
 * @param {Object} nuevosDatos - Datos a escribir
 * @param {string} ipCliente - IP capturada desde el frontend
 */
function w_EjecutarTransaccionSegura(idTablaConfig, idRegistro, nuevosDatos, ipCliente) {
  const LOCK = LockService.getScriptLock();
  try {
    if (!w_verificarEstadoSesion()) {
      return JSON.stringify({ error: true, tipo: 'FATAL_AUTH', mensaje: 'Sesión no autorizada.' });
    }

    LOCK.waitLock(15000);
    const nombreHoja = CONFIG.DB[idTablaConfig];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(nombreHoja);

    const fullData = sheet.getDataRange().getValues();
    const cabeceras = fullData[0].map(h => String(h).trim().toUpperCase());
    
    // 🚀 NO-HEURÍSTICA: La llave es la columna 0, se llame como se llame.
    const nombreLlavePrimaria = cabeceras[0]; 

    let filaIndex = -1;
    let datosAnteriores = {};

    // Búsqueda proactiva por la Llave Primaria definida en la hoja
    if (idRegistro !== 'NUEVO') {
      for (let i = 1; i < fullData.length; i++) {
        if (String(fullData[i][0]) === String(idRegistro)) {
          filaIndex = i + 1;
          cabeceras.forEach((h, idx) => { datosAnteriores[h] = fullData[i][idx]; });
          break;
        }
      }
    }

    // DIFF ENGINE
    const diff = { anterior: {}, nuevo: {} };
    let hayCambios = false;
    cabeceras.forEach(h => {
      if (nuevosDatos.hasOwnProperty(h)) {
        const valViejo = String(datosAnteriores[h] || "");
        const valNuevo = String(nuevosDatos[h] || "");
        if (valViejo !== valNuevo) {
          diff.anterior[h] = valViejo;
          diff.nuevo[h] = valNuevo;
          hayCambios = true;
        }
      }
    });

    if (!hayCambios && idRegistro !== 'NUEVO') return JSON.stringify({ success: true, noChange: true });

    // CONSTRUCCIÓN DE FILA
    const filaFinal = cabeceras.map(h => {
      if (h === 'TIMESTAMP_UPDATE') return new Date().toISOString();
      if (h === 'USER_UPDATER') return Session.getActiveUser().getEmail();
      if (h === 'TIMESTAMP_CREATE' && idRegistro === 'NUEVO') return new Date().toISOString();
      if (h === 'USER_CREATOR' && idRegistro === 'NUEVO') return Session.getActiveUser().getEmail();
      return nuevosDatos.hasOwnProperty(h) ? nuevosDatos[h] : (datosAnteriores[h] || "");
    });

    // ESCRITURA
    if (idRegistro === 'NUEVO') {
      sheet.appendRow(filaFinal);
    } else {
      sheet.getRange(filaIndex, 1, 1, cabeceras.length).setValues([filaFinal]);
    };

    return JSON.stringify({ success: true, diff: diff });
  } catch (e) {
    return JSON.stringify({ error: true, message: e.message });
  } finally {
    LOCK.releaseLock();
  }
}

// Actualización de registrarLogInterno para aceptar la IP enviada
function registrarLogInterno(accion, modulo, idEntidad, anterior, nuevo, detalles, ipAddress) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.DB.AUDIT_LOG);
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    const U = CONFIG.URS_AUDIT;
    const row = [];
    
    // 1. Eslabón de la cadena
    let hashPrevio = "GENESIS_BLOCK";
    if (lastRow > 1) {
      hashPrevio = sheet.getRange(lastRow, U.HASH_RECORD + 1).getValue() || "EMPTY_PREV";
    }

    // 2. Validación de IP: Si no viene del cliente, marcamos error de origen
    const ipFinal = (ipAddress && ipAddress !== "0.0.0.0") ? ipAddress : "ORIGIN_NOT_CAPTURED";

    row[U.ID_LOG]         = Utilities.getUuid();
    row[U.TIMESTAMP]      = new Date().toISOString();
    row[U.USER_EMAIL]     = Session.getActiveUser().getEmail();
    row[U.ACTION_TYPE]    = accion;
    row[U.MODULO]         = modulo;
    row[U.ENTIDAD_ID]     = idEntidad;
    row[U.VALOR_ANTERIOR] = anterior;
    row[U.VALOR_NUEVO]    = nuevo;
    row[U.IP_ADDRESS]     = ipFinal; // 🚀 AQUÍ SE GUARDA LA IP REAL
    row[U.DETALLES]       = detalles;
    row[U.HASH_PREVIOUS]  = hashPrevio;

    const rawContent = row[U.TIMESTAMP] + row[U.USER_EMAIL] + accion + idEntidad + nuevo + hashPrevio;
    const signature  = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawContent, Utilities.Charset.UTF_8);
    row[U.HASH_RECORD]    = signature.map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');

    sheet.appendRow(row);
  } catch (e) {
    console.error("Error en Auditoría:", e);
  }
}

/**
* ============================================================================
* 3. MOTOR DE HIDRATACIÓN (BATCH GET SERVICE)
* ============================================================================
*/
function getDatabaseCompleta() {
  const LOCK = LockService.getScriptLock();
  try {
    LOCK.waitLock(5000);
    const userEmail = Session.getActiveUser().getEmail();
    if (!userEmail) throw new Error("Sesión Inválida");

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const spreadsheetId = ss.getId();
    const nombresPestañas = Object.values(CONFIG.DB);

    // Uso del servicio Sheets para lectura ultra-rápida
    const response = Sheets.Spreadsheets.Values.batchGet(spreadsheetId, {
      ranges: nombresPestañas,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING'
    });

    const dbSaneada = {};
    response.valueRanges.forEach((rangoData, index) => {
      dbSaneada[nombresPestañas[index]] = rangoData.values || [];
    });

    return JSON.stringify(dbSaneada);
  } catch (error) {
    return JSON.stringify({ error: true, message: error.message });
  } finally {
    LOCK.releaseLock();
  }
}

/**
* ============================================================================
* 4. AUDITORÍA FORENSE (ISO 22000)
* ============================================================================
 * @function registrarLogInterno
 * @description Escribe en SYS_AUDIT_LOG con encadenamiento de Hash (Forensic Chain)
 */
function registrarLogInterno(accion, modulo, idEntidad, anterior, nuevo, detalles, ipAddress) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('SYS_AUDIT_LOG');
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    // Mapeo manual si CONFIG.URS_AUDIT no está disponible o para asegurar orden
    // ID_LOG[0], TIMESTAMP[1], USER_EMAIL[2], ACTION_TYPE[3], MODULO[4], ENTIDAD_ID[5], 
    // VALOR_ANTERIOR[6], VALOR_NUEVO[7], IP_ADDRESS[8], DETALLES[9], HASH_RECORD[10], HASH_PREVIOUS[11]

    let hashPrevio = "GENESIS_BLOCK";
    if (lastRow > 1) {
      // Asumimos que HASH_RECORD es la columna 11 (K) -> índice 10
      hashPrevio = sheet.getRange(lastRow, 11).getValue() || "EMPTY_PREV";
    }

    const ipFinal = (ipAddress && ipAddress !== "0.0.0.0" && ipAddress !== "CAPTURANDO...") 
                    ? ipAddress : "ORIGIN_NOT_CAPTURED";

    const row = [];
    row[0]  = Utilities.getUuid();
    row[1]  = new Date().toISOString();
    row[2]  = Session.getActiveUser().getEmail() || "SISTEMA";
    row[3]  = accion;
    row[4]  = modulo;
    row[5]  = idEntidad;
    row[6]  = anterior || "N/A";
    row[7]  = nuevo || "N/A";
    row[8]  = ipFinal; 
    row[9]  = detalles;
    row[11] = hashPrevio;

    // 🔐 GENERACIÓN DE FIRMA DIGITAL
    const rawContent = row[1] + row[2] + accion + idEntidad + (nuevo || "N/A") + hashPrevio;
    const signature  = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawContent, Utilities.Charset.UTF_8);
    row[10] = signature.map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');

    sheet.appendRow(row);
    return true;
  } catch (e) {
    console.error("Error en Auditoría:", e);
    return false;
  }
}

// PUENTES PARA EL FRONTEND
function w_obtenerDataMaestra() { return JSON.parse(getDatabaseCompleta()); }
function w_getSystemTelemetry() { 
  return JSON.stringify({
    success: true,
    version: CONFIG.VERSION,
    env: CONFIG.ENV,
    appName: CONFIG.APP_NAME,
    norma1: CONFIG.COMPLIANCE.NORMA_1,
    norma2: CONFIG.COMPLIANCE.NORMA_2,
    arch: CONFIG.ARCHITECTURE
  });
}

function w_registrarAuditoriaFrontend(acc, mod, id, det, ant, nvo) {
  // Nota: El frontend puede enviar la IP en el campo 'det' o podemos extraerla de SISTEMA_ERP
  return registrarLogInterno(acc, mod, id, ant, nvo, det, "FRONTEND_REQUEST");
}

/**
 * @function w_verificarIntegridadLogs
 * @description Verifica el encadenamiento de hashes SHA-256 en la hoja de auditoría.
 */
function w_verificarIntegridadLogs() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("SYS_AUDIT_LOG");
    const values = sheet.getDataRange().getValues();
    // Headers: [0]ID_LOG, [1]TIMESTAMP, [2]USER_EMAIL, [3]ACTION_TYPE, [4]MODULO, [5]ENTIDAD_ID, [6]VALOR_ANTERIOR, [7]VALOR_NUEVO, [8]IP_ADDRESS, [9]HASH_RECORD
    
    let hashPrevio = "GENESIS_BLOCK";
    
    for (let i = 1; i < values.length; i++) {
      const r = values[i];
      const hashActual = r[9];
      
      // Re-calculamos el hash de la fila
      const content = r[1] + r[2] + r[3] + r[5] + r[7] + hashPrevio;
      const signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, content, Utilities.Charset.UTF_8);
      const hashCalculado = signature.map(byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
      
      if (hashCalculado !== hashActual) {
        return JSON.stringify({ integro: false, idRuptura: r[0] });
      }
      hashPrevio = hashActual;
    }
    
    return JSON.stringify({ integro: true, analizados: values.length - 1 });
  } catch (e) {
    return JSON.stringify({ error: true, message: e.message });
  }
}

/**
 * @function w_registrarLogForense
 * @description Puente para el módulo S_Sesion. Usa el motor de Hash Interno.
 */
function w_registrarLogForense(motivo, modulo, id, detalles, ip) {
  // 🚀 Redirigimos al motor que sí tiene SHA-256 para no duplicar lógica
  return registrarLogInterno(motivo, modulo, id, "N/A", "N/A", detalles, ip);
}
