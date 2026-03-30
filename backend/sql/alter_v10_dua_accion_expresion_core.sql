-- ============================================================
-- MIGRACIÓN v10: DUA Acción y Expresión — Core PACI
-- PACI PVC v2.0 — Actualización estrategias Expresión Base
-- ============================================================
-- Cambios:
--   1. Agrega columna `descripcion` a matriz_estrategias_dua
--   2. Desactiva las 3 entradas antiguas de Expresión (vigencia=0)
--   3. Inserta las 5 estrategias core de Acción y Expresión
-- ============================================================

USE PACI_PVC;

-- 1. Agregar columna descripcion a matriz_estrategias_dua (si no existe)
ALTER TABLE matriz_estrategias_dua
    ADD COLUMN IF NOT EXISTS descripcion TEXT DEFAULT NULL AFTER nombre;

-- 2. Desactivar entradas antiguas de Expresión
UPDATE matriz_estrategias_dua
SET vigencia = 0
WHERE id IN (
    'me000000-0000-4000-a000-000000000004',
    'me000000-0000-4000-a000-000000000005',
    'me000000-0000-4000-a000-000000000006'
);

-- 3. Insertar 5 estrategias core de Acción y Expresión (DUA)
INSERT INTO matriz_estrategias_dua (id, nombre, descripcion, principio_dua, categoria, orden) VALUES
(
    'me000000-0000-4000-a000-000000000010',
    'Variación en los métodos de respuesta',
    'Permitir que el estudiante demuestre lo aprendido en distintos formatos: oral, escrito, audio, vídeo o digital.',
    'Expresion',
    'Respuesta',
    10
),
(
    'me000000-0000-4000-a000-000000000011',
    'Uso de tecnologías de apoyo',
    'Incorporar herramientas como dictado por voz, corrector ortográfico, teclado, pictogramas o dispositivos digitales.',
    'Expresion',
    'Digital',
    11
),
(
    'me000000-0000-4000-a000-000000000012',
    'Andamiaje (apoyos estructurados)',
    'Uso de guías, plantillas, organizadores visuales o modelos paso a paso que facilitan la ejecución de la tarea.',
    'Expresion',
    'Andamiaje',
    12
),
(
    'me000000-0000-4000-a000-000000000013',
    'Flexibilidad en tiempo y ejecución',
    'Otorgar tiempo adicional, fragmentar tareas o permitir pausas para favorecer el desempeño.',
    'Expresion',
    'Tiempo',
    13
),
(
    'me000000-0000-4000-a000-000000000014',
    'Autorregulación y autoevaluación',
    'Uso de rúbricas simples, listas de verificación y retroalimentación constante para monitorear el aprendizaje.',
    'Expresion',
    'Autorregulación',
    14
);
