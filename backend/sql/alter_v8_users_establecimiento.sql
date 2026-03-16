-- ============================================================
-- MIGRACIÓN v8: Usuarios por Establecimiento
-- Agrega establecimiento_id a la tabla users
-- Los usuarios Docente/Coordinador/Especialista solo ven
-- estudiantes de su establecimiento. Admin ve todo.
-- ============================================================

-- 1. Agregar columna establecimiento_id a users
ALTER TABLE users
  ADD COLUMN establecimiento_id CHAR(36) DEFAULT NULL AFTER rol;

-- 2. Agregar índice y FK
ALTER TABLE users
  ADD INDEX idx_users_establecimiento (establecimiento_id),
  ADD CONSTRAINT fk_users_establecimiento
    FOREIGN KEY (establecimiento_id) REFERENCES establecimientos(id);
