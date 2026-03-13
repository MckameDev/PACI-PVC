// ============================================================
// Utilidades de validación — Frontend
// ============================================================

/**
 * Valida un RUT chileno (formato y dígito verificador).
 * Acepta formatos: 12.345.678-9, 12345678-9, 123456789
 * @returns {{ valid: boolean, formatted: string, error: string }}
 */
export function validateRut(rut) {
  if (!rut || !rut.trim()) {
    return { valid: false, formatted: '', error: 'El RUT es requerido' };
  }

  // Limpiar: quitar puntos, guiones y espacios
  let clean = rut.replace(/[\.\-\s]/g, '').toUpperCase();

  if (clean.length < 7 || clean.length > 9) {
    return { valid: false, formatted: rut, error: 'El RUT debe tener entre 7 y 9 caracteres' };
  }

  // Separar cuerpo y dígito verificador
  const body = clean.slice(0, -1);
  const dvInput = clean.slice(-1);

  // Verificar que el cuerpo sean solo dígitos
  if (!/^\d+$/.test(body)) {
    return { valid: false, formatted: rut, error: 'El cuerpo del RUT debe contener solo números' };
  }

  // Verificar que el DV sea dígito o K
  if (!/^[\dK]$/.test(dvInput)) {
    return { valid: false, formatted: rut, error: 'El dígito verificador debe ser un número o K' };
  }

  // Calcular dígito verificador con módulo 11
  const dvCalculated = calcularDv(parseInt(body, 10));

  if (dvInput !== dvCalculated) {
    return {
      valid: false,
      formatted: formatRut(body, dvInput),
      error: `RUT inválido. El dígito verificador debería ser "${dvCalculated}"`,
    };
  }

  return {
    valid: true,
    formatted: formatRut(body, dvCalculated),
    error: '',
  };
}

/**
 * Calcula el dígito verificador de un RUT chileno.
 * @param {number} rutBody — Cuerpo numérico del RUT (sin DV)
 * @returns {string} — Dígito verificador ('0'-'9' o 'K')
 */
function calcularDv(rutBody) {
  let sum = 0;
  let multiplier = 2;
  let bodyStr = String(rutBody);

  for (let i = bodyStr.length - 1; i >= 0; i--) {
    sum += parseInt(bodyStr[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  if (remainder === 11) return '0';
  if (remainder === 10) return 'K';
  return String(remainder);
}

/**
 * Formatea un RUT a XX.XXX.XXX-X
 */
export function formatRut(body, dv) {
  const bodyStr = String(body);
  const formatted = bodyStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}-${dv}`;
}

/**
 * Auto-formatea input de RUT mientras el usuario escribe.
 * @param {string} value — Valor actual del input
 * @returns {string} — Valor formateado
 */
export function autoFormatRut(value) {
  // Limpiar todo excepto dígitos y K
  let clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length === 0) return '';

  // Si tiene más de 1 caracter, separar body y DV
  if (clean.length > 1) {
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedBody}-${dv}`;
  }

  return clean;
}

/**
 * Valida formato de email
 */
export function validateEmail(email) {
  if (!email || !email.trim()) return 'El email es requerido';
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return 'El formato de email no es válido (ej: usuario@dominio.cl)';
  return '';
}

/**
 * Valida que un código RBD sea alfanumérico (establecimientos)
 */
export function validateCodigoRBD(codigo) {
  if (!codigo) return ''; // Es opcional
  if (!/^[a-zA-Z0-9\-_.]+$/.test(codigo.trim())) {
    return 'El código RBD solo puede contener letras, números, guiones y puntos (ej: RBD-12345)';
  }
  return '';
}

/**
 * Valida que un campo string requerido no esté vacío
 */
export function validateRequired(value, label = 'Este campo') {
  if (!value || !String(value).trim()) return `${label} es requerido`;
  return '';
}

/**
 * Valida longitud mínima
 */
export function validateMinLength(value, min, label = 'Este campo') {
  if (value && String(value).trim().length < min) {
    return `${label} debe tener al menos ${min} caracteres`;
  }
  return '';
}

/**
 * Valida que un campo de código/identificador solo tenga letras, números, guiones
 */
export function validateCode(value, label = 'El código') {
  if (!value) return ''; // Si es opcional
  if (!/^[a-zA-Z0-9\-_.]+$/.test(value.trim())) {
    return `${label} solo puede contener letras, números, guiones y puntos (ej: LEN-OA1)`;
  }
  return '';
}

/**
 * Extrae y formatea errores de respuesta de la API.
 * Soporta tanto { message: "..." } como { errors: { field: ["msg"] } }
 */
export function extractApiErrors(err) {
  const data = err.response?.data;
  if (!data) return 'Error de conexión con el servidor';

  // Si hay errores de validación por campo
  if (data.errors && typeof data.errors === 'object') {
    const messages = Object.entries(data.errors)
      .map(([field, msgs]) => {
        const fieldMsgs = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
        return `${field}: ${fieldMsgs}`;
      });
    return messages.join(' | ');
  }

  return data.message || 'Error inesperado';
}
