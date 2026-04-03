# ERP MDP PAN19 - v5.0.0 "Eficiencia y Control"

Sistema **MES/ERP** de grado industrial diseñado para la gestión de manufactura, cumplimiento **ISO 22000** (Inocuidad Alimentaria) y normativa **SII Chile** (DTE), operando bajo una arquitectura **Zero Trust** y patrón de datos **Memory-First**.

## 🏗️ Arquitectura del Sistema

El proyecto se rige por tres pilares fundamentales:
1. **Dumb Server (Servidor Tonto):** El backend (`Core.gs`) actúa solo como un puente de paso y validador de integridad SHA-256. No procesa lógica de interfaz.
2. **Memory-First:** Toda la base de datos se carga en la RAM del navegador al inicio de la sesión para búsquedas instantáneas y validación cruzada.
3. **URS (Uniform Record Structure):** Estándar de columnas fijas para asegurar la integridad referencial en todos los libros contables y de producción.

---

## 📁 Estructura del Núcleo (Base Files)

> **Convención de nomenclatura**: los archivos de infraestructura nuclear (`Core.gs`, `Config.gs`, `Scripts_Main.html`, `Index.html`, `Enrutamiento.html`) operan sin prefijos, mientras que la arquitectura `S_`, `V_`, `W_` queda reservada exclusivamente para el desarrollo de Módulos Operativos.

Estos archivos constituyen la infraestructura crítica e inmutable del sistema:

| Archivo | Función Principal | Validación V5 |
| :--- | :--- | :--- |
| `Config.gs` | **Fuente de la Verdad.** Mapeo URS, constantes SII y LLAVES_PRIMARIAS. | Índices Dinámicos |
| `Core.gs` | **Motor Backend.** Despliegue `doGet`, escritura segura y sellado SHA-256. | Exploración Activa |
| `Index.html` | **App Shell.** Contenedor principal con inyección dinámica de versión. | Aislamiento DOM |
| `Enrutamiento.html` | **Orquestador UI.** Generador dinámico de menú basado en permisos. | Detectable por ADC |
| `Lib_Factory.html` | **Patrón Factory.** Generador de tablas paginadas, formularios y modales. | Componente Estándar |
| `Utils.html` | **Centinela.** Hidratación de RAM (Singleton), Splash y Hot-Kick. | Interceptor Zero-Trust |
| `Scripts_Main.html` | **Núcleo SPA.** Bóveda global `SISTEMA_ERP` y motor de navegación. | Estado Consolidado |
| `Styles_Main.html` | **ADN Visual.** Reglas CSS core con optimización para Safari/iOS. | Aislamiento Estricto |
| `Sidebar.html` | **Sidebar.** Navegación lateral con logout forense. | Versión Dinámica |
| `Footer.html` | **Sensores UI.** Telemetría en tiempo real (ISO/SII/Arch). | Telemetría Activa |
| `SplashScreen.html` | **Pantalla de Inicio UI.** Pantalla de inicio y monitoreo de validación del sistema . | Frontend Inicial |

---

## 🧩 Arquitectura de Módulos (S-V-W)


[Image of MVC software architecture diagram]


Cada módulo funcional se divide obligatoriamente en tres componentes para garantizar escalabilidad:

* **S_[Modulo].html (Controlador):** Define metadatos, permisos y lógica de eventos de la interfaz.
* **V_[Modulo].html (Vista):** Contiene el template HTML puro basado en componentes de la `Lib_Factory`.
* **W_[Modulo].gs (Motor):** Ejecuta la lógica pesada, el parseo de datos y la comunicación con el `Core`.

---

## 🚀 Despliegue en Google Apps Script (GAS)

Para poner en marcha el núcleo industrial, siga estrictamente el orden de inyección de archivos:

### 1. Preparación del Entorno
1. Cree una nueva **Google Sheet** y asigne un nombre (ej. `ERP_PROD_V4`).
2. Copie el ID de la hoja desde la URL.
3. Vaya a `Extensiones > Apps Script`.

### 2. Inyección de Código (Servidor)
* **Core.gs:** Renombre el archivo `Core.js` del repositorio a `Core.gs` dentro del editor de GAS.
* **Config.gs:** Renombre `Config.js` a `Config.gs`.
    * **CRÍTICO:** Actualice la constante `CONFIG.SPREADSHEET_ID` con el ID obtenido.
    * Actualice `CONFIG.FOLDER_XML_BODEGA` con el ID de una carpeta de Drive para respaldos.

### 3. Inyección de Componentes (Frontend)
Cree los archivos de tipo **HTML** en el editor de GAS con los nombres exactos:
* `Index.html`, `Enrutamiento.html`, `Lib_Factory.html`, `Utils.html`, `Scripts_Main.html`, `Styles_Main.html`.

### 4. Publicación (Web App)
1. Click en **Implementar > Nueva implementación**.
2. Tipo: **Aplicación Web**.
3. Ejecutar como: **Yo** (Propietario de la base de datos).
4. Quién tiene acceso: **Cualquier persona** (Acceso protegido por Zero Trust).

---

## 📊 Matriz de Datos y Mantenimiento (Estándar URS)

La base de datos reside en Google Sheets. El incumplimiento de este esquema romperá la carga a RAM (`descargarRAM`). Cada pestaña debe coincidir exactamente con los nombres definidos en `Config.gs > DB`.

| Hoja | Columnas | Propósito Central |
| :--- | :--- | :--- |
| `MAESTRO_ITEMS` | 18 (URS-18) | Catálogo de SKUs, alérgenos e indicadores de inocuidad (ISO 22000). |
| `MAESTRO_PROVEEDORES`| 22 (URS-22) | Enrolamiento de entidades, RUT, giro y niveles de riesgo ISO. |
| `LIBRO_COMPRAS` | 29 (URS-29) | Registro transaccional inmutable de DTEs y detalles JSON. |
| `ABASTECIMIENTO_LOTES`| 16 (URS-16) | Trazabilidad forense de saldos, ubicaciones y estados de calidad (HACCP/ISO). |
| `SYS_AUDIT_LOG` | 12 (URS-12) | Registro forense del sistema con encadenamiento criptográfico SHA-256. |
| `SYS_CONFIG` | 6 (URS-6) | Parámetros globales, esquemas JSON y reglas de negocio. |
| `MAESTRO_USUARIOS` | 7 (URS-7) | Control de identidades, UUID de acceso y estatus de cuentas. |
| `MAESTRO_ROLES` | 5 (URS-5) | Matriz de permisos en formato JSON para acceso granular. |
| `LIBRO_CAJA` | 10 (URS-10)| Control de movimientos y flujos financieros. |

### ⚙️ Estructuras JSON (Esquemas Lógicos en SYS_CONFIG)
El sistema utiliza objetos JSON para parametrizar la lógica sin alterar el código duro:
1. **MATRIZ_ALERGENOS:** `{"GLUTEN": ["HARINA", "TRIGO"], "LACTEOS": ["QUESO", "LECHE"]}`.
2. **CATALOGO_TIPOS_ITEM:** Define categorías (`MP_CRITICA`, `INS_QUIM`) para reglas de inspección.

---

## 🛡️ Protocolo Forense (SYS_AUDIT_LOG)

**PROHIBIDO:** Editar manualmente la hoja `SYS_AUDIT_LOG`.
* El motor `Core.gs` valida la integridad mediante la columna `HASH_RECORD`.
* Cualquier edición manual romperá el encadenamiento criptográfico, activando la alerta de **"Ruptura de Integridad"**.

---

## 📜 Estándares de Cumplimiento
* **SII Chile:** Procesamiento de XML mediante `SII_MAPPING` definido en `Config.gs`.
* **ISO 22000:** Protocolo **PCC-01** integrado en el flujo de abastecimiento (bloqueo automático de Lotes sin certificar).

---

## 🤖 Directivas para Asistencia por IA (Prompt Engineering)


Cualquier interacción con modelos de lenguaje (LLMs) para analizar, modificar o crear código en este repositorio debe adherirse estrictamente a las siguientes directivas ("Flujo de Hierro"). 

**1. REGLAS DE CÓDIGO INTOCABLE (ZERO-DELETE)**
* **Prohibido eliminar, refactorizar u omitir funciones existentes** que no estén relacionadas con el error reportado (ej. no omitir telemetría, funciones de `logout` o utilidades de UI por ahorrar espacio).
* Si el código hace referencia a una función que no está en el prompt o contexto actual, **NO LA INVENTES**. La IA debe detenerse y pedir que se le proporcione el archivo original donde reside esa función.
* **Cruce de Datos Seguro:** Prohibido usar índices fijos o hardcodeados (ej. `tabla[0][2]`). Toda búsqueda debe ser mediante cabecera dinámica usando el motor de exploración activa de `Utils.html`.

Aquí tienes la estructura optimizada para que la copies y pegues directamente en tu archivo **`Readme.md`** o en tu **`ERP_Prompt_Base`**. He corregido el nombre del archivo de la Vista (que tenías como `W_` por error) para que coincida con tu arquitectura **S-V-W**.

---

## 2. PLANTILLA OBLIGATORIA DE MÓDULOS (URS-28)

Para garantizar la integridad del sistema, todo nuevo módulo debe dividirse en los siguientes tres archivos, respetando estrictamente sus estructuras base:

### A. Controlador Frontend (`S_Modulo.html`)
Gestiona los metadatos, el estado local y la lógica de inicio/renderizado.

```html
<script>
  /**
   * @file S_NombreModulo.html
   * @version 5.0.0
   * @project ERP MDP PAN19 - Sistema de Gestión Industrial
   * @author Murphy - Arquitecto PMDC
   * @compliance ISO 22000 / SII Chile / URS-28
   * @description Características principales del módulo.
   * @lastUpdate 2026-04-01
   */

  window.Ctrl_[NombreModulo] = {
    meta: {
      id: '[id_minusculas]',
      version: '1.0.0',
      titulo: '[Título]',
      icono: 'bi-[icono]',
      tematica: '[Categoría]',
      seguridad: { permisos: ['*'], nivel_acceso: 1 }
    },
    estado: {
      // Estado reactivo local
    },
    init: function() {
      // Lógica de arranque y suscripción a eventos
    },
    render: function() {
      // Inyección de componentes Lib_Factory en el DOM
    }
  };
</script>
```

### B. Motor Backend (`W_Modulo.gs`)
Gestiona la lógica de negocio pesada, validaciones de servidor y cumplimiento URS.

```javascript
/**
 * @file W_NombreModulo.gs
 * @version 5.0.0
 * @project ERP MDP PAN19 - Sistema de Gestión Industrial
 * @author Murphy - Arquitecto PMDC
 * @compliance ISO 22000 / SII Chile / URS-28
 * @description Lógica de procesamiento de [Función].
 * @lastUpdate 2026-04-01
 */

/** @section 1. CONFIGURACIÓN LOCAL */
const MODULO_CONFIG = {
  TABLA_PRINCIPAL: CONFIG.DB.NOMBRE_TABLA,
  TOLERANCIA_ISO: 0.05
};

/** @section 2. PUENTES PÚBLICOS (API) */
function w_modulo_procesarAccion(payload) {
  const correlationId = "W-" + new Date().getTime();
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) throw new Error("Sesión no autorizada.");

    const resultado = _logica_ejecutarOperacion(payload);
    w_registrarLogForense("ACCION_EXITOSA", "MODULO", payload.id, "Completado", correlationId);

    return JSON.stringify({ success: true, data: resultado });
  } catch (error) {
    return JSON.stringify({ error: true, message: error.message, ref: correlationId });
  }
}

/** @section 3. LÓGICA PRIVADA */
function _logica_ejecutarOperacion(datos) {
  // Lógica interna de negocio
  return { ...datos, status: 'OK' };
}
```

### C. Vista HTML (`V_Modulo.html`)
Define el esqueleto visual aislado mediante IDs únicos y clases de Bootstrap 5.

```html
<div id="view-[id_modulo]" class="spa-view d-none">
  
  <div class="row mb-4 pt-3 animate__animated animate__fadeIn">
    <div class="col-12 d-flex justify-content-between align-items-center">
      <div>
        <h2 class="fw-bold mb-0 text-dark">
          <i id="v-[id_modulo]-icono" class="bi bi-gear-fill me-2 text-primary"></i>
          <span id="v-[id_modulo]-titulo text-uppercase">Título</span>
        </h2>
        <p class="text-muted small mb-0" id="v-[id_modulo]-descripcion">
          Descripción operativa bajo norma ISO 22000.
        </p>
      </div>
      <div id="v-[id_modulo]-acciones-header"></div>
    </div>
  </div>

  <hr class="border-2 opacity-25 mb-4">

  <div class="row animate__animated animate__fadeInUp">
    <div class="col-12">
      <div class="card shadow-sm border-0">
        <div class="card-body p-0">
          <div id="v-[id_modulo]-contenedor-principal" class="table-responsive" style="min-height: 400px;">
            </div>
        </div>
      </div>
    </div>
  </div>

  <div id="v-[id_modulo]-modales"></div>
</div>
```

---

## 3. PROTOCOLO DE CORRECCIÓN (NO ARREGLOS SILENCIOSOS)

La IA debe actuar bajo una política de **"Cero Intervención no Autorizada"**:
1. **Analizar:** Identificar la causa raíz en el código proporcionado.
2. **Reportar:** Emitir una "Alerta de Anomalía" detallando Ubicación, Problema e Impacto.
3. **Proponer:** Presentar la solución estructurada.
4. **Esperar:** No generar el bloque de código final hasta que el usuario valide la propuesta.
5. **Preservar:** Prohibido eliminar funciones existentes (Telemetría, Sesión, Logs) durante la corrección.
