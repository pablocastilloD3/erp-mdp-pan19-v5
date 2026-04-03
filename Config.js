/**
 * @file Config.gs
 * @description Fuente de la Verdad Inmutable. Mapeo URS y Lógica de Relaciones.
 * @version 5.0.0
 * @reparacion [A5] SPREADSHEET_ID truncado — eliminado fragmento /edit?gid=... inválido.
 * @reparacion [NUEVO] LLAVES_PRIMARIAS — Mapa declarativo para Exploración Activa en Core.gs.
 * @reparacion [V5] Erradicación de diccionarios de índices fijos URS_* (Legacy).
 */

var CONFIG = {
  APP_NAME: "ERP MDP PAN19",
  VERSION: "5.0.0",
  ENV: "DEV",
  COMPLIANCE: {
    NORMA_1: "ISO 22000 COMPLIANT",
    NORMA_2: "DTE SII CHILE"
  },
  ARCHITECTURE: "Zero Trust Architecture",
  CHILE_OFFSET: "America/Santiago",

  SPREADSHEET_ID: "1vwJaRvW8eTFqfhr02yOvPBOMvmDtTI6mJ_irXQXtZk4",
  FOLDER_XML_BODEGA: "1rRUzM1XqSshYn1YjD5irqFzzjgg3Ztw1",

  // =========================================================================
  // 1. MAPEO DE TABLAS FÍSICAS (Nombres de pestañas en Google Sheets)
  // =========================================================================
  DB: {
    COMPRAS: 'LIBRO_COMPRAS',
    ITEMS: 'MAESTRO_ITEMS',
    CONFIG: 'SYS_CONFIG',
    PROVEEDORES: 'MAESTRO_PROVEEDORES',
    AUDIT_LOG: 'SYS_AUDIT_LOG',
    USUARIOS: 'MAESTRO_USUARIOS',
    ROLES: 'MAESTRO_ROLES',
    LOTES: 'ABASTECIMIENTO_LOTES',
    CAJA: 'LIBRO_CAJA'
  },

  // =========================================================================
  // 1.5. LLAVES PRIMARIAS POR TABLA (Exploración Activa v6.0.0)
  // =========================================================================
  LLAVES_PRIMARIAS: {
    COMPRAS: 'ID_UUID',
    ITEMS: 'ID_ITEM',
    CONFIG: 'PARAM_KEY',
    PROVEEDORES: 'ID_UUID',
    AUDIT_LOG: 'ID_LOG',
    USUARIOS: 'ID_UUID',
    ROLES: 'ID_ROL',
    LOTES: 'ID_UUID',
    CAJA: 'ID_MOVIMIENTO'
  }
};

/**
 * @section DICCIONARIO DE INFRAESTRUCTURA DE DATOS
 * Centraliza el mapeo entre XML del SII y la estructura forense.
 */
var CONFIG_DETALLE_COMPRAS = {
  SII_MAPPING: {
    SKU: 'VlrCodigo',
    NOMBRE: 'NmbItem',
    DESCRIPCION: 'DscItem',
    CANTIDAD: 'QtyItem',
    PRECIO: 'PrcItem',
    UNIDAD: 'UnmdItem',
    MONTO: 'MntoItem'
  },

  EXTRACTORES: {
    LOTE: {
      pattern: /(?:LOTE|LOT|L:|B:|BATCH)\s*[:#-]?\s*([A-Z0-9.\-\/]+)/i,
      target_field: 'DESCRIPCION'
    }
  },

  SCHEMA_JSON: {
    sku: null,
    nombre: null,
    cantidad: 0,
    precio: 0,
    unidad: 'UN',
    lote: 'S/L',
    alergenos: 'OK',
    iso_status: 'PENDIENTE'
  }
};