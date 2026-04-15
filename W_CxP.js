/**
 * @file W_CxP.gs
 * @version 5.8.1 - VALIDACIÓN GATEKEEPER
 */
function w_cxp_autorizarPagoFinal(registroCxP, ip) {
    const usuario = Session.getActiveUser().getEmail();
    try {
        const db = getDatabaseCompleta();

        // 1. VALIDACIÓN GATEKEEPER (ISO 22000)
        const dte = (db[CONFIG.DB.COMPRAS] || []).find(c => c.ID_UUID === registroCxP.ID_FACTURA);
        if (dte) {
            const cal = String(dte.CONTROL_CALIDAD || '').trim().toUpperCase();
            if (cal === 'PENDIENTE') return JSON.stringify({ success: false, message: "Bloqueo: Factura pendiente de Calidad." });
            if (cal === 'RECHAZADO') return JSON.stringify({ success: false, message: "Bloqueo: Lote rechazado por Calidad." });
        }

        // 2. PREVENCIÓN DUPLICADOS
        const yaPagado = (db[CONFIG.DB.CAJA] || []).some(m => String(m.FOLIO_VINCULADO) === String(registroCxP.ID_CXP));
        if (yaPagado) return JSON.stringify({ success: false, message: "Documento ya pagado en Caja." });

        // 3. ASIENTO CAJA
        const idTransaccion = "PAGO-" + Utilities.getUuid().substring(0, 8).toUpperCase();
        const res1 = w_EjecutarTransaccionSegura('CAJA', 'NUEVO', {
            ID_MOVIMIENTO: idTransaccion,
            FECHA_BANCO: new Date(),
            INSTITUCION: "AUT_CXP",
            DESCRIPCION_BANCO: "PAGO: " + registroCxP.RUT_PROVEEDOR,
            TIPO: "EGRESO",
            MONTO: -Math.abs(Number(registroCxP.MONTO_DEUDA)),
            FOLIO_VINCULADO: registroCxP.ID_CXP,
            USUARIO_SYNC: usuario
        }, ip);

        if (JSON.parse(res1).error) throw new Error("Error en Caja.");

        // 4. ACTUALIZAR CXP
        const res2 = w_EjecutarTransaccionSegura('CXP', registroCxP.ID_CXP, {
            ESTADO_PAGO: "PAGADO",
            TIMESTAMP_UPDATE: new Date()
        }, ip);

        return JSON.stringify({ success: true, ref: idTransaccion });
    } catch (e) {
        return JSON.stringify({ success: false, message: e.toString() });
    }
}