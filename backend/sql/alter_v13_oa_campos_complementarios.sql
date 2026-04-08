USE PACI_PVC;

ALTER TABLE adecuaciones_oa
    ADD COLUMN indicadores_nivelados TEXT NULL AFTER estrategias,
    ADD COLUMN actividades_graduales TEXT NULL AFTER adecuaciones,
    ADD COLUMN lectura_complementaria TEXT NULL AFTER actividades_graduales;
