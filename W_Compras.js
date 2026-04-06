/**
 * @file W_Compras.gs
 * @description Motor de Abastecimiento Industrial. v2.0
 */

function wCompras_GuardarFactura(payload) {
    try {
        const uuidCompra = Utilities.getUuid();

        // 1. Registro en LIBRO_COMPRAS (URS-28)
        const compraObj = {
            ID_UUID: uuidCompra,
            TIMESTAMP_CREATE: new Date().toISOString(),
            USER_CREATOR: Session.getActiveUser().getEmail(),
            STATUS: 'INTEGRADO',
            FECHA_EMISION: payload.FECHA_EMISION || new Date().toISOString().split('T')[0],
            TIPO_DTE: 33,
            FOLIO: payload.FOLIO,
            RUT_EMISOR: payload.RUT_EMISOR,
            RAZON_SOCIAL: payload.RAZON_SOCIAL,
            MONTO_NETO: payload.MONTO_NETO,
            MONTO_IVA: payload.MONTO_IVA,
            MONTO_TOTAL: payload.MONTO_TOTAL,
            ISO_LOTE: payload.ISO_LOTE,
            ISO_VENCIMIENTO: payload.ISO_VENCIMIENTO,
            CONTROL_CALIDAD: 'PENDIENTE'
        };

        const writeOk = w_EjecutarTransaccionSegura(CONFIG.DB.COMPRAS, compraObj);
        if (!writeOk) throw new Error("Fallo en la integridad de escritura.");

        // 2. Provisión Contable en CUENTAS_POR_PAGAR
        const cxpObj = {
            ID_CXP: Utilities.getUuid(),
            ID_FACTURA: uuidCompra,
            RUT_PROVEEDOR: payload.RUT_EMISOR,
            MONTO_DEUDA: payload.MONTO_TOTAL,
            ESTADO_PAGO: 'PENDIENTE',
            VENCIMIENTO: payload.ISO_VENCIMIENTO
        };
        w_EjecutarTransaccionSegura(CONFIG.DB.CXP, cxpObj);

        // 3. Generación de Lote en ABASTECIMIENTO_LOTES (ISO 22000)
        const loteObj = {
            ID_UUID: Utilities.getUuid(),
            ID_LOTE_PAN19: `${payload.RUT_EMISOR}_F${payload.FOLIO}`,
            SKU_INTERNO: 'TBD',
            LOTE_PROVEEDOR: payload.ISO_LOTE,
            FECHA_CADUCIDAD: payload.ISO_VENCIMIENTO,
            ESTADO_CALIDAD: 'CUARENTENA'
        };
        w_EjecutarTransaccionSegura(CONFIG.DB.LOTES, loteObj);

        return JSON.stringify({ success: true });

    } catch (e) {
        return JSON.stringify({ success: false, message: e.message });
    }
}