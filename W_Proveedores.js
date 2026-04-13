/**
 * @file W_Proveedores.js
 * @description Backend Módulo Proveedores.
 * @architecture Zero-Trust (Uso estricto de SECRETS para BD).
 */

function w_proveedores_guardar(payloadStr, esEdicion) {
  try {
    const payload = JSON.parse(payloadStr);

    // 1. Acceso a Bóveda de Secretos (Zero-Trust)
    if (!SECRETS || !SECRETS.SPREADSHEET_ID) throw new Error("Bóveda de Secretos no disponible.");
    const ss = SpreadsheetApp.openById(SECRETS.SPREADSHEET_ID);

    // 2. Lectura de Estructura Lógica
    const nombreHoja = CONFIG.DB.PROVEEDORES;
    const sheet = ss.getSheetByName(nombreHoja);
    if (!sheet) throw new Error(`La hoja maestra ${nombreHoja} no existe en la base de datos.`);

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Encontrar índices de columnas dinámicamente
    const idxRUT = headers.indexOf('RUT_ENTIDAD');
    if (idxRUT === -1) throw new Error("Estructura corrupta: Columna RUT_ENTIDAD no encontrada.");

    if (esEdicion) {
      // Flujo de Actualización (UPDATE)
      let filaEncontrada = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idxRUT]).trim() === payload.RUT_ENTIDAD) {
          filaEncontrada = i + 1; // +1 porque Array es 0-index y Sheet es 1-index
          break;
        }
      }
      if (filaEncontrada === -1) throw new Error("Registro no encontrado para edición.");

      const updateArray = headers.map(header => {
        // Preservamos DATOS_BANCARIOS si no vienen en el payload (se manejan en otro sub-módulo)
        if (header === 'DATOS_BANCARIOS') return data[filaEncontrada - 2][headers.indexOf(header)];
        return payload[header] !== undefined ? payload[header] : data[filaEncontrada - 2][headers.indexOf(header)];
      });

      sheet.getRange(filaEncontrada, 1, 1, headers.length).setValues([updateArray]);
      w_registrarAuditoriaZeroTrust(payload.RUT_ENTIDAD, "UPDATE_PROVEEDOR", `Actualización Perfil Proveedor`, "PROVEEDORES");

    } else {
      // Flujo de Creación (INSERT)
      // Evitar duplicidad
      const duplicado = data.some((row, i) => i > 0 && String(row[idxRUT]).trim() === payload.RUT_ENTIDAD);
      if (duplicado) throw new Error("El RUT de este proveedor ya existe en el Maestro.");

      const insertArray = headers.map(header => payload[header] !== undefined ? payload[header] : "");
      sheet.appendRow(insertArray);
      w_registrarAuditoriaZeroTrust(payload.RUT_ENTIDAD, "CREATE_PROVEEDOR", `Alta de nuevo proveedor`, "PROVEEDORES");
    }

    return JSON.stringify({ error: false, message: "OK" });

  } catch (e) {
    console.error("[Backend Prov] Error:", e.message);
    return JSON.stringify({ error: true, message: e.message });
  }
}