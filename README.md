# ERP MDP PAN19 - v5.2.0 "Eficiencia y Control"

Sistema **MES/ERP** de grado industrial diseñado para la gestión de manufactura, cumplimiento **ISO 22000** (Inocuidad Alimentaria) y normativa **SII Chile** (DTE), operando bajo una arquitectura **Zero Trust** y patrón de datos **Memory-First**.

## 🏗️ Arquitectura del Sistema

El proyecto se rige por tres pilares fundamentales:

1. **Dumb Server (Servidor Tonto):** El backend (`Core.gs`) actúa solo como un puente de paso y validador de integridad SHA-256. No procesa lógica de interfaz.
2. **Memory-First:** Toda la base de datos se carga en la RAM del navegador al inicio de la sesión (`loadDatabaseToMemory`) para búsquedas instantáneas y validación cruzada.
3. **URS-28 (Uniform Record Structure):** Estándar de columnas fijas para asegurar la integridad referencial.

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

## 🛠️ Estándar de Módulos Operativos (S_, V_, W_)

Para garantizar la mantenibilidad y la economía de tokens, todo módulo operativo debe estar segmentado obligatoriamente por etiquetas de **Ámbito (SCOPE)**.

### ⚙️ Ámbitos Backend/Lógica (Archivos S_y W_)

1. **`[SCOPE: CONFIG]`**: Constantes locales, mapeos de columnas y parámetros de configuración del módulo.
2. **`[SCOPE: CORE_LOGIC]`**: Funciones de procesamiento de negocio y cálculos algorítmicos.
3. **`[SCOPE: DATA_ACCESS]`**: Interacciones con la memoria global y llamadas a persistencia.
4. **`[SCOPE: COMPLIANCE]`**: Validaciones críticas, trazabilidad ISO 22000 y reglas fiscales SII.

### 🎨 Ámbitos Frontend/Vista (Archivos V_)

1. **`[SCOPE: UI_LAYOUT]`**: Estructura Bootstrap 5, rejillas y contenedores principales.
2. **`[SCOPE: UI_COMPONENTS]`**: Definición de modales, formularios, tablas dinámicas y botones.
3. **`[SCOPE: CLIENT_SCRIPTS]`**: JavaScript local, manejo de eventos y llamadas a `google.script.run`.

---

## 🚨 Protocolo de Resolución de Anomalías

Ante fallos detectados, el sistema responderá bajo la plantilla técnica obligatoria de Murphy:

- Contexto (Módulo, Fase, Ambiente).
- Detalles (Descripción, Evidencia, Severidad, Impacto).
- Análisis de Causa Raíz (5 Porqués).
- Propuesta de Solución (Paso a paso).

---

## 🛡️ Arquitectura Zero-Trust: Refactorización de Configuración (v5.1.0+)

A partir de la versión 5.2.0, el ERP implementa un estricto patrón **Zero-Trust (Confianza Cero)** para el manejo de variables globales y credenciales, garantizando el cumplimiento de los estándares de seguridad de la información (ISO 22000) y la norma URS-28.

### El Problema (Legacy)

Anteriormente, el archivo `Config.gs` operaba como un monolito que mezclaba reglas de negocio (públicas) con identificadores de infraestructura (`SPREADSHEET_ID`, IDs de Google Drive). Esta estructura impedía inyectar la configuración al cliente (Frontend) sin exponer secretos críticos al navegador del usuario, obligando a los módulos a utilizar nombres de base de datos *hardcodeados* (ej. `LIBRO_COMPRAS`).

### La Solución (Zero-Trust)

## 📜 Protocolo de Cumplimiento (Zero-Trust)

1. **Ruptura de Integridad:** Cualquier edición manual en las hojas de cálculo (especialmente `SYS_AUDIT_LOG`) activará alertas de cumplimiento.
2. **Zero-Trust con el Código:** La IA no corregirá errores en silencio. Se detendrá y emitirá un "Reporte de Anomalía".
3. **Trazabilidad:** Todo cambio en el código debe ser auditable bajo el ámbito `COMPLIANCE`.
Se aplicó el principio de Segregación de Interfaces, dividiendo el entorno en dos dominios estrictos:

4. **`SECRETS` (Bóveda Backend):**
   Un objeto inmutable que reside **exclusivamente en el motor V8** de Google Apps Script. Contiene los IDs de las bases de datos y carpetas. Jamás se expone al cliente.

   ```javascript
   var SECRETS = {
     SPREADSHEET_ID: "ID_REAL_OCULTO",
     FOLDER_XML_BODEGA: "ID_CARPETA_OCULTO"
   };

---

## 🧩 Arquitectura de Módulos (S-V-W)

[Image of MVC software architecture diagram]

Cada módulo funcional se divide obligatoriamente en tres componentes para garantizar escalabilidad:

- **S_[Modulo].html (Controlador):** Define metadatos, permisos y lógica de eventos de la interfaz.
- **V_[Modulo].html (Vista):** Contiene el template HTML puro basado en componentes de la `Lib_Factory`.
- **W_[Modulo].gs (Motor):** Ejecuta la lógica pesada, el parseo de datos y la comunicación con el `Core`.

---

## 🚀 Despliegue en Google Apps Script (GAS)

Para poner en marcha el núcleo industrial, siga estrictamente el orden de inyección de archivos:

### 1. Preparación del Entorno

1. Cree una nueva **Google Sheet** y asigne un nombre (ej. `ERP_PROD_V4`).
2. Copie el ID de la hoja desde la URL.
3. Vaya a `Extensiones > Apps Script`.

### 2. Inyección de Código (Servidor)

- **Core.gs:** Renombre el archivo `Core.js` del repositorio a `Core.gs` dentro del editor de GAS.
- **Config.gs:** Renombre `Config.js` a `Config.gs`.
  - **CRÍTICO:** Actualice la constante `CONFIG.SPREADSHEET_ID` con el ID obtenido.
  - Actualice `CONFIG.FOLDER_XML_BODEGA` con el ID de una carpeta de Drive para respaldos.

### 3. Inyección de Componentes (Frontend)

Cree los archivos de tipo **HTML** en el editor de GAS con los nombres exactos:

- `Index.html`, `Enrutamiento.html`, `Lib_Factory.html`, `Utils.html`, `Scripts_Main.html`, `Styles_Main.html`.

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
| `MAESTRO_PROVEEDORES` | 22 (URS-22) | Enrolamiento de entidades, RUT, giro y niveles de riesgo ISO. |
| `LIBRO_COMPRAS` | 29 (URS-29) | Registro transaccional inmutable de DTEs y detalles JSON. |
| `ABASTECIMIENTO_LOTES` | 16 (URS-16) | Trazabilidad forense de saldos, ubicaciones y estados de calidad (HACCP/ISO). |
| `SYS_AUDIT_LOG` | 12 (URS-12) | Registro forense del sistema con encadenamiento criptográfico SHA-256. |
| `SYS_CONFIG` | 6 (URS-6) | Parámetros globales, esquemas JSON y reglas de negocio. |
| `MAESTRO_USUARIOS` | 7 (URS-7) | Control de identidades, UUID de acceso y estatus de cuentas. |
| `MAESTRO_ROLES` | 5 (URS-5) | Matriz de permisos en formato JSON para acceso granular. |
| `LIBRO_CAJA` | 10 (URS-10) | Control de movimientos y flujos financieros. |

### ⚙️ Estructuras JSON (Esquemas Lógicos en SYS_CONFIG)

El sistema utiliza objetos JSON para parametrizar la lógica sin alterar el código duro:

1. **MATRIZ_ALERGENOS:** `{"GLUTEN": ["HARINA", "TRIGO"], "LACTEOS": ["QUESO", "LECHE"]}`.
2. **CATALOGO_TIPOS_ITEM:** Define categorías (`MP_CRITICA`, `INS_QUIM`) para reglas de inspección.

---

## 🛡️ Protocolo Forense (SYS_AUDIT_LOG)

**PROHIBIDO:** Editar manualmente la hoja `SYS_AUDIT_LOG`.

- El motor `Core.gs` valida la integridad mediante la columna `HASH_RECORD`.
- Cualquier edición manual romperá el encadenamiento criptográfico, activando la alerta de **"Ruptura de Integridad"**.

---

## 🧩 Módulos Operativos (S_Sesion, S_Seguridad, S_Auditoria, S_UpdateXML)

### 🛡️ Módulo de Seguridad y Monitoreo (S_Sesion.html)

El módulo `S_Sesion.html` (Monitor de Seguridad v5.1.0) actúa como el guardián de acceso y vigilancia en la capa del cliente (Frontend). Implementa la arquitectura **Zero-Trust** y gestiona el ciclo de vida del usuario para garantizar el cumplimiento de los estándares de seguridad URS-28.

### Responsabilidades Clave

- **Handshake Zero-Trust y Captura de IP:** Al arrancar el sistema, el módulo captura la IP pública del cliente mediante el servicio `api.ipify.org` y solicita al backend la validación estricta de la identidad activa (`w_verificarIdentidadZeroTrust`).
- **Billetera de Identidad Global (Memory-First):** Tras una autenticación exitosa, construye el objeto `window.SISTEMA_ERP.identidad` en la memoria RAM, almacenando el correo, nombre y el rol validado del usuario. Posteriormente, dispara la señal `erp-auth-success` para que el sistema inicie la descarga de la base de datos.
- **Inyección de Telemetría Visual (Cero Latencia):** A través del método `actualizarTelemetriaUI`, mapea e inyecta instantáneamente los datos de la identidad (Nombre, Rol y Email) en los componentes del DOM (como etiquetas y menús de navegación) sin requerir recargas de página.
- **Centinela de Inactividad (Watchdog):** Mantiene una escucha pasiva de los eventos de interacción del usuario (teclado, clics, scroll, pantallas táctiles) para reiniciar un reloj de actividad. Si se alcanza el tiempo límite de inactividad, el sistema lanza un aviso (`modal-sesion-aviso`) con una cuenta regresiva de 120 segundos para extender la sesión o cerrarla.
- **Cierre de Sesión Forense y Purga de RAM:** Al detonarse un cierre de sesión (ya sea manual, por inactividad o por revocación de privilegios), el método `ejecutarCierre` purga inmediatamente los datos en memoria (`window.SISTEMA_ERP.datos = {}` y `window.SISTEMA_ERP.identidad = null`). Finalmente, registra el evento en la auditoría del servidor (`w_registrarLogForense`) y renderiza una pantalla negra de bloqueo total en el navegador.

### 🔐 Módulo de Gestión de Identidades y Accesos (S_Seguridad.html)

El módulo `S_Seguridad.html` (versión 5.1.0) opera como el controlador lógico en el Frontend para la administración de usuarios y la configuración de matrices de permisos (RBAC). Trabaja bajo la arquitectura URS-28 y el modelo Memory-First, consumiendo directamente la información de la bóveda global en RAM.

**Responsabilidades Clave:**

- **Arquitectura Limpia (SRP):** A partir de la versión 5.1.0, el módulo fue refactorizado para eliminar dependencias de telemetría (ahora delegadas a `S_Sesion`), enfocándose de manera exclusiva y aislada en el control de `MAESTRO_USUARIOS` y `MAESTRO_ROLES`.
- **Gestión Reactiva de Interfaz:** Controla la navegación interna de la vista mediante el método `cambiarPestana`, alternando dinámicamente entre la tabla de usuarios y la tabla de roles, y ajustando los botones de acción correspondientes ("Nueva Identidad" o "Nuevo Perfil").
- **Administración Segura de Identidades:** Lista a los usuarios mostrando su estado (ACTIVO, PENDIENTE, INACTIVO) y su nivel de acceso mediante la integración con `Factory.crearTabla`. Al editar o crear una identidad (`editarUsuario`), aplica protecciones de negocio, como la directiva `readonly` que impide matemáticamente que el usuario activo desactive su propia cuenta.
- **Orquestador de Privilegios (Perfiles):** Facilita la creación de roles mediante un formulario que extrae dinámicamente todos los módulos operativos registrados en `window.SISTEMA_ERP.modulos`. Incorpora la función `_toggleSuperAdmin` que, al marcarse, desactiva la selección manual y asigna automáticamente el permiso raíz universal `["*"]`.
- **Transacciones Blindadas:** Captura los datos de los formularios y los envía al servidor mediante el canal `w_EjecutarTransaccionSegura`, enviando el payload junto con la IP del cliente (`window.SISTEMA_ERP.ipCliente`) para su validación forense. Tras un guardado exitoso, ejecuta una `recargaSilenciosa` de la memoria RAM para reflejar los cambios instantáneamente sin recargar el navegador.

### 🔎 Módulo de Auditoría Forense (S_Auditoria.html)

El módulo `S_Auditoria.html` (versión 5.2.1) es el controlador frontend encargado de la visualización y análisis de la trazabilidad inmutable del sistema, garantizando el cumplimiento de los estándares ISO 22000 y normativas del SII. Trabaja consumiendo la tabla `SYS_AUDIT_LOG` cargada en la memoria RAM.

**Responsabilidades Clave:**

- **Motor Pre-Procesador de Sesiones Dinámico:** A través de la función `_preprocesarSesiones`, el módulo ordena estrictamente los registros de forma cronológica y los agrupa en bloques de sesión aislados (`_SESSION_ID`). Utiliza los eventos de entrada (como `AUTH_SUCCESS`) y salida (`LOGOUT`, `TIMEOUT`) para definir los límites de la sesión, generando identificadores de respaldo (`fallback`) para las acciones autónomas del sistema.
- **Línea de Tiempo (Relato de Sesión):** El método `abrirRelato` aísla los eventos que comparten un mismo ID de sesión y construye una interfaz modal con una línea de tiempo cronológica, permitiendo rastrear la historia real y secuencial de las acciones de un usuario.
- **Inspección Técnica de Mutaciones (Diff Engine):** Para las operaciones que modifican datos, la función `abrirDiff` analiza los objetos JSON almacenados en `VALOR_ANTERIOR` y `VALOR_NUEVO`. Renderiza una tabla comparativa campo por campo para auditar exactamente qué atributo cambió, mostrando también la firma digital SHA-256 (`HASH_RECORD`) de la transacción.
- **Verificación de Integridad Criptográfica:** Mediante el método `verificarIntegridad`, el módulo se comunica con el backend para re-calcular y validar la cadena de hashes SHA-256. Si detecta una ruptura en la cadena, captura el `idRuptura`, lanza una alerta de seguridad (renderizada en `audit-integrity-alert`) y resalta visualmente el registro corrupto en la tabla de datos.
- **Filtros de Exploración Forense:** Implementa el método `aplicarFiltros` para permitir búsquedas granulares por usuario (`filtroUser`), tipo de operación (`filtroAccion`) y ventanas de tiempo (hoy, 7 días, 30 días, este mes, todo). Adicionalmente, incluye un interruptor (`soloRupturas`) para aislar y mostrar únicamente los registros que presenten fallos de integridad criptográfica.

### 📦 Módulo de Ingesta Masiva DTE (S_UpdateXML.html)

El módulo `S_UpdateXML.html` (versión 3.0.0) es el controlador de interfaz encargado de la ingesta de Lotes de Documentos Tributarios Electrónicos (DTE). Actúa como un escudo protector y pre-procesador inteligente antes de enviar los datos al núcleo del ERP, garantizando la consistencia del inventario y la contabilidad.

**Responsabilidades Clave:**

- **Sanitización Extrema y Parseo Tributario:** A través de la función `_procesarUnXML`, el módulo lee los archivos cargados y aplica una sanitización estructurada mediante expresiones regulares para eliminar declaraciones intrusas que rompen la lectura del DOM. Extrae datos tributarios vitales como el tipo de documento (`TipoDTE`), montos exentos (`MntExe`), y captura dinámicamente impuestos adicionales o retenciones sumando los valores de los nodos `ImptoReten`.
- **Cruce de Alérgenos y Detección de Duplicados:** Durante la fase de pre-vuelo (`_ejecutarPreVueloAgrupado`), el sistema cruza los nombres de los ítems contra la `MATRIZ_ALERGENOS` extraída desde `SYS_CONFIG` en la memoria RAM, advirtiendo visualmente en la interfaz. Simultáneamente, escanea el `LIBRO_COMPRAS` activo para verificar coincidencias exactas de RUT y Folio, bloqueando instantáneamente cualquier intento de ingresar un documento duplicado.
- **Motor Heurístico de Granel (Human-in-the-Loop):** Implementa la función `_sugerirConversion` para auditar inconsistencias en las unidades de medida provistas por los proveedores. Si detecta fracciones en unidades enteras (ej. 2.5 UN) o medidas en menor escala (GR, ML), ejecuta una conversión matemática a escalas industriales (KG, LT) e infiere la magnitud basándose en palabras clave del producto. Estas sugerencias habilitan campos interactivos en la interfaz, exigiendo que el operador valide o corrija la conversión antes de procesar el lote.
- **Simulador Visual Asíncrono (Optimistic UI):** En el método `confirmarLote`, el módulo cosecha las correcciones manuales y envía todos los documentos válidos en un único bloque atómico al servidor para garantizar la generación de un solo Certificado ISO consolidado. Para evitar que la pantalla se congele durante el proceso backend, despliega un simulador visual (`setInterval`) que calcula un tiempo de espera por documento, animando la barra de progreso y desvaneciendo las filas de la tabla una a una, brindando retroalimentación continua al usuario.

### Documentación de Módulo: Maestro de Proveedores (S_Proveedores, V_Proveedores y W_Proveedores)

**ID del Módulo:** `proveedores`  
**Versión Actual:** `1.11.0`  
**Estado:** `Release Candidate (Estabilizado)`

#### 1. Descripción Operativa

El módulo de Proveedores es el núcleo de gestión de entidades comerciales externas. Su objetivo es centralizar la información administrativa, financiera y de inocuidad, permitiendo un control **360°** sobre la cadena de suministro, alineado con las normativas **ISO 22000** y el flujo de **DTE del SII Chile**.

#### 2. Arquitectura de Archivos

Bajo el estándar de "Dumb Server", el módulo se compone de:

- **V_Proveedores.html (Vista):** Contenedor SPA en Bootstrap 5.3. Gestiona la interfaz de filtros, la botonera de acciones y el área de renderizado de tablas dinámicas.
- **S_Proveedores.html (Controlador):** Lógica de negocio en el cliente. Procesa la hidratación de datos desde la RAM, el motor de gráficos vectoriales (SVG) y el enrutamiento transaccional hacia el núcleo.

#### 3. Modelo de Datos (URS-28 Mapping)

El módulo opera sobre la tabla `MAESTRO_PROVEEDORES` utilizando `RUT_ENTIDAD` como llave primaria (PK) inmutable.

| Campo (Header) | Tipo | Descripción / Regla |
| :--- | :--- | :--- |
| `RUT_ENTIDAD` | PK | Identidad tributaria validada mediante algoritmo Módulo 11. |
| `RAZON_SOCIAL` | String | Nombre legal de la entidad (Upper Case). |
| `ISO_RIESGO` | Enum | Estado de inocuidad: `ACTIVO`, `BLOQUEADO`, `EVALUACION`. |
| `STATUS` | Enum | Estado lógico en sistema: `ACTIVO`, `INACTIVO`. |
| `CONDICION_PAGO` | String | Términos comerciales de tesorería. |
| `OBSERVACIONES` | Text | Notas preventivas de auditoría. |

#### 4. Funcionalidades Críticas y BI en Memoria

##### A. Análisis 360° (Full Traceability)

Motor de cruce relacional en RAM que integra tres dimensiones del dato:

1. **Dimensión Operativa:** Historial de facturas recibidas desde `LIBRO_COMPRAS`.
2. **Dimensión Financiera:** Cuotas pendientes y estado de pago desde `CUENTAS_POR_PAGAR`.
3. **Dimensión Analítica:** Gráfico de tendencia de inversión (Línea) de los últimos 12 meses móviles.

##### B. Motor Gráfico SVG Nativo

Implementación de **Business Intelligence (BI)** sin dependencias externas. Genera representaciones visuales de series de tiempo utilizando vectores SVG calculados en tiempo real, optimizando el rendimiento del navegador y respetando la arquitectura **Zero Trust**.

##### C. Matriz de Alérgenos por Excepción

Protocolo de seguridad alimentaria que realiza un *Join* dinámico con `MAESTRO_ITEMS`. Solo visualiza y alerta sobre productos con riesgos biológicos declarados, eliminando el ruido visual de suministros neutros.

#### 5. Protocolos de Seguridad y Cumplimiento

- **Integridad Forense:** Todas las mutaciones (Altas y Ediciones) se canalizan a través de `w_EjecutarTransaccionSegura` en `Core.js`, registrando la IP del cliente y generando un hash SHA-256 para la auditoría posterior.
- **Zero-Trust UI:** La edición de registros está delegada a la función `Factory._bridge` de `Lib_Factory`, asegurando que no existan disparadores de código huérfanos en el DOM.
- **ISO 22000:** Validación obligatoria del estado de riesgo del proveedor antes de permitir la recepción de lotes en bodega (Módulos dependientes).

---

## 📜 Estándares de Cumplimiento

- **SII Chile:** Procesamiento de XML mediante `SII_MAPPING` definido en `Config.gs`.
- **ISO 22000:** Protocolo **PCC-01** integrado en el flujo de abastecimiento (bloqueo automático de Lotes sin certificar).

---

## 🤖 Directivas para Asistencia por IA (Prompt Engineering)

Cualquier interacción con modelos de lenguaje (LLMs) para analizar, modificar o crear código en este repositorio debe adherirse estrictamente a las siguientes directivas ("Flujo de Hierro").

### 1. REGLAS DE CÓDIGO INTOCABLE (ZERO-DELETE)**

- **Prohibido eliminar, refactorizar u omitir funciones existentes** que no estén relacionadas con el error reportado (ej. no omitir telemetría, funciones de `logout` o utilidades de UI por ahorrar espacio).
- Si el código hace referencia a una función que no está en el prompt o contexto actual, **NO LA INVENTES**. La IA debe detenerse y pedir que se le proporcione el archivo original donde reside esa función.
- **Cruce de Datos Seguro:** Prohibido usar índices fijos o hardcodeados (ej. `tabla[0][2]`). Toda búsqueda debe ser mediante cabecera dinámica usando el motor de exploración activa de `Utils.html`.

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
