/**
 * @file W_Items.gs
 * @version 6.0.1
 * @project ERP MDP PAN19 - Sistema de Gestión Industrial
 * @author Murphy - Arquitecto PMDC
 * @compliance ISO 22000 / SII Chile / URS-28
 * @description Motor de persistencia y cumplimiento para el Maestro de Items.
 */

/** * ============================================================================
 * [SCOPE: CONFIG] - Parámetros Locales del Módulo
 * ============================================================================
 */
const ITEMS_CFG = {
    ID_TABLA: 'ITEMS',          // Mapeo en CONFIG.DB
    PK: 'SKU_INTERNO',          // Llave Primaria
    LOG_MODULO: 'MAESTRO_ITEMS'
};

/** * ============================================================================
 * [SCOPE: DATA_ACCESS] - Puentes Públicos (API)
 * ============================================================================
 */

/**
 * Función central de despacho para el guardado de Items.
 * @param {Object} payload - Datos provenientes del formulario S_Items.
 * @param {string} ipCliente - IP capturada para trazabilidad forense.
 */
function w_items_guardarItem(payload, ip) {
    try {
        const email = Session.getActiveUser().getEmail();
        if (!email) throw new Error("Sesión no autorizada.");

        // [SCOPE: CORE_LOGIC] - Saneamiento
        if (!payload.ID_ITEM || payload.ID_ITEM === '') {
            payload.ID_ITEM = Utilities.getUuid();
            payload.STATUS = "ACTIVO";
        }
        if (typeof payload.FICHA_TECNICA_JSON === 'object') {
            payload.FICHA_TECNICA_JSON = JSON.stringify(payload.FICHA_TECNICA_JSON);
        }

        const idKey = payload._esEdicion ? payload[ITEMS_CFG.PK] : 'NUEVO';

        // Transacción Segura vía Motor Universal
        const res = JSON.parse(w_EjecutarTransaccionSegura(ITEMS_CFG.ID_TABLA, idKey, payload, ip));
        if (res.error) throw new Error(res.message);

        // [SCOPE: COMPLIANCE] - Registro Forense
        registrarLogInterno(
            payload._esEdicion ? 'ITEM_UPDATE' : 'ITEM_CREATE',
            'MAESTRO_ITEMS',
            payload[ITEMS_CFG.PK],
            JSON.stringify(res.diff?.anterior || 'N/A'),
            JSON.stringify(res.diff?.nuevo || 'N/A'),
            'Sello de integridad SHA-256 aplicado',
            ip
        );

        return JSON.stringify({ success: true });
    } catch (e) {
        return JSON.stringify({ error: true, message: e.message });
    }
}

/** * ============================================================================
 * [SCOPE: CORE_LOGIC] - Procesamiento de Reglas de Negocio
 * ============================================================================
 */

/**
 * Prepara el objeto para la persistencia inmutable.
 * @private
 */
function _logic_saneamientoPreVuelo(p) {
    // Asegurar integridad de UUID para nuevos registros
    if (!p.ID_ITEM || p.ID_ITEM === '' || p.ID_ITEM === 'AUTO') {
        p.ID_ITEM = Utilities.getUuid();
        p.STATUS = "ACTIVO";
    }

    // Normalización de Ficha Nutricional (URS Memory-First)
    // Se recibe como objeto y se persiste como String JSON para la celda
    if (p.FICHA_TECNICA_JSON && typeof p.FICHA_TECNICA_JSON === 'object') {
        p.FICHA_TECNICA_JSON = JSON.stringify(p.FICHA_TECNICA_JSON);
    }

    // Saneamiento de tipos de datos
    p.STOCK_MINIMO = parseFloat(p.STOCK_MINIMO) || 0;
    p.STOCK_MAXIMO = parseFloat(p.STOCK_MAXIMO) || 0;
    p.ISO_VIDA_UTIL_DIAS = parseInt(p.ISO_VIDA_UTIL_DIAS) || 0;

    return p;
}

/** * ============================================================================
 * [SCOPE: COMPLIANCE] - Trazabilidad y Seguridad (ISO 22000)
 * ============================================================================
 */

/**
 * Inyecta el registro en el SYS_AUDIT_LOG con encadenamiento SHA-256.
 * @private
 */
function _compliance_registrarMutacionForense(datos, diff, ip, ref) {
    const accion = datos._esEdicion ? 'ITEM_UPDATE' : 'ITEM_CREATE';

    registrarLogInterno(
        accion,
        ITEMS_CFG.LOG_MODULO,
        datos[ITEMS_CFG.PK],
        JSON.stringify(diff?.anterior || 'N/A'),
        JSON.stringify(diff?.nuevo || 'N/A'),
        `Mutación de SKU bajo estándar ISO 22000. Ref: ${ref}`,
        ip
    );
}