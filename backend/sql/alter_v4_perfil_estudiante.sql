-- ============================================================
-- MIGRACIÓN v4: Agregar campos al Perfil del Estudiante (DUA)
-- ============================================================
-- Nuevos campos: acceso_curricular, habilidades_base
-- Ambos almacenan valores pipe-delimited (checkbox múltiple)
-- ============================================================

ALTER TABLE perfil_dua
    ADD COLUMN acceso_curricular TEXT DEFAULT NULL AFTER barreras_personalizadas,
    ADD COLUMN habilidades_base TEXT DEFAULT NULL AFTER preferencias_motivacion;
