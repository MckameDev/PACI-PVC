-- ============================================================
-- ALTER TABLE: Agregar campos clínicos a estudiantes
-- comorbilidad y nivel_subtipo (Decreto 83/2015 - PACI)
-- Ejecutar sobre la BD PACI_PVC
-- ============================================================

USE PACI_PVC;

ALTER TABLE estudiantes
    ADD COLUMN comorbilidad   VARCHAR(255) DEFAULT NULL AFTER diagnostico,
    ADD COLUMN nivel_subtipo  VARCHAR(100) DEFAULT NULL AFTER comorbilidad;
