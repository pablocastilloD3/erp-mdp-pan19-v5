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

        if (yaPagado) {
            return JSON.stringify({
                success: false,
                message: "BLOQUEO: Esta factura ya tiene un egreso registrado en Caja. No se permiten duplicados."
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