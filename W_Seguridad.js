/**
* @file W_Seguridad.gs
* @description Motor Zero Trust. Autenticación y Gestión de Usuarios (Estándar URS-28).
*/

// ==========================================
// 1. MOTOR DE AUTENTICACIÓN (Fase 1)
// ==========================================
/**
* @description Motor Zero Trust. v2.3.0 - Fix IP & Trazabilidad Única.
*/

function w_verificarIdentidadZeroTrust(ip) {
  const LOCK = LockService.getScriptLock();
  try {
    LOCK.waitLock(10000);

    const emailStr = String(Session.getActiveUser().getEmail() || "").toLowerCase().trim();
    if (!emailStr) throw new Error("Identidad de Google no detectada.");

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const wsUsers = ss.getSheetByName('MAESTRO_USUARIOS');
    const usersData = wsUsers.getDataRange().getValues();
    const userHeaders = usersData[0].map(h => String(h).trim().toUpperCase());
    
    const idxEmail = userHeaders.indexOf('EMAIL');
    const userRow = usersData.slice(1).find(r => String(r[idxEmail]).toLowerCase().trim() === emailStr);

    // 1. CASO: USUARIO NO EXISTE
    if (!userRow) {
      const newUuid = Utilities.getUuid();
      registrarLogInterno('AUTH_REGISTER', 'SEGURIDAD', newUuid, 'N/A', 'PENDIENTE', `Auto-registro: ${emailStr}`, ip);
      return JSON.stringify({ authorized: false, status: 'PENDIENTE', email: emailStr });
    }

    const uuid = userRow[userHeaders.indexOf('ID_UUID')];
    const status = String(userRow[userHeaders.indexOf('STATUS')]).trim().toUpperCase();
    const nivelAcceso = parseInt(userRow[userHeaders.indexOf('NIVEL_ACCESO')], 10);
  
    // 2. CASO: USUARIO BLOQUEADO
    if (status !== 'ACTIVO') {
      registrarLogInterno('AUTH_REJECT', 'SEGURIDAD', uuid, status, status, `Acceso denegado: ${status}`, ip);
      return JSON.stringify({ authorized: false, status: status, email: emailStr });
    }

    // 3. VALIDACIÓN DE ROL Y PERMISOS
    let matrizPermisosStr = '[]';
    let nombreRol = 'Sin Rol';
    const wsRoles = ss.getSheetByName('MAESTRO_ROLES');
    const rolesData = wsRoles.getDataRange().getValues();
    const roleHeaders = rolesData[0].map(h => String(h).trim().toUpperCase());
    const rolRow = rolesData.slice(1).find(r => parseInt(r[roleHeaders.indexOf('ID_ROL')]) === nivelAcceso);

    if (rolRow && String(rolRow[roleHeaders.indexOf('STATUS')]).trim().toUpperCase() === 'ACTIVO') {
        matrizPermisosStr = rolRow[roleHeaders.indexOf('PERMISOS_JSON')] || '[]';
        nombreRol = rolRow[roleHeaders.indexOf('NOMBRE_ROL')] || `Rol ${nivelAcceso}`;
    } else {
        registrarLogInterno('AUTH_REJECT', 'SEGURIDAD', uuid, 'N/A', 'N/A', `Rol inválido: ${nivelAcceso}`, ip);
        return JSON.stringify({ authorized: false, status: 'ROL_INACTIVO', email: emailStr });
    }
   
    // 🚀 REGISTRO ÚNICO: Usamos el motor de hash centralizado
    w_registrarLogForense('AUTH_SUCCESS', 'SEGURIDAD', uuid, `Ingreso exitoso. Rol: ${nombreRol}`, ip);

    return JSON.stringify({
      authorized: true,
      status: 'ACTIVO',
      email: emailStr,
      nivel_acceso: nivelAcceso,
      nombres: userRow[userHeaders.indexOf('NOMBRES')],
      uuid: uuid,
      nombre_rol: nombreRol,
      matriz_permisos: matrizPermisosStr // Sigue siendo string, el frontend lo parsea
    });

    // 🚀 LOG FINAL DE ÉXITO (Aquí es donde la IP se asocia al Login)
    registrarLogInterno('AUTH_SUCCESS', 'SEGURIDAD', uuid, 'N/A', 'N/A', `Ingreso exitoso. Rol: ${nombreRol}`, ip);

    return JSON.stringify({
      authorized: true,
      status: 'ACTIVO',
      email: emailStr,
      nivel_acceso: nivelAcceso,
      nombres: userRow[userHeaders.indexOf('NOMBRES')],
      uuid: uuid,
      nombre_rol: nombreRol,
      matriz_permisos: matrizPermisosStr
    });

  } catch (error) {
    registrarLogInterno('AUTH_ERROR', 'SEGURIDAD', 'N/A', 'N/A', 'N/A', `Error: ${error.message}`, ip);
    return JSON.stringify({ error: true, message: error.message, authorized: false });
  } finally {
    LOCK.releaseLock();
  }
}
/**
 * ============================================================================
 * CONTROLADORES DE ESCRITURA DE SEGURIDAD
 * ============================================================================
 */

function w_upsertUsuario(payloadStr) {
  const LOCK = LockService.getScriptLock();
  try {
    // 🚨 1. BARRERA ZERO TRUST: ¿Está activo Y tiene permiso de 'seguridad'?
    if (!w_verificarEstadoSesion('seguridad')) {
      return JSON.stringify({ error: true, tipo: 'FATAL_AUTH', mensaje: 'Sesión revocada o privilegios insuficientes.' });
    }

    LOCK.waitLock(10000);
    const payload = JSON.parse(payloadStr);
    const tabla = CONFIG.DB.USUARIOS || 'MAESTRO_USUARIOS';

    // ... (El resto de tu lógica de guardado sigue exactamente igual)
    if (payload.ID_UUID === 'NUEVO') {
      payload.ID_UUID = Utilities.getUuid();
      UTIL_CrearFilaSegura(tabla, payload);
      w_registrarAuditoriaFrontend('CREATE', 'SEGURIDAD', payload.ID_UUID, 'Nuevo Usuario', '', payload.EMAIL);
    } else {
      UTIL_ActualizarFilaSegura(tabla, 'ID_UUID', payload.ID_UUID, payload);
      w_registrarAuditoriaFrontend('UPDATE', 'SEGURIDAD', payload.ID_UUID, 'Modificación de Usuario', '', payload.EMAIL);
    }

    return JSON.stringify({ error: false, success: true });

  } catch (e) {
    console.error("❌ Fallo en w_upsertUsuario:", e);
    return JSON.stringify({ error: true, message: e.message });
  } finally {
    LOCK.releaseLock();
  }
}

function w_upsertRol(payload) {
  const LOCK = LockService.getScriptLock();
  try {
    // 🚨 1. BARRERA ZERO TRUST: ¿Está activo Y tiene permiso de 'seguridad'?
    if (!w_verificarEstadoSesion('seguridad')) {
      return JSON.stringify({ error: true, tipo: 'FATAL_AUTH', mensaje: 'Sesión revocada o privilegios insuficientes.' });
    }

    LOCK.waitLock(10000);
    const tabla = CONFIG.DB.ROLES || 'MAESTRO_ROLES';
    
    // ... (El resto de tu lógica sigue igual)
    const objGuardar = {
      ID_ROL: payload.id_rol,
      NOMBRE_ROL: payload.nombre_rol,
      STATUS: payload.status,
      PERMISOS_JSON: JSON.stringify(payload.permisos)
    };

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tabla);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idCol = headers.indexOf('ID_ROL');
    const existe = data.some((row, i) => i > 0 && String(row[idCol]) === String(payload.id_rol));

    if (!existe) {
      UTIL_CrearFilaSegura(tabla, objGuardar);
      w_registrarAuditoriaFrontend('CREATE', 'SEGURIDAD', payload.id_rol, 'Nuevo Rol', '', payload.nombre_rol);
    } else {
      UTIL_ActualizarFilaSegura(tabla, 'ID_ROL', payload.id_rol, objGuardar);
      w_registrarAuditoriaFrontend('UPDATE', 'SEGURIDAD', payload.id_rol, 'Modificación de Rol', '', payload.nombre_rol);
    }

    return JSON.stringify({ error: false, success: true });

  } catch (e) {
    console.error("❌ Fallo en w_upsertRol:", e);
    return JSON.stringify({ error: true, message: e.message });
  } finally {
    LOCK.releaseLock();
  }
}

function w_logoutAudit(motivo) {
 try {
   if(typeof registrarLogInterno === 'function') registrarLogInterno('AUTH_LOGOUT', 'SEGURIDAD', 'N/A', 'N/A', 'N/A', 'Cierre de sesión manual. Razón: ' + motivo);
   return true;
 } catch (e) { return false; }
}

function w_logoutAuditDiferido(emailFront, timestampCaida) {
 try {
   if(typeof registrarLogInterno === 'function') registrarLogInterno('AUTH_TIMEOUT', 'SEGURIDAD', 'N/A', 'N/A', 'N/A', `[DEAD MAN SWITCH] Caída por inactividad a las: ${timestampCaida}`);
   return true;
 } catch (e) { return false; }
}

// ==========================================================
// 🛡️ MOTOR DE SEGURIDAD ZERO-LATENCY (CACHE SERVICE)
// ==========================================================
function w_pingSeguridadCache() {
 try {
   const emailStr = Session.getActiveUser().getEmail().toLowerCase().trim();
   const cache = CacheService.getScriptCache();
   const cacheKey = "AUTH_" + emailStr;
  
   const datosCacheados = cache.get(cacheKey);
   if (datosCacheados) {
     return JSON.parse(datosCacheados); 
   }
  
   const ss = SpreadsheetApp.getActiveSpreadsheet();
   const wsUsers = ss.getSheetByName('MAESTRO_USUARIOS');
   const dataU = wsUsers.getDataRange().getValues();
   const headU = dataU[0].map(h => String(h).trim().toUpperCase());
  
   const userRow = dataU.slice(1).find(r => String(r[headU.indexOf('EMAIL')]).toLowerCase() === emailStr);
  
   if (!userRow || String(userRow[headU.indexOf('STATUS')]).toUpperCase() !== 'ACTIVO') {
     const respNegativa = { activo: false };
     cache.put(cacheKey, JSON.stringify(respNegativa), 900); 
     return respNegativa;
   }
  
   const idRol = userRow[headU.indexOf('NIVEL_ACCESO')];
   let permisos = [];
  
   if (String(idRol) === "1") {
       permisos = ["*"];
   } else {
       const wsRoles = ss.getSheetByName('MAESTRO_ROLES');
       const dataR = wsRoles.getDataRange().getValues();
       const headR = dataR[0].map(h => String(h).trim().toUpperCase());
       const rolRow = dataR.slice(1).find(r => String(r[headR.indexOf('ID_ROL')]) === String(idRol));
      
       permisos = (rolRow && String(rolRow[headR.indexOf('STATUS')]).toUpperCase() === 'ACTIVO')
                ? JSON.parse(rolRow[headR.indexOf('PERMISOS_JSON')] || '[]') : [];
   }
  
   const respPositiva = { activo: true, permisos: permisos };
   cache.put(cacheKey, JSON.stringify(respPositiva), 900);
   return respPositiva;
  
 } catch(e) {
   return { activo: true };
 }
}


