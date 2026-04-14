/**
 * @file W_CxP.gs
 * @description Transacción Atómica CxP -> Caja.
 */

/**
 * @file W_CxP.gs
 * @version 5.7.0 - CORRECCIÓN DE LLAVES Y CONTROL DE DUPLICADOS
 */
function w_cxp_autorizarPagoFinal(registroCxP, ip) {
    const usuario = Session.getActiveUser().getEmail();

    // 1. CONTROL DE DUPLICADOS (PREVENCIÓN DE DOBLE GASTO)
    // Verificamos si ya existe un egreso para este ID_CXP en la tabla de Caja
    try {
        const dbCompleta = getDatabaseCompleta(); // Obtenemos la data fresca del servidor
        const tablaCajaFisica = CONFIG.DB.CAJA; // Usamos la llave lógica del Config.gs
        const registrosCaja = dbCompleta[tablaCajaFisica] || [];

        const yaExiste = registrosCaja.some(mov => String(mov.FOLIO_VINCULADO) === String(registroCxP.ID_CXP));

        if (yaExiste) {
            return JSON.stringify({
                success: false,
                message: "ERROR: Este documento ya tiene un egreso registrado en Libro Caja."
            });
        }

        // 2. CONSTRUCCIÓN DEL ASIENTO (LIBRO_CAJA)
        const idTransaccion = "PAGO-" + Utilities.getUuid().substring(0, 8).toUpperCase();
        const filaCaja = {
            "ID_MOVIMIENTO": idTransaccion,
            "FECHA_BANCO": new Date(),
            "INSTITUCION": "AUTORIZACION_CXP",
            "DESCRIPCION_BANCO": "PAGO PROV: " + registroCxP.RUT_PROVEEDOR,
            "TIPO": "EGRESO",
            "MONTO": -Math.abs(Number(registroCxP.MONTO_DEUDA)),
            "ESTADO_CONCILIACION": "PROVISIONADO",
            "FOLIO_VINCULADO": registroCxP.ID_CXP,
            "FECHA_SISTEMA": new Date(),
            "USUARIO_SYNC": usuario
        };

        // 3. IMPACTO EN CAJA (Usando llave lógica del Config)
        // Cambiamos el string "LIBRO_CAJA" por CONFIG.DB.CAJA
        const res1 = w_EjecutarTransaccionSegura(CONFIG.DB.CAJA, "NUEVO", filaCaja, ip);
        if (JSON.parse(res1).error) throw new Error("Fallo en Caja: " + JSON.parse(res1).message);

        // 4. ACTUALIZACIÓN DE ESTADO (Usando llave lógica CONFIG.DB.CXP)
        // Importante: Aquí usamos la llave lógica, no el nombre de la tabla
        const datosUpdate = { ...registroCxP };
        datosUpdate["ESTADO_PAGO"] = "PAGADO";
        datosUpdate["TIMESTAMP_UPDATE"] = new Date();

        const res2 = w_EjecutarTransaccionSegura(CONFIG.DB.CXP, registroCxP.ID_CXP, datosUpdate, ip);
        if (JSON.parse(res2).error) throw new Error("Fallo en CxP: " + JSON.parse(res2).message);

        return JSON.stringify({ success: true, ref: idTransaccion });

    } catch (e) {
        console.error("🚨 ERROR EN W_CxP:", e.toString());
        return JSON.stringify({ success: false, message: e.toString() });
    }
}