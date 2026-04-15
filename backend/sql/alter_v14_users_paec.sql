-- ==========================================================
-- v14: Campo paec_habilitado en users
-- Controla si el usuario puede ver/usar la sección PAEC
-- al crear un PACI.
-- Ejecutar en la BD PACI_PVC
-- ==========================================================

ALTER TABLE users
  ADD COLUMN paec_habilitado TINYINT(1) NOT NULL DEFAULT 0
  AFTER limite_paci;
