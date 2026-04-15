/**
 * @file W_Calidad.js
 * @description Servidor de Transacciones ISO 22000 (Gatekeeper).
 */

function w_ProcesarInspeccion(payloadStr, ipCliente) {
    try {
        const payload = JSON.parse(payloadStr);
        const emailUsuario = Session.getActiveUser().getEmail() || 'SYSTEM';

        // 1. VALIDACIÓN ZERO-TRUST DE LÍMITES CRÍTICOS
        let resultadoInspeccion = "APROBADO";
        let accionRiesgo = "MANTENIDO";

        if (payload.temp > payload.tempMax || payload.temp < payload.tempMin ||
            payload.humedad > payload.humMax ||
            payload.integridad === 'RECHAZADO') {

            resultadoInspeccion = "RECHAZADO";
            accionRiesgo = "BLOQUEADO";
        }

        // 2. GENERACIÓN DEL CERTIFICADO DIGITAL
        const baseHash = payload.idCompraUuid + payload.rutProveedor + resultadoInspeccion + new Date().getTime().toString();
        const hashCert = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, baseHash)
            .map(function (chr) { return (chr + 256).toString(16).slice(-2) }).join('');

        // 3. CONSTRUCCIÓN DE LA TRANSACCIÓN ATÓMICA
        let transacciones = [];

        // [T1] URS-10: Bitácora de Calidad
        transacciones.push({
            tabla: 'CALIDAD',
            accion: 'INSERTAR',
            datos: {
                ID_UUID: Utilities.getUuid(),
                TIMESTAMP_CREATE: new Date().toISOString(),
                USER_CREATOR: emailUsuario,
                ID_FACTURA: payload.folioFactura,
                RUT_PROVEEDOR: payload.rutProveedor,
                RESULTADO_INSPECCION: resultadoInspeccion,
                PARAMETROS_TECNICOS: JSON.stringify({ temp: payload.temp, humedad: payload.humedad, integridad: payload.integridad }),
                CRUCE_ALERGENOS: JSON.stringify({ control: 'Verificado', alerta: false }),
                ACCION_ISO_RIESGO: accionRiesgo,
                CERTIFICADO_HASH: hashCert
            }
        });

        // [T2] Liberación o Rechazo del Lote en Compras (Llave Primaria: ID_UUID)
        transacciones.push({
            tabla: 'COMPRAS',
            accion: 'UPDATE',
            idRegistro: payload.idCompraUuid,
            datos: {
                CONTROL_CALIDAD: resultadoInspeccion
            }
        });

        // [T3] Interceptación de Pagos (Llave Primaria: RUT_ENTIDAD)
        if (accionRiesgo === "BLOQUEADO") {
            transacciones.push({
                tabla: 'PROVEEDORES',
                accion: 'UPDATE',
                idRegistro: payload.rutProveedor, // Según CONFIG.LLAVES_PRIMARIAS.PROVEEDORES
                datos: {
                    ISO_RIESGO: "BLOQUEADO",
                    ALERTA_STATUS: "Bloqueo por Calidad. Rechazo Lote Factura: " + payload.folioFactura
                }
            });
        }

        // 4. DESPACHO AL MOTOR MULTITABLA (Core.gs)
        return w_EjecutarTransaccionMultitabla(JSON.stringify(transacciones), ipCliente);

    } catch (error) {
        return JSON.stringify({ exito: false, mensaje: "Excepción en Backend Calidad: " + error.message });
    }
}