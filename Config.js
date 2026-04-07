/**
 * @file Config.gs
 * @description Fuente de la Verdad Inmutable. Mapeo URS y Lógica de Relaciones.
 * @version 5.0.2
 */

var CONFIG = {
  APP_NAME: "ERP MDP PAN19",
  VERSION: "5.0.1",
  ENV: "DEV",
  COMPLIANCE: {
    NORMA_1: "ISO 22000 COMPLIANT",
    NORMA_2: "DTE SII CHILE"
  },
  ARCHITECTURE: "Zero Trust Architecture",
  CHILE_OFFSET: "America/Santiago",

  SPREADSHEET_ID: "1vwJaRvW8eTFqfhr02yOvPBOMvmDtTI6mJ_irXQXtZk4",
  FOLDER_XML_BODEGA: "1iCMETUMuqwokGiTKeXPO_Vl_ZTnKhd4Z",

  DB: {
    COMPRAS: 'LIBRO_COMPRAS',
    ITEMS: 'MAESTRO_ITEMS',
    CONFIG: 'SYS_CONFIG',
    PROVEEDORES: 'MAESTRO_PROVEEDORES',
    AUDIT_LOG: 'SYS_AUDIT_LOG',
    USUARIOS: 'MAESTRO_USUARIOS',
    ROLES: 'MAESTRO_ROLES',
    LOTES: 'ABASTECIMIENTO_LOTES',
    CAJA: 'LIBRO_CAJA',
    CXP: 'CUENTAS_POR_PAGAR'
  },

  MATRIZ_ALERGENOS: {
    "GLUTEN": ["HARINA", "TRIGO", "AVENA", "CEBADA", "CENTENO", "SEMOLA", "MASA", "BOLLERÍA"],
    "LACTEOS": ["QUESO", "LECHE", "MANTEQUILLA", "CREMA", "YOGURT", "SUERO", "MANJAR"],
    "FRUTOS_SECOS": ["NUEZ", "ALMENDRA", "MANI", "PISTACHO", "AVELLANA"],
    "SOYA": ["SOYA", "SOJA", "TOFU"]
  },

  // Ubicación: Config.js -> Objeto CONFIG
  LLAVES_PRIMARIAS: {
    COMPRAS: 'ID_UUID',
    ITEMS: 'SKU_INTERNO',         // CORREGIDO: Antes COD_ITEM
    CONFIG: 'PARAM_KEY',
    PROVEEDORES: 'RUT_ENTIDAD',   // CORREGIDO: Antes RUT_PROVEEDOR
    AUDIT_LOG: 'ID_LOG',
    USUARIOS: 'ID_UUID',
    ROLES: 'ID_ROL',
    LOTES: 'ID_UUID',
    CAJA: 'ID_MOVIMIENTO',
    CXP: 'ID_CXP'
  },

  COLUMNAS_JSON: [
    'DETALLE_JSON',
    'PERMISOS_JSON',
    'FICHA_TECNICA_JSON',
    'URL_XML_PDF' // 🚀 FIX: Declaración de nueva columna JSON
  ]

};

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
    sku: null, nombre: null, cantidad: 0, precio: 0, unidad: 'UN', lote: 'S/L', alergenos: 'OK', iso_status: 'PENDIENTE'
  },



};