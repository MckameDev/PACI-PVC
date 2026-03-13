-- ============================================================
-- ALTER TABLE: Nuevos campos para PACI, Trayectoria y Perfil DUA
-- Ejecutar sobre la base de datos PACI_PVC
-- ============================================================

USE PACI_PVC;

-- ────────────────────────────────────────────────
-- 1. TABLA paci: campos de identificación ampliada
-- ────────────────────────────────────────────────
ALTER TABLE paci
    ADD COLUMN anio_escolar VARCHAR(20) DEFAULT NULL AFTER formato_generado,
    ADD COLUMN profesor_jefe VARCHAR(200) DEFAULT NULL AFTER anio_escolar,
    ADD COLUMN profesor_asignatura VARCHAR(200) DEFAULT NULL AFTER profesor_jefe,
    ADD COLUMN educador_diferencial VARCHAR(200) DEFAULT NULL AFTER profesor_asignatura;

-- ────────────────────────────────────────────────
-- 2. TABLA paci_trayectoria: campos pedagógicos
-- ────────────────────────────────────────────────
ALTER TABLE paci_trayectoria
    ADD COLUMN meta_especifica TEXT DEFAULT NULL AFTER eval_criterio,
    ADD COLUMN estrategias_dua TEXT DEFAULT NULL AFTER meta_especifica,
    ADD COLUMN habilidades TEXT DEFAULT NULL AFTER estrategias_dua,
    ADD COLUMN seguimiento_registro TEXT DEFAULT NULL AFTER habilidades;

-- ────────────────────────────────────────────────
-- 3. TABLA perfil_dua: barreras personalizadas
-- ────────────────────────────────────────────────
ALTER TABLE perfil_dua
    ADD COLUMN barreras_personalizadas TEXT DEFAULT NULL AFTER barreras;
