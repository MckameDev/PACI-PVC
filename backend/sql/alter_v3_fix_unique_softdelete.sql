-- ============================================================
-- MIGRACIÓN v3: Corregir UNIQUE constraints para soft-delete
-- ============================================================
-- Problema: Los UNIQUE KEY no consideran vigencia, así que un
-- registro desactivado (vigencia=0) bloquea la creación de uno
-- nuevo con el mismo valor. Se reemplazan por índices normales
-- y la unicidad se controla en la capa de servicio (PHP).
-- ============================================================

-- users: email
ALTER TABLE users DROP INDEX uk_users_email;
ALTER TABLE users ADD INDEX idx_users_email (email);

-- establecimientos: codigo
ALTER TABLE establecimientos DROP INDEX uk_establecimientos_codigo;
ALTER TABLE establecimientos ADD INDEX idx_establecimientos_codigo (codigo);

-- cursos_niveles: nombre
ALTER TABLE cursos_niveles DROP INDEX uk_cursos_niveles_nombre;
ALTER TABLE cursos_niveles ADD INDEX idx_cursos_niveles_nombre (nombre);

-- letras: letra
ALTER TABLE letras DROP INDEX uk_letras_letra;
ALTER TABLE letras ADD INDEX idx_letras_letra (letra);

-- asignaturas: nombre
ALTER TABLE asignaturas DROP INDEX uk_asignaturas_nombre;
ALTER TABLE asignaturas ADD INDEX idx_asignaturas_nombre (nombre);

-- ejes: (asignatura_id, nombre)
ALTER TABLE ejes DROP INDEX uk_ejes_asig_nombre;
ALTER TABLE ejes ADD INDEX idx_ejes_asig_nombre (asignatura_id, nombre);

-- oa_db: id_oa
ALTER TABLE oa_db DROP INDEX uk_oa_id_oa;
ALTER TABLE oa_db ADD INDEX idx_oa_id_oa (id_oa);
