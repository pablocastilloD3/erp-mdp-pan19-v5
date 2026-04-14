/**
 * @file W_Caja.js
 * @description Motor Backend para el Libro de Caja.
 * @arquitectura Server-Side Puro / Patrón URS-28.
 */

function w_caja_guardar(payloadStr, ipCliente) {
    try {
        const payload = JSON.parse(payloadStr);
        const user = Session.getActiveUser().getEmail() || 'SYSTEM';
        const ts = new Date().toISOString();
        const uuid = Utilities.getUuid();

        // Mapeo Estricto URS-28 (10 Columnas)
        const cajaObj = {
            ID_MOVIMIENTO: uuid,
            FECHA_BANCO: ts,
            INSTITUCION: payload.CATEGORIA,     // GASTO_ADM, IMPUESTOS, REMUNERACIONES
            DESCRIPCION_BANCO: payload.GLOSA,
            TIPO: 'OPERATIVO',                  // Identificador de segregación
            MONTO: payload.MONTO,
            ESTADO_CONCILIACION: 'DIRECTO',
            FOLIO_VINCULADO: 'N/A',             // Mantiene limpio el módulo CxP
            FECHA_SISTEMA: ts,
            USUARIO_SYNC: user
        };

        // Llamada al motor universal (Core.js)
        const resStr = w_EjecutarTransaccionSegura('CAJA', 'NUEVO', cajaObj, ipCliente || '0.0.0.0');
        return resStr;

    } catch (e) {
        console.error("[W_Caja] Fallo crítico:", e.message);
        return JSON.stringify({ error: true, message: e.message });
    }
}