/**
 * @file W_UpdateXML.gs
 * @version 4.0.0
 * @description Motor Backend DTE: Respaldo PDF, Trazabilidad Contable, Matriz Config Dinámica y Duplicados..
 */

function w_updatexml_procesarIntegracion(payloadStr) {
    const correlationId = "LOTE-" + new Date().getTime();
    try {
        const activeSS = SpreadsheetApp.getActiveSpreadsheet();
        if (activeSS) {
            CONFIG.SPREADSHEET_ID = activeSS.getId();
        }

        const email = Session.getActiveUser().getEmail();
        if (!email) throw new Error("Sesión no autorizada (Zero-Trust).");

        const payload = JSON.parse(payloadStr);
        const safeIp = payload.ip || "0.0.0.0";

        const resultado = _logica_ejecutarIntegracionLote(payload.loteDTE, email, correlationId, safeIp);

        if (typeof registrarLogInterno === 'function') {
            registrarLogInterno(
                "XML_BATCH_INTEGRATION", "UPDATEXML", correlationId, "N/A",
                JSON.stringify({ docs: payload.loteDTE.length, cert: resultado.certUrl }),
                `Ingesta de Lote. Exitosos: ${resultado.successes.length}. Fallidos: ${resultado.errors.length}.`,
                safeIp
            );
        }

        return JSON.stringify({ success: true, data: resultado });
    } catch (error) {
        console.error("❌ [W_UpdateXML] Error Crítico:", error);
        return JSON.stringify({ error: true, message: error.message, ref: correlationId });
    }
}

function _logica_ejecutarIntegracionLote(loteDTE, email, correlationId, ip) {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const logTablas = [];
    const resultados = { successes: [], errors: [], certUrl: "" };

    let folder;
    try { folder = DriveApp.getFolderById(CONFIG.FOLDER_XML_BODEGA); }
    catch (e) { folder = DriveApp.getRootFolder(); }

    let htmlCertificado = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color:#1a2b4c; border-bottom: 2px solid #000;">Certificado de Ingesta Masiva DTE (ISO 22000)</h2>
        <p><b>ID Lote Transaccional:</b> ${correlationId}</p>
        <p><b>Operador Oficial:</b> ${email} / IP: ${ip}</p>
        <p><b>Fecha Operación:</b> ${new Date().toLocaleString('es-CL')}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px;">
          <tr style="background-color: #eee;">
            <th style="border: 1px solid #ccc; padding: 5px;">RUT Emisor</th>
            <th style="border: 1px solid #ccc; padding: 5px;">Razón Social</th>
            <th style="border: 1px solid #ccc; padding: 5px;">Folio</th>
            <th style="border: 1px solid #ccc; padding: 5px;">Monto Total</th>
            <th style="border: 1px solid #ccc; padding: 5px;">Estatus</th>
          </tr>`;

    // 1. CACHÉ: PROVEEDORES
    const sheetProv = ss.getSheetByName(CONFIG.DB.PROVEEDORES);
    const cProv = sheetProv ? UTIL_ExploradorCabeceras(sheetProv) : {};
    const idxRutProv = cProv['RUT_ENTIDAD'];
    const setProveedores = new Set();
    if (sheetProv && idxRutProv !== undefined) {
        sheetProv.getDataRange().getValues().forEach(r => {
            if (r[idxRutProv]) setProveedores.add(String(r[idxRutProv]).replace(/\./g, '').trim().toUpperCase());
        });
    }

    // 2. CACHÉ: ITEMS
    const sheetItems = ss.getSheetByName(CONFIG.DB.ITEMS);
    const cItems = sheetItems ? UTIL_ExploradorCabeceras(sheetItems) : {};
    const idxCodItem = cItems['SKU_INTERNO'];
    const setItems = new Set();
    if (sheetItems && idxCodItem !== undefined) {
        sheetItems.getDataRange().getValues().forEach(r => {
            if (r[idxCodItem]) setItems.add(String(r[idxCodItem]).replace(/\./g, '').trim().toUpperCase());
        });
    }

    // 3. CACHÉ GUARDIÁN: DUPLICADOS DE COMPRAS
    const sheetCompras = ss.getSheetByName(CONFIG.DB.COMPRAS);
    const cCompras = sheetCompras ? UTIL_ExploradorCabeceras(sheetCompras) : {};
    const idxRutCompras = cCompras['RUT_EMISOR'];
    const idxFolioCompras = cCompras['FOLIO'];
    const setCompras = new Set();

    if (sheetCompras && idxRutCompras !== undefined && idxFolioCompras !== undefined) {
        const dataCompras = sheetCompras.getDataRange().getValues();
        for (let i = 1; i < dataCompras.length; i++) {
            const r = dataCompras[i];
            if (r[idxRutCompras] && r[idxFolioCompras]) {
                const key = `${String(r[idxRutCompras]).replace(/\./g, '').trim().toUpperCase()}_${String(r[idxFolioCompras]).trim()}`;
                setCompras.add(key);
            }
        }
    }

    // 4. CACHÉ: MATRIZ DE UNIDADES (SYS_CONFIG)
    const sheetConfig = ss.getSheetByName(CONFIG.DB.CONFIG);
    const cConfig = sheetConfig ? UTIL_ExploradorCabeceras(sheetConfig) : {};
    const idxParamKey = cConfig['PARAM_KEY'];
    const idxParamValue = cConfig['PARAM_VALUE'];
    let matrizUnidades = {};

    if (sheetConfig && idxParamKey !== undefined && idxParamValue !== undefined) {
        const dataConfig = sheetConfig.getDataRange().getValues();
        const rowConfig = dataConfig.find(r => r[idxParamKey] === 'MATRIZ_UNIDADES');
        if (rowConfig && rowConfig[idxParamValue]) {
            try { matrizUnidades = JSON.parse(rowConfig[idxParamValue]); }
            catch (e) { console.warn("Error parseando MATRIZ_UNIDADES", e); }
        }
    }

    loteDTE.forEach(dte => {
        try {
            const rutLimpio = String(dte.rutEmisor).replace(/\./g, '').trim().toUpperCase();
            const folioStr = String(Number(dte.folio) || 0);
            const invoiceKey = `${rutLimpio}_${folioStr}`;

            if (setCompras.has(invoiceKey)) {
                throw new Error(`DOCUMENTO DUPLICADO: El Folio ${folioStr} ya está registrado.`);
            }
            setCompras.add(invoiceKey);

            const idFacturaUUID = Utilities.getUuid();
            const idTransaccionBase = `${dte.rutEmisor}_${dte.folio}`;

            const xmlBlob = Utilities.newBlob(dte.xmlRaw, 'application/xml', `DTE_${idTransaccionBase}.xml`);
            const fileXml = folder.createFile(xmlBlob);

            const razonSocialNorm = UTIL_ToProperCase(dte.razonSocial);
            const giroNorm = UTIL_ToProperCase(dte.giro);
            const direccionNorm = UTIL_ToProperCase(dte.direccion);
            const comunaNorm = UTIL_ToProperCase(dte.comuna);
            const ciudadNorm = UTIL_ToProperCase(dte.ciudad);

            const montoNetoStr = String(Number(dte.montoNeto) || 0);
            const montoExentoStr = String(Number(dte.montoExento) || 0);
            const montoIvaStr = String(Number(dte.montoIva) || 0);
            const montoOtrosStr = String(Number(dte.montoOtrosImpuestos) || 0);
            const montoTotalStr = String(Number(dte.montoTotal) || 0);
            const tipoDteStr = String(dte.tipoDTE || "33");

            // 🚀 GENERACIÓN DEL PDF DE RESPALDO VISUAL
            let htmlRespaldo = `
              <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #2c3e50; border-bottom: 2px solid #34495e; padding-bottom: 10px;">Documento Tributario Electrónico (Respaldo)</h2>
                <table style="width:100%; margin-bottom: 20px; font-size: 14px;">
                  <tr>
                    <td>
                      <strong>Razón Social:</strong> ${razonSocialNorm}<br>
                      <strong>RUT Emisor:</strong> ${rutLimpio}<br>
                      <strong>Giro:</strong> ${giroNorm}<br>
                      <strong>Dirección:</strong> ${direccionNorm}, ${comunaNorm}, ${ciudadNorm}
                    </td>
                    <td style="text-align: right; vertical-align: top;">
                      <h3 style="color: #e74c3c; margin:0;">FOLIO: ${folioStr}</h3>
                      <strong>Fecha Emisión:</strong> ${dte.fechaEmision}<br>
                      <strong>Tipo DTE:</strong> ${tipoDteStr}
                    </td>
                  </tr>
                </table>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px;">
                  <tr style="background-color: #34495e; color: white;">
                    <th style="padding: 8px; border: 1px solid #bdc3c7;">Código</th>
                    <th style="padding: 8px; border: 1px solid #bdc3c7;">Descripción / Ítem</th>
                    <th style="padding: 8px; border: 1px solid #bdc3c7;">Cantidad</th>
                    <th style="padding: 8px; border: 1px solid #bdc3c7;">Precio Unit.</th>
                  </tr>`;

            dte.items.forEach(it => {
                htmlRespaldo += `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; text-align: center;">${it.codigo}</td>
                    <td style="padding: 8px; border: 1px solid #bdc3c7;">${it.nombre}</td>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; text-align: center;">${it.cantidad} ${it.unidad}</td>
                    <td style="padding: 8px; border: 1px solid #bdc3c7; text-align: right;">$${it.precio}</td>
                  </tr>`;
            });

            htmlRespaldo += `
                </table>
                <div style="text-align: right; font-size: 14px;">
                  <p><strong>Monto Neto:</strong> $${montoNetoStr}</p>
                  ${Number(montoExentoStr) > 0 ? `<p><strong>Monto Exento:</strong> $${montoExentoStr}</p>` : ''}
                  <p><strong>IVA (19%):</strong> $${montoIvaStr}</p>
                  ${Number(montoOtrosStr) > 0 ? `<p style="color:#d35400;"><strong>Otros Impuestos/Retenciones:</strong> $${montoOtrosStr}</p>` : ''}
                  <h3 style="color: #27ae60;">MONTO TOTAL: $${montoTotalStr}</h3>
                </div>
                <hr style="margin-top: 30px;">
                <p style="font-size: 10px; color: #7f8c8d; text-align: center;">Generado automáticamente por ERP MDP PAN19 - Respaldo Visual</p>
              </div>`;

            const pdfBlob = Utilities.newBlob(htmlRespaldo, MimeType.HTML).getAs(MimeType.PDF).setName(`DTE_${idTransaccionBase}.pdf`);

            // 🚀 FIX: Declaramos filePdf y extraemos urlPdf
            const filePdf = folder.createFile(pdfBlob);
            const urlPdf = filePdf.getUrl();
            // -------------------------------------------------------------

            // 1. PIVOTE PRINCIPAL: LIBRO_COMPRAS (Mapeo exacto de Columnas)
            _ejecutarYValidar('COMPRAS', 'NUEVO', {
                ID_UUID: idFacturaUUID,
                STATUS: 'INTEGRADO',
                FECHA_EMISION: dte.fechaEmision,
                TIPO_DTE: tipoDteStr,
                FOLIO: folioStr,
                RUT_EMISOR: rutLimpio,
                RAZON_SOCIAL: razonSocialNorm,
                FECHA_RECEPCION_REAL: new Date().toISOString(),
                MONTO_NETO: montoNetoStr,
                MONTO_EXENTO: montoExentoStr,
                MONTO_IVA: montoIvaStr,
                OTROS_IMPUESTOS: montoOtrosStr,
                MONTO_TOTAL: montoTotalStr,
                OBSERVACIONES: Number(montoOtrosStr) > 0 ? "Contiene Impuestos Adicionales." : "Integración Lote.",
                ISO_VENCIMIENTO: dte.fechaVencimiento,
                ISO_ALERGENOS: String(dte.isoAlergenos || 'NO'), // 🚀 FIX: Heredado del frontend
                CONTROL_CALIDAD: 'PENDIENTE',
                ESTADO_PAGO: 'PENDIENTE',
                URL_XML_PDF: JSON.stringify({ xml: fileXml.getUrl(), pdf: urlPdf }), // 🚀 FIX: Empaquetado JSON limpio
                DETALLE_JSON: JSON.stringify(dte.items)
            }, ip, correlationId);
            logTablas.push('LIBRO_COMPRAS');

            // 2. CXP
            _ejecutarYValidar('CXP', 'NUEVO', {
                ID_CXP: Utilities.getUuid(),
                ID_FACTURA: idFacturaUUID,
                RUT_PROVEEDOR: rutLimpio,
                MONTO_DEUDA: montoTotalStr,
                ESTADO_PAGO: 'PENDIENTE',
                VENCIMIENTO: dte.fechaVencimiento
            }, ip, correlationId);
            logTablas.push('CUENTAS_POR_PAGAR');

            // 3. CAJA
            _ejecutarYValidar('CAJA', 'NUEVO', {
                ID_MOVIMIENTO: Utilities.getUuid(),
                FECHA_BANCO: new Date().toISOString(),
                TIPO: 'PROVISION_CXP',
                INSTITUCION: razonSocialNorm,
                FOLIO_VINCULADO: 'FAC-' + folioStr,
                MONTO: String(-(Number(montoTotalStr))),
                ESTADO_CONCILIACION: 'PROVISIONADO'
            }, ip, correlationId);
            logTablas.push('LIBRO_CAJA');

            // 4. PROVEEDORES
            if (idxRutProv !== undefined && !setProveedores.has(rutLimpio)) {
                _ejecutarYValidar('PROVEEDORES', 'NUEVO', {
                    ID_UUID: Utilities.getUuid(),
                    RUT_ENTIDAD: rutLimpio,
                    RAZON_SOCIAL: razonSocialNorm,
                    GIRO: giroNorm,
                    DIRECCION: direccionNorm,
                    COMUNA: comunaNorm,
                    CIUDAD: ciudadNorm,
                    TELEFONO: dte.telefono,
                    EMAIL: String(dte.correo).toLowerCase(),
                    STATUS: 'ACTIVO'
                }, ip, correlationId);
                logTablas.push('MAESTRO_PROVEEDORES');
                setProveedores.add(rutLimpio);
            }

            // 5. ITEMS Y LOTES
            dte.items.forEach((item, index) => {
                const nombreItemNorm = UTIL_ToProperCase(item.nombre);
                const skuLimpio = String(item.codigo).replace(/\./g, '').trim().toUpperCase();
                const unidadNorm = UTIL_NormalizarUnidad(item.unidad, matrizUnidades); // Uso de matriz BD
                const cantidadStr = String(Number(item.cantidad) || 0);

                if (idxCodItem !== undefined && !setItems.has(skuLimpio)) {
                    _ejecutarYValidar('ITEMS', 'NUEVO', {
                        ID_ITEM: Utilities.getUuid(),
                        SKU_INTERNO: skuLimpio,
                        NOMBRE_TECNICO: nombreItemNorm,
                        UNIDAD_MEDIDA: unidadNorm,
                        ISO_ALERGENOS: item.alergenosDetectados.length > 0 ? item.alergenosDetectados.join(', ') : 'NO',
                        RUT_PROV_PREFERENTE: rutLimpio,
                        STATUS: 'ACTIVO'
                    }, ip, correlationId);
                    logTablas.push('MAESTRO_ITEMS');
                    setItems.add(skuLimpio);
                }

                _ejecutarYValidar('LOTES', 'NUEVO', {
                    ID_UUID: Utilities.getUuid(),
                    ID_LOTE_PAN19: `${idTransaccionBase}_L${index + 1}`,
                    SKU_INTERNO: skuLimpio,
                    DTE_TIPO: tipoDteStr,
                    DTE_FOLIO: folioStr,
                    RUT_PROVEEDOR: rutLimpio,
                    CANTIDAD_ORIGINAL: cantidadStr,
                    SALDO_ACTUAL: cantidadStr,
                    FECHA_ELABORACION: new Date().toISOString()
                }, ip, correlationId);
            });
            logTablas.push('ABASTECIMIENTO_LOTES');

            resultados.successes.push(dte);
            htmlCertificado += `<tr>
                <td style="border: 1px solid #ccc; padding: 5px;">${rutLimpio}</td>
                <td style="border: 1px solid #ccc; padding: 5px;">${razonSocialNorm}</td>
                <td style="border: 1px solid #ccc; padding: 5px;">${folioStr}</td>
                <td style="border: 1px solid #ccc; padding: 5px;">$${montoTotalStr}</td>
                <td style="border: 1px solid #ccc; padding: 5px; color: green; font-weight: bold;">INTEGRADO</td>
            </tr>`;

        } catch (e) {
            resultados.errors.push({ folio: dte.folio, razonSocial: dte.razonSocial, archivo: dte.archivo, error: e.message });
            htmlCertificado += `<tr>
                <td style="border: 1px solid #ccc; padding: 5px;">${dte.rutEmisor}</td>
                <td style="border: 1px solid #ccc; padding: 5px;">${dte.razonSocial}</td>
                <td style="border: 1px solid #ccc; padding: 5px;">${dte.folio}</td>
                <td style="border: 1px solid #ccc; padding: 5px;">-</td>
                <td style="border: 1px solid #ccc; padding: 5px; color: red; font-weight: bold;">ERROR: ${e.message}</td>
            </tr>`;
        }
    });

    htmlCertificado += `</table>
      <div style="margin-top: 20px;">
        <h3>Impacto Relacional (Tablas Sincronizadas):</h3>
        <ul>${logTablas.length > 0 ? [...new Set(logTablas)].map(t => `<li>${t}</li>`).join('') : '<li style="color:red; font-weight:bold;">Ninguna tabla modificada. Operación Revertida.</li>'}</ul>
      </div>
      <hr><p style="font-size:10px; color:grey; text-align:center;">Sistema ERP PAN19 - Autenticación Zero Trust</p>
    </div>`;

    const certBlob = Utilities.newBlob(htmlCertificado, MimeType.HTML).getAs(MimeType.PDF).setName(`CERT_LOTE_${correlationId}.pdf`);
    const fileCert = folder.createFile(certBlob);

    resultados.certUrl = fileCert.getUrl();
    return resultados;
}

function _ejecutarYValidar(idTablaConfig, idRegistro, nuevosDatos, ipCliente, correlationId) {
    const resultadoStr = w_EjecutarTransaccionSegura(idTablaConfig, idRegistro, nuevosDatos, ipCliente);
    if (!resultadoStr) {
        throw new Error(`Fallo de comunicación con Core en tabla [${idTablaConfig}].`);
    }

    const resultado = JSON.parse(resultadoStr);
    if (resultado.error) {
        throw new Error(`${resultado.message || 'Error Desconocido'}`);
    }
    return resultado;
}

function UTIL_ToProperCase(texto) {
    if (!texto) return "";
    const excluidas = ['y', 'e', 'ni', 'o', 'u', 'a', 'de', 'del', 'la', 'las', 'el', 'los', 'en', 'por', 'con', 'para', 'sin'];
    return String(texto).trim().toLowerCase().split(/\s+/).map((palabra, index) => {
        if (index > 0 && excluidas.includes(palabra)) return palabra;
        return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    }).join(" ");
}

function UTIL_NormalizarUnidad(unidad, matrizDinamic) {
    if (!unidad) return 'UN';
    const u = String(unidad).replace(/\./g, '').trim().toUpperCase();

    if (matrizDinamic && Object.keys(matrizDinamic).length > 0) {
        for (const [unidadEstandar, sinonimos] of Object.entries(matrizDinamic)) {
            if (sinonimos.includes(u)) return unidadEstandar;
        }
    }

    if (['UN', 'UND', 'UNIDAD', 'UNIDADES', 'U'].includes(u)) return 'UN';
    if (['KG', 'KGS', 'KILO', 'KILOGRAMO', 'KILOGRAMOS'].includes(u)) return 'KG';
    if (['LT', 'LTS', 'LITRO', 'LITROS', 'L'].includes(u)) return 'LT';
    if (['GR', 'GRS', 'GRAMO', 'GRAMOS', 'G'].includes(u)) return 'GR';

    return u;
}