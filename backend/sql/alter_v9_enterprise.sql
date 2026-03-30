-- ============================================================
-- MIGRACIÓN v9: REESTRUCTURACIÓN ENTERPRISE
-- Fecha: 2026-03-17
-- Objetivo:
--   A) Agregar asignatura_id a la tabla paci (un PACI = una asignatura)
--   B) Agregar UNIQUE compuesto para evitar PACIs duplicados
--   C) Cambiar FK hijas de paci(id) a ON DELETE CASCADE
--   D) Cambiar FK hijas de paci_trayectoria(id) a ON DELETE CASCADE
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- GRUPO A: Columna asignatura_id en paci
-- ────────────────────────────────────────────────────────────

-- A.1 Agregar columna (nullable para no romper PACIs existentes)
ALTER TABLE paci
    ADD COLUMN asignatura_id CHAR(36) DEFAULT NULL AFTER estudiante_id;

-- A.2 Índice para búsquedas rápidas
ALTER TABLE paci
    ADD INDEX idx_paci_asignatura (asignatura_id);

-- A.3 FK hacia asignaturas (RESTRICT: no permitir borrar asignaturas con PACIs activos)
ALTER TABLE paci
    ADD CONSTRAINT fk_paci_asignatura FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id);

-- ────────────────────────────────────────────────────────────
-- GRUPO B: UNIQUE compuesto anti-duplicados
-- Usa columna generada para que soft-deletes (vigencia=0) no bloqueen nuevos registros.
-- MySQL permite múltiples NULL en UNIQUE → vigencia_uk=NULL cuando borrado.
-- ────────────────────────────────────────────────────────────

-- B.1 Columna generada: 1 si activo, NULL si borrado
ALTER TABLE paci
    ADD COLUMN vigencia_uk TINYINT(1) GENERATED ALWAYS AS (IF(vigencia = 1, 1, NULL)) STORED AFTER vigencia;

-- B.2 Restricción: máximo un PACI activo por (estudiante, asignatura, año)
ALTER TABLE paci
    ADD UNIQUE KEY uk_paci_estudiante_asig_anio (estudiante_id, asignatura_id, anio_escolar, vigencia_uk);

-- ────────────────────────────────────────────────────────────
-- GRUPO C: CASCADE en tablas hijas de paci(id) — 10 tablas
-- Al borrar un PACI, todos sus hijos se eliminan automáticamente.
-- ────────────────────────────────────────────────────────────

-- C.1 perfil_dua
ALTER TABLE perfil_dua
    DROP FOREIGN KEY fk_perfil_dua_paci;
ALTER TABLE perfil_dua
    ADD CONSTRAINT fk_perfil_dua_paci FOREIGN KEY (paci_id) REFERENCES paci(id) ON DELETE CASCADE;

-- C.2 paci_trayectoria
ALTER TABLE paci_trayectoria
    DROP FOREIGN KEY fk_trayectoria_paci;
ALTER TABLE paci_trayectoria
    ADD CONSTRAINT fk_trayectoria_paci FOREIGN KEY (paci_id) REFERENCES paci(id) ON DELETE CASCADE;

-- C.3 adecuaciones_oa (FK hacia paci)
ALTER TABLE adecuaciones_oa
    DROP FOREIGN KEY fk_adecuaciones_oa_paci;
ALTER TABLE adecuaciones_oa
    ADD CONSTRAINT fk_adecuaciones_oa_paci FOREIGN KEY (paci_id) REFERENCES paci(id) ON DELETE CASCADE;

-- C.4 paec_variables
ALTER TABLE paec_variables
    DROP FOREIGN KEY fk_paec_variables_paci;
ALTER TABLE paec_variables
    ADD CONSTRAINT fk_paec_variables_paci FOREIGN KEY (paci_id) REFERENCES paci(id) ON DELETE CASCADE;

-- C.5 paci_fortalezas
ALTER TABLE paci_fortalezas
    DROP FOREIGN KEY fk_paci_fort_paci;
ALTER TABLE paci_fortalezas
    ADD CONSTRAINT fk_paci_fort_paci FOREIGN KEY (paci_id) REFERENCES paci(id) ON DELETE CASCADE;

-- C.6 paci_barreras
ALTER TABLE paci_barreras
    DROP FOREIGN KEY fk_paci_barr_paci;
ALTER TABLE paci_barreras
    ADD CONSTRAINT fk_paci_barr_paci FOREIGN KEY (paci_id) REFERENCES paci(id) ON DELETE CASCADE;

-- C.7 paci_estrategias_dua
ALTER TABLE paci_estrategias_dua
    DROP FOREIGN KEY fk_paci_edua_paci;
ALTER TABLE paci_estrategias_dua
    ADD CONSTRAINT fk_paci_edua_paci FOREIGN KEY (paci_id) REFERENCES paci(id) ON DELETE CASCADE;

-- C.8 paci_acceso_curricular
ALTER TABLE paci_acceso_curricular
    DROP FOREIGN KEY fk_paci_acc_paci;
ALTER TABLE paci_acceso_curricular
    ADD CONSTRAINT fk_paci_acc_paci FOREIGN KEY (paci_id) REFERENCES paci(id) ON DELETE CASCADE;

-- C.9 paci_habilidades_base
ALTER TABLE paci_habilidades_base
    DROP FOREIGN KEY fk_paci_hab_paci;
ALTER TABLE paci_habilidades_base
    ADD CONSTRAINT fk_paci_hab_paci FOREIGN KEY (paci_id) REFERENCES paci(id) ON DELETE CASCADE;

-- C.10 seguimiento_paci (FK hacia paci)
ALTER TABLE seguimiento_paci
    DROP FOREIGN KEY fk_seguimiento_paci;
ALTER TABLE seguimiento_paci
    ADD CONSTRAINT fk_seguimiento_paci FOREIGN KEY (paci_id) REFERENCES paci(id) ON DELETE CASCADE;

-- ────────────────────────────────────────────────────────────
-- GRUPO D: CASCADE en tablas hijas de paci_trayectoria(id) — 3 tablas
-- Al borrar una trayectoria, sus indicadores, adecuaciones y seguimiento se eliminan.
-- ────────────────────────────────────────────────────────────

-- D.1 adecuacion_indicadores
ALTER TABLE adecuacion_indicadores
    DROP FOREIGN KEY fk_adec_ind_trayectoria;
ALTER TABLE adecuacion_indicadores
    ADD CONSTRAINT fk_adec_ind_trayectoria FOREIGN KEY (trayectoria_id) REFERENCES paci_trayectoria(id) ON DELETE CASCADE;

-- D.2 adecuaciones_oa (FK hacia paci_trayectoria)
ALTER TABLE adecuaciones_oa
    DROP FOREIGN KEY fk_adecuaciones_oa_trayectoria;
ALTER TABLE adecuaciones_oa
    ADD CONSTRAINT fk_adecuaciones_oa_trayectoria FOREIGN KEY (trayectoria_id) REFERENCES paci_trayectoria(id) ON DELETE CASCADE;

-- D.3 seguimiento_paci (FK hacia paci_trayectoria)
ALTER TABLE seguimiento_paci
    DROP FOREIGN KEY fk_seguimiento_trayectoria;
ALTER TABLE seguimiento_paci
    ADD CONSTRAINT fk_seguimiento_trayectoria FOREIGN KEY (trayectoria_id) REFERENCES paci_trayectoria(id) ON DELETE CASCADE;

-- ────────────────────────────────────────────────────────────
-- GRUPO E: Poblar asignatura_id en PACIs existentes (best-effort)
-- Deduce la asignatura desde el primer OA de la trayectoria.
-- PACIs sin trayectoria quedarán con asignatura_id = NULL.
-- ────────────────────────────────────────────────────────────

UPDATE paci p
    INNER JOIN (
        SELECT pt.paci_id, o.asignatura_id
        FROM paci_trayectoria pt
        INNER JOIN oa_db o ON o.id = pt.oa_id
        WHERE pt.vigencia = 1
        GROUP BY pt.paci_id
    ) sub ON sub.paci_id = p.id
SET p.asignatura_id = sub.asignatura_id
WHERE p.asignatura_id IS NULL;
