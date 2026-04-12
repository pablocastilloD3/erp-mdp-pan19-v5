/**
 * @file W_Items.js
 * @description Backend Módulo Items. Gestión de Maestro de Artículos.
 * @compliance URS-28, ISO 22000 (Trazabilidad Forense).
 */

/**
 * Función central para inserción o actualización de un Item.
 * @param {Object} payload - Diccionario con los datos del formulario (URS-28).
 * @param {string} emailUsuario - Identificador del usuario que ejecuta la acción.
 * @returns {string} JSON stringificado con el resultado de la transacción.
 */
function w_items_guardarItem(payload, emailUsuario) {
    try {
        if (!emailUsuario) throw new Error("Violación de Acceso: Usuario no identificado.");
        if (!payload || !payload.SKU_INTERNO) throw new Error("Datos incompletos: SKU_INTERNO es obligatorio.");

        // 1. Enriquecimiento del Payload según URS-28
        payload.TIMESTAMP_UPDATE = new Date().toISOString();
        payload.USER_UPDATER = emailUsuario;

        // Asignar ID_ITEM UUID si es un item nuevo
        if (!payload.ID_ITEM || payload.ID_ITEM.trim() === '') {
            payload.ID_ITEM = Utilities.getUuid();
            payload.STATUS = "ACTIVO";
        }

        // Validación de Ficha Técnica (Debe ser un JSON válido)
        if (payload.FICHA_TECNICA_JSON && typeof payload.FICHA_TECNICA_JSON === 'object') {
            payload.FICHA_TECNICA_JSON = JSON.stringify(payload.FICHA_TECNICA_JSON);
        }

        // 2. Ejecutar Transacción Segura (Core.js maneja la mutación, bloqueo y log SHA-256)
        var resultadoTransaccion = JSON.parse(w_EjecutarTransaccionSegura(
            CONFIG.DB.ITEMS,
            payload,
            CONFIG.LLAVES_PRIMARIAS.ITEMS,
            emailUsuario
        ));

        if (!resultadoTransaccion.success) {
            throw new Error(resultadoTransaccion.message);
        }

        // 3. Registrar Log Crítico Específico (Doble factor de auditoría para ISO 22000)
        registrarLogInterno(
            emailUsuario,
            "MUTACION_ITEM",
            "ITEMS",
            payload.SKU_INTERNO,
            "N/A",
            "Actualización Ficha Técnica/Stock",
            "Ejecución w_items_guardarItem"
        );

        return JSON.stringify({
            success: true,
            data: payload,
            message: "Item actualizado e indexado forensemente."
        });

    } catch (error) {
        return JSON.stringify({
            success: false,
            message: error.message
        });
    }
}