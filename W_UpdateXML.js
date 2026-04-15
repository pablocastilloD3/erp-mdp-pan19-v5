/**
 * @file W_CxP.gs
 * @version 5.8.0 - SOLUCIÓN DEFINITIVA DE CONEXIÓN Y DUPLICADOS
 */
function w_cxp_autorizarPagoFinal(registroCxP, ip) {
    const usuario = Session.getActiveUser().getEmail();

    try {
        // 1. PREVENCIÓN DE DUPLICADOS (ESCUDO ANTIFRAUDE)
        // Obtenemos los datos actuales de la tabla CAJA para verificar si el ID_CXP ya existe
        const db = getDatabaseCompleta();
        const nombreHojaCaja = CONFIG.DB.CAJA; // "LIBRO_CAJA"
        const registrosCaja = db[nombreHojaCaja] || [];

        // Buscamos si el ID_CXP ya fue usado como FOLIO_VINCULADO en Caja
        const yaPagado = registrosCaja.some(mov => String(mov.FOLIO_VINCULADO) === String(registroCxP.ID_CXP));

<<<<<<< HEAD
        if (yaPagado) {
            return JSON.stringify({
                success: false,
                message: "BLOQUEO: Esta factura ya tiene un egreso registrado en Caja. No se permiten duplicados."
=======
        const resultado = _logica_ejecutarIntegracionLote(payload.loteDTE, email, correlationId, safeIp);

        if (typeof registrarLogInterno === 'function') {
            registrarLogInterno(
                "XML_BATCH_INTEGRATION", "UPDATEXML", correlationId, "N/A",
                JSON.stringify({ docs: payload.loteDTE.length, cert: resultado.certUrl }),
                `Ingesta Blindada v5.3.4. Filtros de duplicidad activos.`,
                safeIp
            );
        }

        return JSON.stringify({ success: true, data: resultado });
    } catch (error) {
        console.error("❌ [W_UpdateXML] Error Crítico:", error);
        return JSON.stringify({ error: true, message: error.message, ref: correlationId });
    }
}

function _ejecutarYValidar(idTablaConfig, idRegistro, nuevosDatos, ipCliente) {
    const resStr = w_EjecutarTransaccionSegura(idTablaConfig, idRegistro, nuevosDatos, ipCliente);
    if (!resStr) throw new Error(`Fallo de comunicación con Core en tabla [${idTablaConfig}].`);

    const res = JSON.parse(resStr);
    if (res.error) throw new Error(`${idTablaConfig}: ${res.message}`);
    return res;
}

/** * ============================================================================
 * [SCOPE: CORE_LOGIC] - Motor de Integración con Filtros de Duplicidad
 * ============================================================================
 */

function _logica_ejecutarIntegracionLote(loteDTE, email, correlationId, ip) {
    const ss = SpreadsheetApp.openById(SECRETS.SPREADSHEET_ID);
    const resultados = { successes: [], errors: [], certUrl: "" };
    const folder = DriveApp.getFolderById(SECRETS.FOLDER_XML_BODEGA) || DriveApp.getRootFolder();

    // 🛡️ 1. CARGA DE CACHÉS DE DUPLICIDAD (Memory-First)
    // Cache Compras (RUT + FOLIO)
    const setCompras = new Set(ss.getSheetByName(CONFIG.DB.COMPRAS).getDataRange().getValues().slice(1).map(r => `${String(r[9]).replace(/\./g, '').trim().toUpperCase()}_${String(r[8]).trim()}`));
    // Cache Proveedores (RUT_ENTIDAD)
    const setProveedores = new Set(ss.getSheetByName(CONFIG.DB.PROVEEDORES).getDataRange().getValues().slice(1).map(r => String(r[4]).replace(/\./g, '').trim().toUpperCase()));
    // Cache Items (SKU_INTERNO)
    const setItems = new Set(ss.getSheetByName(CONFIG.DB.ITEMS).getDataRange().getValues().slice(1).map(r => String(r[4]).trim().toUpperCase()));
    // Cache Lotes (ID_LOTE_PAN19)
    const setLotes = new Set(ss.getSheetByName(CONFIG.DB.LOTES).getDataRange().getValues().slice(1).map(r => String(r[1]).trim().toUpperCase()));

    const cssCarta = `<style>@page { size: letter; margin: 1.2cm; } body { font-family: 'Helvetica', sans-serif; font-size: 10px; } .sii-box { border: 3px solid #FF0000; padding: 10px; color: #FF0000; text-align: center; font-weight: bold; } .table-detalle { width: 100%; border-collapse: collapse; margin-top: 15px; } .table-detalle th { background: #eee; border: 1px solid #ccc; padding: 5px; } .table-detalle td { border: 1px solid #ccc; padding: 5px; } .totales-box { width: 40%; margin-left: 60%; margin-top: 15px; }</style>`;

    loteDTE.forEach(dte => {
        try {
            const rutL = String(dte.rutEmisor).replace(/\./g, '').trim().toUpperCase();
            const folio = String(Number(dte.folio));
            const purchaseKey = `${rutL}_${folio}`;

            // 🚫 FILTRO 1: DUPLICIDAD EN LIBRO_COMPRAS
            if (setCompras.has(purchaseKey)) throw new Error(`DOCUMENTO YA REGISTRADO (Folio: ${folio})`);

            const uuidComp = Utilities.getUuid();
            const rSocial = UTIL_ToProperCase(dte.razonSocial);
            const idDoc = `${rutL}_F${folio}`;

            // 📂 GENERACIÓN DE DOCUMENTACIÓN SII (CARTA)
            const fileXml = folder.createFile(Utilities.newBlob(dte.xmlRaw, 'application/xml', `DTE_${idDoc}.xml`));
            let htmlSII = `<html><head>${cssCarta}</head><body><div style="width:100%; border-bottom:2px solid #000; padding-bottom:10px;"><table style="width:100%;"><tr><td><h2>${rSocial}</h2><p>${dte.giro}<br>${dte.direccion}, ${dte.comuna}</p></td><td style="width:35%;"><div class="sii-box">R.U.T.: ${rutL}<br>FACTURA ELECTRÓNICA<br>N° ${folio}</div></td></tr></table></div><div style="margin:15px 0;"><b>RECEPTOR:</b> ${CONFIG.APP_NAME}<br><b>EMISIÓN:</b> ${dte.fechaEmision} | <b>VENCIMIENTO:</b> ${dte.fechaVencimiento}</div><table class="table-detalle"><thead><tr><th>SKU</th><th>DESCRIPCIÓN</th><th>CANT.</th><th>P. UNIT.</th><th>TOTAL</th></tr></thead><tbody>${dte.items.map(it => `<tr><td>${it.codigo}</td><td>${it.nombre}</td><td style="text-align:center;">${it.cantidad} ${it.unidad}</td><td style="text-align:right;">$${Number(it.precio).toLocaleString('es-CL')}</td><td style="text-align:right;">$${(Number(it.cantidad) * Number(it.precio)).toLocaleString('es-CL')}</td></tr>`).join('')}</tbody></table><table class="totales-box"><tr><td>Neto:</td><td style="text-align:right;">$${Number(dte.montoNeto).toLocaleString('es-CL')}</td></tr><tr><td>IVA (19%):</td><td style="text-align:right;">$${Number(dte.montoIva).toLocaleString('es-CL')}</td></tr>${Number(dte.montoOtrosImpuestos) > 0 ? `<tr><td>Otros (12%):</td><td style="text-align:right;">$${Number(dte.montoOtrosImpuestos).toLocaleString('es-CL')}</td></tr>` : ''}<tr><td style="font-weight:bold; border-top:1px solid #000;">TOTAL:</td><td style="font-weight:bold; border-top:1px solid #000; text-align:right;">$${Number(dte.montoTotal).toLocaleString('es-CL')}</td></tr></table></body></html>`;
            const filePdf = folder.createFile(Utilities.newBlob(htmlSII, 'text/html', `PDF_${idDoc}.html`).getAs('application/pdf').setName(`RESPALDO_${idDoc}.pdf`));
            const urls = { xml: fileXml.getUrl(), pdf: filePdf.getUrl() };

            // 🛡️ FILTRO 2: DUPLICIDAD EN MAESTRO_PROVEEDORES
            if (!setProveedores.has(rutL)) {
                _ejecutarYValidar('PROVEEDORES', 'NUEVO', {
                    ID_UUID: Utilities.getUuid(), STATUS: 'ACTIVO', RUT_ENTIDAD: rutL, RAZON_SOCIAL: rSocial,
                    GIRO: String(dte.giro || '').toUpperCase(), ACTECO: dte.acteco, DIRECCION: dte.direccion,
                    COMUNA: dte.comuna, CIUDAD: dte.ciudad, EMAIL: dte.email, TELEFONO: dte.telefono,
                    ISO_RIESGO: 'EVALUACION', PERFIL_JSON: JSON.stringify({ proveedor_items: true })
                }, ip);
                setProveedores.add(rutL);
            }

            // 📝 PERSISTENCIA EN LIBRO_COMPRAS (INYECCIÓN DE CAMPOS ISO/CALIDAD AQUÍ)
            _ejecutarYValidar('COMPRAS', 'NUEVO', {
                ID_UUID: uuidComp, STATUS: 'INTEGRADO', FECHA_EMISION: dte.fechaEmision, TIPO_DTE: dte.tipoDTE, FOLIO: folio,
                RUT_EMISOR: rutL, RAZON_SOCIAL: rSocial, MONTO_NETO: dte.montoNeto, MONTO_EXENTO: dte.montoExento,
                MONTO_IVA: dte.montoIva, OTROS_IMPUESTOS: dte.montoOtrosImpuestos, MONTO_TOTAL: dte.montoTotal,
                SII_FCT_PROP: dte.siiFctProp, SOURCE_APP: dte.sourceApp, CATEGORY_FLOW: dte.categoryFlow,
                URL_XML_PDF: JSON.stringify(urls), DETALLE_JSON: JSON.stringify(dte.items),

                // --- ALINEACIÓN CALIDAD Y TRAZABILIDAD (VINCULACIÓN URS-28) ---
                FECHA_RECEPCION_REAL: '', // De quedar vacío (Evita error de trazabilidad por usar fecha de ingreso)
                ISO_LOTE: `${rutL}_F${folio}_L1`, // Hereda de ABASTECIMIENTO_LOTES
                ISO_VENCIMIENTO: dte.fechaVencimiento || '', // De quedar vacío si no existe (Evita fecha ingreso)
                ISO_ALERGENOS: dte.isoAlergenos || 'NO', // Registra SI/NO
                ISO_RIESGO_PROV: 'EVALUACION', // Inicia en EVALUACION
                CONTROL_CALIDAD: 'PENDIENTE', // Inicia en PENDIENTE
                ESTADO_PAGO: 'PENDIENTE' // Inicia en PENDIENTE
            }, ip);

            // 📦 ITEMS Y LOTES
            dte.items.forEach((it, idx) => {
                const skuL = String(it.codigo).trim().toUpperCase();
                const loteId = `${rutL}_F${folio}_L${idx + 1}`;

                // 🛡️ FILTRO 3: DUPLICIDAD EN MAESTRO_ITEMS
                if (!setItems.has(skuL)) {
                    // Evaluación dinámica: Asume 'NO' si es Factura Exenta (34) o no trae IVA, de lo contrario 'SI'
                    const afectoIva = (String(dte.tipoDTE) === '34' || Number(dte.montoIva) === 0) ? 'NO' : 'SI';

                    _ejecutarYValidar('ITEMS', 'NUEVO', {
                        ID_ITEM: Utilities.getUuid(), STATUS: 'ACTIVO', SKU_INTERNO: skuL,
                        NOMBRE_TECNICO: UTIL_ToProperCase(it.nombre), UNIDAD_MEDIDA: it.unidad,
                        RUT_PROV_PREFERENTE: rutL, ISO_ALERGENOS: dte.isoAlergenos || 'PENDIENTE',
                        AFECTO_IVA: afectoIva // <--- CAMPO AÑADIDO
                    }, ip);
                    setItems.add(skuL);
                }

                // 🛡️ FILTRO 4: DUPLICIDAD EN ABASTECIMIENTO_LOTES
                if (!setLotes.has(loteId)) {
                    _ejecutarYValidar('LOTES', 'NUEVO', {
                        ID_UUID: Utilities.getUuid(), ID_LOTE_PAN19: loteId, SKU_INTERNO: skuL,
                        DTE_TIPO: dte.tipoDTE, DTE_FOLIO: folio, RUT_PROVEEDOR: rutL,
                        CANTIDAD_ORIGINAL: it.cantidad, SALDO_ACTUAL: it.cantidad, ESTADO_CALIDAD: 'CUARENTENA'
                    }, ip);
                    setLotes.add(loteId);
                }
>>>>>>> 0f75e4e55ead7639d6727a73caba0731f0d3bc5c
            });
        }

        // 2. PREPARACIÓN DEL ASIENTO (URS-10)
        const idTransaccion = "PAGO-" + Utilities.getUuid().substring(0, 8).toUpperCase();
        const filaCaja = {
            "ID_MOVIMIENTO": idTransaccion,
            "FECHA_BANCO": new Date(),
            "INSTITUCION": "AUT_CXP",
            "DESCRIPCION_BANCO": "PAGO RUT: " + registroCxP.RUT_PROVEEDOR,
            "TIPO": "EGRESO",
            "MONTO": -Math.abs(Number(registroCxP.MONTO_DEUDA)),
            "ESTADO_CONCILIACION": "PROVISIONADO",
            "FOLIO_VINCULADO": registroCxP.ID_CXP,
            "FECHA_SISTEMA": new Date(),
            "USUARIO_SYNC": usuario
        };

        // 3. IMPACTO EN CAJA (Usando la llave 'CAJA', no el nombre de la hoja)
        // El motor buscará CONFIG.DB['CAJA'] y encontrará "LIBRO_CAJA"
        const resCaja = w_EjecutarTransaccionSegura('CAJA', 'NUEVO', filaCaja, ip);
        if (JSON.parse(resCaja).error) throw new Error("Fallo en Caja: " + JSON.parse(resCaja).message);

        // 4. ACTUALIZACIÓN EN CxP (Usando la llave 'CXP')
        // Esto resuelve el error de "Tabla no registrada en CONFIG.DB"
        const datosUpdate = { ...registroCxP };
        datosUpdate["ESTADO_PAGO"] = "PAGADO";
        datosUpdate["TIMESTAMP_UPDATE"] = new Date();

        const resCxP = w_EjecutarTransaccionSegura('CXP', registroCxP.ID_CXP, datosUpdate, ip);
        if (JSON.parse(resCxP).error) throw new Error("Fallo en CxP: " + JSON.parse(resCxP).message);

        return JSON.stringify({ success: true, ref: idTransaccion });

    } catch (e) {
        console.error("🚨 ERROR W_CxP:", e.toString());
        return JSON.stringify({ success: false, message: e.toString() });
    }
}