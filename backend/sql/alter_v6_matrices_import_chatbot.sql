-- ============================================================
-- MIGRACIÓN v6: Enriquecimiento Matrices + Chatbot Pedagógico
-- PACI PVC v2.0 — ERP Educativo Inclusivo
-- ============================================================
-- 1. ALTER matriz_fortalezas y matriz_barreras (columnas nuevas)
-- 2. CREATE 4 nuevas matrices (lectura, escritura, comunicación, herramientas)
-- 3. CREATE 2 tablas chatbot (temas + opciones 3 niveles)
-- 4. SEED data para las 6 matrices desde planillas pedagógicas
-- 5. SEED data ejemplo para chatbot
-- ============================================================

USE PACI_PVC;

-- ============================================================
-- 1. ENRIQUECER TABLAS EXISTENTES
-- ============================================================

-- 1.1 Fortalezas: agregar codigo, descripcion_ia, valor_dua
ALTER TABLE matriz_fortalezas
  ADD COLUMN codigo VARCHAR(10) DEFAULT NULL AFTER id,
  ADD COLUMN descripcion_ia TEXT DEFAULT NULL AFTER categoria,
  ADD COLUMN valor_dua VARCHAR(100) DEFAULT NULL AFTER descripcion_ia;

ALTER TABLE matriz_fortalezas
  ADD UNIQUE INDEX uq_matriz_fortalezas_codigo (codigo);

-- 1.2 Barreras: agregar codigo, definicion, dimension
ALTER TABLE matriz_barreras
  ADD COLUMN codigo VARCHAR(10) DEFAULT NULL AFTER id,
  ADD COLUMN definicion TEXT DEFAULT NULL AFTER categoria,
  ADD COLUMN dimension VARCHAR(100) DEFAULT NULL AFTER definicion;

ALTER TABLE matriz_barreras
  ADD UNIQUE INDEX uq_matriz_barreras_codigo (codigo);

-- ============================================================
-- 2. NUEVAS TABLAS DE MATRICES PEDAGÓGICAS
-- ============================================================

-- 2.1 Estrategias de Lectura (L01–L10)
CREATE TABLE IF NOT EXISTS matriz_estrategias_lectura (
    id CHAR(36) NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    momento_lectura VARCHAR(100) DEFAULT NULL,
    descripcion_pedagogica TEXT DEFAULT NULL,
    objetivo_metacognitivo TEXT DEFAULT NULL,
    orden INT NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_estrategias_lectura_codigo (codigo),
    INDEX idx_estrategias_lectura_vigencia (vigencia),
    INDEX idx_estrategias_lectura_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.2 Estrategias de Escritura (E11–E17)
CREATE TABLE IF NOT EXISTS matriz_estrategias_escritura (
    id CHAR(36) NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    problema_ataca VARCHAR(255) DEFAULT NULL,
    descripcion TEXT DEFAULT NULL,
    tipo_apoyo VARCHAR(100) DEFAULT NULL,
    orden INT NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_estrategias_escritura_codigo (codigo),
    INDEX idx_estrategias_escritura_vigencia (vigencia),
    INDEX idx_estrategias_escritura_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.3 Estrategias de Comunicación (C01–C15)
CREATE TABLE IF NOT EXISTS matriz_estrategias_comunicacion (
    id CHAR(36) NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    nivel_sugerido VARCHAR(100) DEFAULT NULL,
    descripcion_pedagogica TEXT DEFAULT NULL,
    foco_intervencion VARCHAR(255) DEFAULT NULL,
    orden INT NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_estrategias_comunicacion_codigo (codigo),
    INDEX idx_estrategias_comunicacion_vigencia (vigencia),
    INDEX idx_estrategias_comunicacion_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.4 Herramientas de Apoyo (V01–V11)
CREATE TABLE IF NOT EXISTS matriz_herramientas_apoyo (
    id CHAR(36) NOT NULL,
    codigo VARCHAR(10) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    proposito_acceso VARCHAR(255) DEFAULT NULL,
    descripcion TEXT DEFAULT NULL,
    barrera_mitiga VARCHAR(255) DEFAULT NULL,
    orden INT NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX uq_herramientas_apoyo_codigo (codigo),
    INDEX idx_herramientas_apoyo_vigencia (vigencia),
    INDEX idx_herramientas_apoyo_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. TABLAS DEL CHATBOT PEDAGÓGICO (Árbol de decisión 3 niveles)
-- ============================================================

-- 3.1 Temas del chatbot (nivel raíz)
CREATE TABLE IF NOT EXISTS chatbot_temas (
    id CHAR(36) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT DEFAULT NULL,
    icono VARCHAR(50) DEFAULT 'MessageCircle',
    orden INT NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_chatbot_temas_vigencia (vigencia),
    INDEX idx_chatbot_temas_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.2 Opciones/nodos del árbol (max 3 niveles: Tema > Pregunta > Respuesta)
CREATE TABLE IF NOT EXISTS chatbot_opciones (
    id CHAR(36) NOT NULL,
    tema_id CHAR(36) NOT NULL,
    parent_id CHAR(36) DEFAULT NULL,
    nivel TINYINT NOT NULL DEFAULT 1,
    texto_opcion VARCHAR(500) NOT NULL,
    texto_respuesta TEXT DEFAULT NULL,
    orden INT NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_chatbot_opciones_tema (tema_id),
    INDEX idx_chatbot_opciones_parent (parent_id),
    INDEX idx_chatbot_opciones_vigencia (vigencia),
    INDEX idx_chatbot_opciones_orden (orden),
    CONSTRAINT fk_chatbot_opciones_tema FOREIGN KEY (tema_id)
        REFERENCES chatbot_temas (id) ON DELETE CASCADE,
    CONSTRAINT fk_chatbot_opciones_parent FOREIGN KEY (parent_id)
        REFERENCES chatbot_opciones (id) ON DELETE CASCADE,
    CONSTRAINT chk_chatbot_opciones_nivel CHECK (nivel BETWEEN 1 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. SEED DATA: MATRICES PEDAGÓGICAS
-- ============================================================

-- 4.1 Barreras de Aprendizaje (B01–B16) — actualizar registros existentes o insertar nuevos
INSERT INTO matriz_barreras (id, codigo, nombre, categoria, definicion, dimension, orden, vigencia, created_at, updated_at)
VALUES
  (UUID(), 'B01', 'Dificultad de comprensión lectora', 'Cognitiva', 'Problemas para extraer significado de textos escritos adecuados a su nivel', 'Curricular', 1, 1, NOW(), NOW()),
  (UUID(), 'B02', 'Baja memoria de trabajo', 'Cognitiva', 'Capacidad reducida para mantener y manipular información temporalmente', 'Neuropsicológica', 2, 1, NOW(), NOW()),
  (UUID(), 'B03', 'Dificultad atencional sostenida', 'Cognitiva', 'Incapacidad de mantener el foco en una tarea por períodos adecuados', 'Neuropsicológica', 3, 1, NOW(), NOW()),
  (UUID(), 'B04', 'Velocidad de procesamiento lenta', 'Cognitiva', 'Respuesta lenta ante estímulos académicos habituales', 'Neuropsicológica', 4, 1, NOW(), NOW()),
  (UUID(), 'B05', 'Escasa motivación intrínseca', 'Socioemocional', 'Baja disposición interna para emprender tareas escolares', 'Motivacional', 5, 1, NOW(), NOW()),
  (UUID(), 'B06', 'Ansiedad ante evaluaciones', 'Socioemocional', 'Respuesta ansiosa desproporcionada frente a situaciones evaluativas', 'Emocional', 6, 1, NOW(), NOW()),
  (UUID(), 'B07', 'Baja tolerancia a la frustración', 'Socioemocional', 'Reacciones desproporcionadas ante errores o dificultades', 'Emocional', 7, 1, NOW(), NOW()),
  (UUID(), 'B08', 'Dificultad en interacción social', 'Socioemocional', 'Problemas para relacionarse con pares en contextos escolares', 'Social', 8, 1, NOW(), NOW()),
  (UUID(), 'B09', 'Dificultad en expresión escrita', 'Comunicativa', 'Problemas para plasmar ideas de forma escrita coherente', 'Curricular', 9, 1, NOW(), NOW()),
  (UUID(), 'B10', 'Dificultad en expresión oral', 'Comunicativa', 'Problemas para comunicar ideas verbalmente ante otros', 'Comunicativa', 10, 1, NOW(), NOW()),
  (UUID(), 'B11', 'Déficit en funciones ejecutivas', 'Cognitiva', 'Dificultad para planificar, organizar y monitorear tareas', 'Neuropsicológica', 11, 1, NOW(), NOW()),
  (UUID(), 'B12', 'Dificultad en razonamiento lógico-matemático', 'Cognitiva', 'Problemas para resolver situaciones que requieren pensamiento abstracto', 'Curricular', 12, 1, NOW(), NOW()),
  (UUID(), 'B13', 'Barrera sensorial auditiva', 'Sensorial', 'Limitaciones en la percepción auditiva que afectan el aprendizaje', 'Acceso', 13, 1, NOW(), NOW()),
  (UUID(), 'B14', 'Barrera sensorial visual', 'Sensorial', 'Limitaciones en la percepción visual que afectan el aprendizaje', 'Acceso', 14, 1, NOW(), NOW()),
  (UUID(), 'B15', 'Barrera motora/física', 'Física', 'Limitaciones motrices que afectan la participación escolar', 'Acceso', 15, 1, NOW(), NOW()),
  (UUID(), 'B16', 'Barrera contextual/familiar', 'Contextual', 'Factores del entorno familiar o social que limitan el aprendizaje', 'Contextual', 16, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre), categoria = VALUES(categoria), definicion = VALUES(definicion),
  dimension = VALUES(dimension), orden = VALUES(orden), updated_at = NOW();

-- 4.2 Fortalezas del Estudiante (F01–F15)
INSERT INTO matriz_fortalezas (id, codigo, nombre, categoria, descripcion_ia, valor_dua, orden, vigencia, created_at, updated_at)
VALUES
  (UUID(), 'F01', 'Buena memoria visual', 'Cognitiva', 'El estudiante recuerda mejor la información presentada en formato visual', 'Representación', 1, 1, NOW(), NOW()),
  (UUID(), 'F02', 'Habilidad verbal oral', 'Comunicativa', 'Se expresa con fluidez y claridad al comunicarse oralmente', 'Expresión', 2, 1, NOW(), NOW()),
  (UUID(), 'F03', 'Creatividad e imaginación', 'Cognitiva', 'Genera ideas originales y aborda problemas de forma creativa', 'Motivación', 3, 1, NOW(), NOW()),
  (UUID(), 'F04', 'Motivación por el aprendizaje práctico', 'Motivacional', 'Se involucra activamente en actividades concretas y manipulativas', 'Motivación', 4, 1, NOW(), NOW()),
  (UUID(), 'F05', 'Buenas habilidades sociales', 'Socioemocional', 'Interactúa positivamente con compañeros y adultos', 'Motivación', 5, 1, NOW(), NOW()),
  (UUID(), 'F06', 'Perseverancia ante desafíos', 'Socioemocional', 'Mantiene el esfuerzo frente a tareas difíciles sin rendirse', 'Motivación', 6, 1, NOW(), NOW()),
  (UUID(), 'F07', 'Habilidad en tecnología', 'Instrumental', 'Maneja herramientas digitales con facilidad y confianza', 'Representación', 7, 1, NOW(), NOW()),
  (UUID(), 'F08', 'Buena motricidad fina', 'Motriz', 'Destreza manual adecuada para escritura y manipulación de objetos', 'Expresión', 8, 1, NOW(), NOW()),
  (UUID(), 'F09', 'Pensamiento lógico-secuencial', 'Cognitiva', 'Comprende secuencias y relaciones lógicas con facilidad', 'Representación', 9, 1, NOW(), NOW()),
  (UUID(), 'F10', 'Interés por la lectura', 'Motivacional', 'Disfruta la lectura como actividad voluntaria', 'Motivación', 10, 1, NOW(), NOW()),
  (UUID(), 'F11', 'Capacidad de trabajo autónomo', 'Instrumental', 'Puede trabajar de forma independiente siguiendo instrucciones', 'Expresión', 11, 1, NOW(), NOW()),
  (UUID(), 'F12', 'Empatía y sensibilidad social', 'Socioemocional', 'Comprende y respeta las emociones y perspectivas de otros', 'Motivación', 12, 1, NOW(), NOW()),
  (UUID(), 'F13', 'Buena comprensión auditiva', 'Comunicativa', 'Procesa eficientemente la información presentada oralmente', 'Representación', 13, 1, NOW(), NOW()),
  (UUID(), 'F14', 'Habilidad artística/musical', 'Expresiva', 'Destaca en actividades artísticas, musicales o de expresión corporal', 'Expresión', 14, 1, NOW(), NOW()),
  (UUID(), 'F15', 'Capacidad de autorregulación', 'Socioemocional', 'Gestiona sus emociones y comportamiento de forma apropiada', 'Motivación', 15, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre), categoria = VALUES(categoria), descripcion_ia = VALUES(descripcion_ia),
  valor_dua = VALUES(valor_dua), orden = VALUES(orden), updated_at = NOW();

-- 4.3 Estrategias de Lectura (L01–L10)
INSERT INTO matriz_estrategias_lectura (id, codigo, nombre, momento_lectura, descripcion_pedagogica, objetivo_metacognitivo, orden, vigencia, created_at, updated_at)
VALUES
  (UUID(), 'L01', 'Activación de conocimientos previos', 'Antes', 'Conectar el contenido nuevo con lo que el estudiante ya sabe mediante preguntas, lluvia de ideas o imágenes', 'Preparar esquemas mentales para la nueva información', 1, 1, NOW(), NOW()),
  (UUID(), 'L02', 'Predicción a partir del título e imágenes', 'Antes', 'Formular hipótesis sobre el contenido del texto usando elementos paratextuales', 'Generar expectativas que guíen la lectura activa', 2, 1, NOW(), NOW()),
  (UUID(), 'L03', 'Lectura guiada con pausas', 'Durante', 'El docente modela la lectura deteniéndose en puntos clave para hacer preguntas', 'Monitorear la comprensión durante la lectura', 3, 1, NOW(), NOW()),
  (UUID(), 'L04', 'Subrayado y anotaciones al margen', 'Durante', 'Marcar ideas principales y escribir comentarios breves junto al texto', 'Identificar información relevante y procesarla activamente', 4, 1, NOW(), NOW()),
  (UUID(), 'L05', 'Organizador gráfico durante la lectura', 'Durante', 'Usar mapas conceptuales, tablas o diagramas para estructurar la información del texto', 'Organizar la información de forma visual y jerárquica', 5, 1, NOW(), NOW()),
  (UUID(), 'L06', 'Vocabulario contextual', 'Durante', 'Inferir significado de palabras desconocidas usando el contexto de la oración', 'Desarrollar autonomía para resolver dificultades léxicas', 6, 1, NOW(), NOW()),
  (UUID(), 'L07', 'Resumen por párrafos', 'Después', 'Sintetizar la idea principal de cada párrafo con las propias palabras del estudiante', 'Consolidar la comprensión y evaluar lo aprendido', 7, 1, NOW(), NOW()),
  (UUID(), 'L08', 'Preguntas de comprensión multinivel', 'Después', 'Responder preguntas literales, inferenciales y valorativas sobre el texto', 'Profundizar en los niveles de comprensión lectora', 8, 1, NOW(), NOW()),
  (UUID(), 'L09', 'Relectura focalizada', 'Después', 'Volver al texto para buscar información específica que resuelva dudas', 'Usar la relectura como estrategia de autorregulación', 9, 1, NOW(), NOW()),
  (UUID(), 'L10', 'Conexión texto-vida', 'Después', 'Relacionar el contenido del texto con experiencias personales o conocimientos previos', 'Transferir el aprendizaje a contextos significativos', 10, 1, NOW(), NOW());

-- 4.4 Estrategias de Escritura (E11–E17)
INSERT INTO matriz_estrategias_escritura (id, codigo, nombre, problema_ataca, descripcion, tipo_apoyo, orden, vigencia, created_at, updated_at)
VALUES
  (UUID(), 'E11', 'Planificación con esquema previo', 'Desorganización de ideas', 'Antes de escribir, el estudiante completa un organizador gráfico con ideas principales y secundarias', 'Estructural', 1, 1, NOW(), NOW()),
  (UUID(), 'E12', 'Escritura colaborativa', 'Inseguridad al escribir solo', 'Producción de textos en parejas o grupos pequeños con roles definidos', 'Social', 2, 1, NOW(), NOW()),
  (UUID(), 'E13', 'Dictado al adulto o a herramienta digital', 'Dificultad grafomotriz', 'El estudiante dicta sus ideas y otro las transcribe, separando la generación del registro escrito', 'Tecnológico', 3, 1, NOW(), NOW()),
  (UUID(), 'E14', 'Banco de palabras y conectores', 'Vocabulario limitado', 'Se ofrece un repertorio de palabras y conectores organizados para usar durante la escritura', 'Léxico', 4, 1, NOW(), NOW()),
  (UUID(), 'E15', 'Revisión guiada con pauta', 'Errores recurrentes sin autocorrección', 'El estudiante revisa su texto usando una lista de verificación con criterios claros', 'Metacognitivo', 5, 1, NOW(), NOW()),
  (UUID(), 'E16', 'Modelado de escritura (texto mentor)', 'No saber cómo empezar', 'El docente muestra un texto modelo que sirve de referencia para la estructura y estilo esperados', 'Modelado', 6, 1, NOW(), NOW()),
  (UUID(), 'E17', 'Escritura por etapas con retroalimentación', 'Texto final de baja calidad', 'El proceso de escritura se divide en borradores sucesivos con devolución entre cada etapa', 'Procesual', 7, 1, NOW(), NOW());

-- 4.5 Estrategias de Comunicación (C01–C15)
INSERT INTO matriz_estrategias_comunicacion (id, codigo, nombre, nivel_sugerido, descripcion_pedagogica, foco_intervencion, orden, vigencia, created_at, updated_at)
VALUES
  (UUID(), 'C01', 'Tablero de comunicación con pictogramas', 'NT1–2° Básico', 'Sistema de imágenes organizadas por categorías para comunicar necesidades, deseos e ideas', 'Comunicación Aumentativa', 1, 1, NOW(), NOW()),
  (UUID(), 'C02', 'Sistema PECS (intercambio de imágenes)', 'NT1–4° Básico', 'El estudiante intercambia una tarjeta con imagen para solicitar o expresar algo', 'Comunicación Alternativa', 2, 1, NOW(), NOW()),
  (UUID(), 'C03', 'Modelado verbal del adulto', 'Todos los niveles', 'El docente verbaliza acciones y pensamientos para modelar el uso del lenguaje en contexto', 'Lenguaje expresivo', 3, 1, NOW(), NOW()),
  (UUID(), 'C04', 'Expansión de enunciados', 'NT1–4° Básico', 'El adulto repite la emisión del niño agregando elementos gramaticales o léxicos para enriquecerla', 'Lenguaje expresivo', 4, 1, NOW(), NOW()),
  (UUID(), 'C05', 'Rutinas comunicativas estructuradas', 'NT1–2° Básico', 'Secuencias predecibles de interacción que facilitan la participación comunicativa del estudiante', 'Pragmática', 5, 1, NOW(), NOW()),
  (UUID(), 'C06', 'Turnos de conversación con apoyo visual', 'NT2–6° Básico', 'Se usa un objeto o señal visual que indica quién tiene el turno para hablar', 'Pragmática', 6, 1, NOW(), NOW()),
  (UUID(), 'C07', 'Narración con secuencia de imágenes', '1°–4° Básico', 'El estudiante narra una historia ordenando tarjetas ilustradas en secuencia temporal', 'Discurso narrativo', 7, 1, NOW(), NOW()),
  (UUID(), 'C08', 'Juego simbólico guiado', 'NT1–2° Básico', 'El adulto guía el juego de roles para promover el uso funcional del lenguaje', 'Lenguaje funcional', 8, 1, NOW(), NOW()),
  (UUID(), 'C09', 'Preguntas abiertas graduadas', '3°–8° Básico', 'Se formulan preguntas que aumentan progresivamente en complejidad para estimular la expresión', 'Comprensión y expresión', 9, 1, NOW(), NOW()),
  (UUID(), 'C10', 'Lectura dialógica', 'NT1–4° Básico', 'Lectura compartida donde el adulto hace preguntas, amplía respuestas y conecta con experiencias', 'Comprensión oral', 10, 1, NOW(), NOW()),
  (UUID(), 'C11', 'Uso de aplicaciones de comunicación (AAC)', 'Todos los niveles', 'Dispositivos o apps que generan voz a partir de selección de símbolos o texto', 'Comunicación Aumentativa/Alternativa', 11, 1, NOW(), NOW()),
  (UUID(), 'C12', 'Guiones sociales', '1°–8° Básico', 'Textos breves que anticipan qué decir en situaciones sociales específicas', 'Pragmática social', 12, 1, NOW(), NOW()),
  (UUID(), 'C13', 'Lenguaje de señas como apoyo', 'Todos los niveles', 'Uso de señas específicas para complementar la comunicación oral', 'Comunicación multimodal', 13, 1, NOW(), NOW()),
  (UUID(), 'C14', 'Retroalimentación correctiva implícita', 'Todos los niveles', 'El adulto reformula el enunciado del estudiante de forma correcta sin señalar el error directamente', 'Lenguaje expresivo', 14, 1, NOW(), NOW()),
  (UUID(), 'C15', 'Estimulación del vocabulario temático', '1°–6° Básico', 'Enseñanza explícita de palabras clave organizadas por campos semánticos antes de una actividad', 'Léxico-semántico', 15, 1, NOW(), NOW());

-- 4.6 Herramientas de Apoyo (V01–V11)
INSERT INTO matriz_herramientas_apoyo (id, codigo, nombre, proposito_acceso, descripcion, barrera_mitiga, orden, vigencia, created_at, updated_at)
VALUES
  (UUID(), 'V01', 'Texto a voz (TTS)', 'Acceso a textos escritos', 'Software que lee el texto en voz alta para estudiantes con dificultad lectora', 'Dificultad de comprensión lectora', 1, 1, NOW(), NOW()),
  (UUID(), 'V02', 'Voz a texto (Dictado)', 'Producción escrita sin grafomotricidad', 'Herramienta que transcribe el habla a texto escrito para estudiantes con dificultad motriz o disgrafía', 'Dificultad en expresión escrita', 2, 1, NOW(), NOW()),
  (UUID(), 'V03', 'Calculadora adaptada', 'Acceso al cálculo', 'Calculadoras con funciones básicas o parlantes para estudiantes con discalculia', 'Dificultad en razonamiento lógico-matemático', 3, 1, NOW(), NOW()),
  (UUID(), 'V04', 'Organizador gráfico digital', 'Organización de ideas', 'Software para crear mapas conceptuales, diagramas de flujo y esquemas visuales', 'Déficit en funciones ejecutivas', 4, 1, NOW(), NOW()),
  (UUID(), 'V05', 'Timer visual / Reloj de arena', 'Gestión del tiempo', 'Dispositivo visual que muestra el tiempo restante para completar una tarea', 'Dificultad atencional sostenida', 5, 1, NOW(), NOW()),
  (UUID(), 'V06', 'Audífonos reductores de ruido', 'Control ambiental sensorial', 'Audífonos que reducen estímulos auditivos distractores del entorno', 'Dificultad atencional sostenida', 6, 1, NOW(), NOW()),
  (UUID(), 'V07', 'Atril o plano inclinado', 'Postura y acceso visual', 'Soporte inclinado que mejora el ángulo de lectura/escritura para estudiantes con dificultad motriz', 'Barrera motora/física', 7, 1, NOW(), NOW()),
  (UUID(), 'V08', 'Regla de lectura / Ventana de enfoque', 'Seguimiento visual', 'Herramienta que aísla la línea de texto que se está leyendo para reducir distractores visuales', 'Barrera sensorial visual', 8, 1, NOW(), NOW()),
  (UUID(), 'V09', 'Software de predicción de palabras', 'Producción escrita fluida', 'Programa que sugiere palabras mientras el estudiante escribe para acelerar la producción', 'Dificultad en expresión escrita', 9, 1, NOW(), NOW()),
  (UUID(), 'V10', 'Tablero de comunicación digital (AAC)', 'Comunicación alternativa', 'App con pictogramas y síntesis de voz para estudiantes no verbales o con habla limitada', 'Dificultad en expresión oral', 10, 1, NOW(), NOW()),
  (UUID(), 'V11', 'Adaptador de lápiz / Engrosador', 'Grafomotricidad', 'Accesorio que modifica el agarre del lápiz para facilitar la escritura en estudiantes con dificultad motriz fina', 'Barrera motora/física', 11, 1, NOW(), NOW());

-- ============================================================
-- 5. SEED DATA: CHATBOT PEDAGÓGICO (Ejemplo)
-- ============================================================

-- Tema de ejemplo: Adecuaciones Curriculares
SET @tema1_id = UUID();
INSERT INTO chatbot_temas (id, titulo, descripcion, icono, orden, vigencia, created_at, updated_at)
VALUES (@tema1_id, 'Adecuaciones Curriculares', 'Información sobre tipos de adecuación curricular según Decreto 83/2015', 'BookOpen', 1, 1, NOW(), NOW());

-- Nivel 1: opciones bajo el tema
SET @opc1_1 = UUID();
SET @opc1_2 = UUID();
SET @opc1_3 = UUID();

INSERT INTO chatbot_opciones (id, tema_id, parent_id, nivel, texto_opcion, texto_respuesta, orden, vigencia, created_at, updated_at)
VALUES
  (@opc1_1, @tema1_id, NULL, 1, '¿Qué es una adecuación de acceso?', NULL, 1, 1, NOW(), NOW()),
  (@opc1_2, @tema1_id, NULL, 1, '¿Qué es una adecuación curricular?', NULL, 2, 1, NOW(), NOW()),
  (@opc1_3, @tema1_id, NULL, 1, '¿Cuándo usar adecuación significativa?', NULL, 3, 1, NOW(), NOW());

-- Nivel 2: sub-opciones bajo opción 1
SET @opc2_1 = UUID();
SET @opc2_2 = UUID();

INSERT INTO chatbot_opciones (id, tema_id, parent_id, nivel, texto_opcion, texto_respuesta, orden, vigencia, created_at, updated_at)
VALUES
  (@opc2_1, @tema1_id, @opc1_1, 2, 'Ver definición completa', 'Las adecuaciones de acceso son modificaciones al entorno, materiales o recursos que permiten al estudiante acceder al currículum sin alterar los objetivos de aprendizaje. Ejemplos: uso de TTS, material ampliado, intérprete de señas.', 1, 1, NOW(), NOW()),
  (@opc2_2, @tema1_id, @opc1_1, 2, 'Ver ejemplos prácticos', NULL, 2, 1, NOW(), NOW());

-- Nivel 3: sub-opciones bajo opción 2.2
INSERT INTO chatbot_opciones (id, tema_id, parent_id, nivel, texto_opcion, texto_respuesta, orden, vigencia, created_at, updated_at)
VALUES
  (UUID(), @tema1_id, @opc2_2, 3, 'Ejemplo para discapacidad visual', 'Para un estudiante con baja visión: material impreso con fuente ampliada (Arial 18+), alto contraste, uso de atril inclinado y regla de lectura. También puede usar lector de pantalla en actividades digitales.', 1, 1, NOW(), NOW()),
  (UUID(), @tema1_id, @opc2_2, 3, 'Ejemplo para discapacidad auditiva', 'Para un estudiante con hipoacusia: ubicación preferencial frente al docente, uso de apoyo visual (pictogramas, subtítulos), intérprete de lengua de señas chilena cuando sea necesario.', 2, 1, NOW(), NOW());

-- Nivel 2: sub-opciones bajo opción 2
INSERT INTO chatbot_opciones (id, tema_id, parent_id, nivel, texto_opcion, texto_respuesta, orden, vigencia, created_at, updated_at)
VALUES
  (UUID(), @tema1_id, @opc1_2, 2, 'Adecuación no significativa', 'Las adecuaciones no significativas modifican la forma de presentar o evaluar los OA sin alterar su esencia. Se ajustan tiempos, formatos, apoyos visuales o estrategias metodológicas, manteniendo los mismos objetivos del nivel.', 1, 1, NOW(), NOW()),
  (UUID(), @tema1_id, @opc1_2, 2, 'Adecuación significativa', 'Las adecuaciones significativas implican la modificación de los Objetivos de Aprendizaje, su priorización, o el uso de OA de niveles anteriores. Se aplican cuando la brecha curricular es amplia y requiere un Plan de Adecuación Curricular Individual (PACI).', 2, 1, NOW(), NOW());

-- Nivel 2: sub-opciones bajo opción 3
INSERT INTO chatbot_opciones (id, tema_id, parent_id, nivel, texto_opcion, texto_respuesta, orden, vigencia, created_at, updated_at)
VALUES
  (UUID(), @tema1_id, @opc1_3, 2, 'Criterios para definir significatividad', 'Se recomienda adecuación significativa cuando: (1) la brecha curricular es de 2+ niveles, (2) las adecuaciones de acceso no son suficientes, (3) el estudiante requiere OA priorizados o de un nivel anterior, (4) lo determina el equipo PIE en base a la evaluación integral.', 1, 1, NOW(), NOW()),
  (UUID(), @tema1_id, @opc1_3, 2, 'Ejemplo práctico de PACI significativo', 'Un estudiante de 5° básico con discapacidad intelectual trabaja con OA de 3° básico en Lenguaje (comprensión lectora de textos simples) y Matemáticas (operaciones básicas con material concreto). El PACI documenta estos OA adaptados con indicadores ajustados.', 2, 1, NOW(), NOW());

-- Tema 2: Estrategias DUA
SET @tema2_id = UUID();
INSERT INTO chatbot_temas (id, titulo, descripcion, icono, orden, vigencia, created_at, updated_at)
VALUES (@tema2_id, 'Diseño Universal de Aprendizaje (DUA)', 'Principios y estrategias del DUA para la planificación diversificada', 'Lightbulb', 2, 1, NOW(), NOW());

SET @opc_dua1 = UUID();
SET @opc_dua2 = UUID();
SET @opc_dua3 = UUID();

INSERT INTO chatbot_opciones (id, tema_id, parent_id, nivel, texto_opcion, texto_respuesta, orden, vigencia, created_at, updated_at)
VALUES
  (@opc_dua1, @tema2_id, NULL, 1, 'Principio de Representación', NULL, 1, 1, NOW(), NOW()),
  (@opc_dua2, @tema2_id, NULL, 1, 'Principio de Acción y Expresión', NULL, 2, 1, NOW(), NOW()),
  (@opc_dua3, @tema2_id, NULL, 1, 'Principio de Motivación', NULL, 3, 1, NOW(), NOW());

INSERT INTO chatbot_opciones (id, tema_id, parent_id, nivel, texto_opcion, texto_respuesta, orden, vigencia, created_at, updated_at)
VALUES
  (UUID(), @tema2_id, @opc_dua1, 2, '¿Qué significa?', 'El principio de Representación (el "qué" del aprendizaje) propone ofrecer múltiples formas de presentar la información: visual, auditiva, kinestésica, digital. Esto permite que cada estudiante acceda al contenido según sus canales más fuertes.', 1, 1, NOW(), NOW()),
  (UUID(), @tema2_id, @opc_dua1, 2, 'Estrategias prácticas', 'Usar videos con subtítulos, infografías, material manipulable, lecturas en voz alta con texto proyectado, organizadores gráficos, glosarios visuales y resúmenes en distintos formatos.', 2, 1, NOW(), NOW()),
  (UUID(), @tema2_id, @opc_dua2, 2, '¿Qué significa?', 'El principio de Acción y Expresión (el "cómo" del aprendizaje) propone que los estudiantes puedan demostrar lo aprendido de distintas formas: oral, escrita, gráfica, digital, corporal o artística.', 1, 1, NOW(), NOW()),
  (UUID(), @tema2_id, @opc_dua2, 2, 'Estrategias prácticas', 'Ofrecer opciones de evaluación: exposición oral, maqueta, comic, video, prueba escrita adaptada, portafolio, dramatización. Proporcionar apoyos tecnológicos según necesidad.', 2, 1, NOW(), NOW()),
  (UUID(), @tema2_id, @opc_dua3, 2, '¿Qué significa?', 'El principio de Motivación (el "por qué" del aprendizaje) busca activar el interés, mantener el esfuerzo y fomentar la autorregulación. Se relaciona con hacer el aprendizaje significativo y conectado con los intereses del estudiante.', 1, 1, NOW(), NOW()),
  (UUID(), @tema2_id, @opc_dua3, 2, 'Estrategias prácticas', 'Dar opciones de temas, usar gamificación, establecer metas personalizadas, ofrecer retroalimentación positiva y frecuente, conectar con intereses del estudiante, celebrar logros incrementales.', 2, 1, NOW(), NOW());

-- ============================================================
-- FIN DE MIGRACIÓN v6
-- ============================================================
