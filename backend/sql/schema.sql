-- ============================================================
-- PACI_PVC - Schema completo
-- Base de datos MySQL 8.0
-- Convenciones: UUID CHAR(36), soft delete (vigencia), auditoria
-- ============================================================

CREATE DATABASE IF NOT EXISTS PACI_PVC
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE PACI_PVC;

-- ============================================================
-- TABLA: users
-- ============================================================
CREATE TABLE users (
    id CHAR(36) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('Admin', 'Coordinador', 'Docente', 'Especialista') NOT NULL DEFAULT 'Docente',
    limite_estudiantes INT NOT NULL DEFAULT 5,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email),
    INDEX idx_users_vigencia (vigencia),
    INDEX idx_users_rol (rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: establecimientos
-- ============================================================
CREATE TABLE establecimientos (
    id CHAR(36) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    codigo VARCHAR(50) DEFAULT NULL,
    direccion VARCHAR(255) DEFAULT NULL,
    comuna VARCHAR(100) DEFAULT NULL,
    region VARCHAR(100) DEFAULT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_establecimientos_codigo (codigo),
    INDEX idx_establecimientos_vigencia (vigencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: cursos_niveles
-- ============================================================
CREATE TABLE cursos_niveles (
    id CHAR(36) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    valor_numerico INT NOT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_cursos_niveles_nombre (nombre),
    INDEX idx_cursos_niveles_vigencia (vigencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: letras
-- ============================================================
CREATE TABLE letras (
    id CHAR(36) NOT NULL,
    letra CHAR(1) NOT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_letras_letra (letra),
    INDEX idx_letras_vigencia (vigencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: asignaturas
-- ============================================================
CREATE TABLE asignaturas (
    id CHAR(36) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    codigo VARCHAR(50) DEFAULT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_asignaturas_nombre (nombre),
    INDEX idx_asignaturas_vigencia (vigencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: profesores
-- ============================================================
CREATE TABLE profesores (
    id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    establecimiento_id CHAR(36) NOT NULL,
    especialidad VARCHAR(150) DEFAULT NULL,
    cargo VARCHAR(100) DEFAULT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_profesores_vigencia (vigencia),
    INDEX idx_profesores_user (user_id),
    CONSTRAINT fk_profesores_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_profesores_establecimiento FOREIGN KEY (establecimiento_id) REFERENCES establecimientos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: estudiantes
-- ============================================================
CREATE TABLE estudiantes (
    id CHAR(36) NOT NULL,
    rut VARCHAR(20) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    usuario_id CHAR(36) NOT NULL,
    establecimiento_id CHAR(36) NOT NULL,
    curso_nivel_id CHAR(36) NOT NULL,
    letra_id CHAR(36) DEFAULT NULL,
    diagnostico TEXT DEFAULT NULL,
    tipo_nee ENUM('NEET', 'NEEP') NOT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_estudiantes_vigencia (vigencia),
    INDEX idx_estudiantes_rut (rut),
    CONSTRAINT fk_estudiantes_usuario FOREIGN KEY (usuario_id) REFERENCES users(id),
    CONSTRAINT fk_estudiantes_establecimiento FOREIGN KEY (establecimiento_id) REFERENCES establecimientos(id),
    CONSTRAINT fk_estudiantes_curso FOREIGN KEY (curso_nivel_id) REFERENCES cursos_niveles(id),
    CONSTRAINT fk_estudiantes_letra FOREIGN KEY (letra_id) REFERENCES letras(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: oa_db (Objetivos de Aprendizaje)
-- ============================================================
CREATE TABLE oa_db (
    id CHAR(36) NOT NULL,
    id_oa VARCHAR(50) NOT NULL,
    asignatura_id CHAR(36) NOT NULL,
    nivel_trabajo_id CHAR(36) NOT NULL,
    eje VARCHAR(100) DEFAULT NULL,
    tipo_oa VARCHAR(50) DEFAULT NULL,
    codigo_oa VARCHAR(50) DEFAULT NULL,
    texto_oa TEXT NOT NULL,
    habilidad_core VARCHAR(255) DEFAULT NULL,
    es_habilidad_estructural TINYINT(1) DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_oa_id_oa (id_oa),
    INDEX idx_oa_vigencia (vigencia),
    CONSTRAINT fk_oa_asignatura FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id),
    CONSTRAINT fk_oa_nivel FOREIGN KEY (nivel_trabajo_id) REFERENCES cursos_niveles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: indicadores_db
-- ============================================================
CREATE TABLE indicadores_db (
    id CHAR(36) NOT NULL,
    oa_id CHAR(36) NOT NULL,
    nivel_desempeno VARCHAR(50) NOT NULL,
    texto_indicador TEXT NOT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_indicadores_vigencia (vigencia),
    CONSTRAINT fk_indicadores_oa FOREIGN KEY (oa_id) REFERENCES oa_db(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: eval_db (Motor de sugerencias evaluativas)
-- ============================================================
CREATE TABLE eval_db (
    id CHAR(36) NOT NULL,
    habilidad VARCHAR(255) NOT NULL,
    nivel_id CHAR(36) NOT NULL,
    tipo_adecuacion VARCHAR(50) NOT NULL,
    modalidad_sugerida TEXT NOT NULL,
    instrumento_sugerido TEXT NOT NULL,
    criterio_logro TEXT NOT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_eval_vigencia (vigencia),
    CONSTRAINT fk_eval_nivel FOREIGN KEY (nivel_id) REFERENCES cursos_niveles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: paci (Cabecera del documento PACI)
-- ============================================================
CREATE TABLE paci (
    id CHAR(36) NOT NULL,
    estudiante_id CHAR(36) NOT NULL,
    usuario_id CHAR(36) NOT NULL,
    fecha_emision DATE NOT NULL,
    formato_generado ENUM('Compacto', 'Completo', 'Modular') NOT NULL,
    aplica_paec TINYINT(1) DEFAULT 0,
    paec_activadores TEXT DEFAULT NULL,
    paec_estrategias TEXT DEFAULT NULL,
    paec_desregulacion TEXT DEFAULT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_paci_vigencia (vigencia),
    INDEX idx_paci_estudiante (estudiante_id),
    CONSTRAINT fk_paci_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
    CONSTRAINT fk_paci_usuario FOREIGN KEY (usuario_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: paci_trayectoria (Detalle OA del PACI)
-- ============================================================
CREATE TABLE paci_trayectoria (
    id CHAR(36) NOT NULL,
    paci_id CHAR(36) NOT NULL,
    oa_id CHAR(36) NOT NULL,
    nivel_trabajo_id CHAR(36) NOT NULL,
    diferencia_calculada INT NOT NULL,
    tipo_adecuacion ENUM('Acceso', 'Significativa') NOT NULL,
    justificacion_tecnica TEXT DEFAULT NULL,
    eval_modalidad TEXT DEFAULT NULL,
    eval_instrumento TEXT DEFAULT NULL,
    eval_criterio TEXT DEFAULT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_trayectoria_vigencia (vigencia),
    CONSTRAINT fk_trayectoria_paci FOREIGN KEY (paci_id) REFERENCES paci(id),
    CONSTRAINT fk_trayectoria_oa FOREIGN KEY (oa_id) REFERENCES oa_db(id),
    CONSTRAINT fk_trayectoria_nivel FOREIGN KEY (nivel_trabajo_id) REFERENCES cursos_niveles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: perfil_dua
-- ============================================================
CREATE TABLE perfil_dua (
    id CHAR(36) NOT NULL,
    paci_id CHAR(36) NOT NULL,
    fortalezas TEXT DEFAULT NULL,
    barreras TEXT DEFAULT NULL,
    preferencias_representacion TEXT DEFAULT NULL,
    preferencias_expresion TEXT DEFAULT NULL,
    preferencias_motivacion TEXT DEFAULT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_perfil_dua_vigencia (vigencia),
    CONSTRAINT fk_perfil_dua_paci FOREIGN KEY (paci_id) REFERENCES paci(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: expediente_pie
-- ============================================================
CREATE TABLE expediente_pie (
    id CHAR(36) NOT NULL,
    estudiante_id CHAR(36) NOT NULL,
    tipo_documento VARCHAR(100) NOT NULL,
    descripcion TEXT DEFAULT NULL,
    ruta_archivo VARCHAR(500) DEFAULT NULL,
    estado ENUM('Pendiente', 'Completo', 'Revisado') NOT NULL DEFAULT 'Pendiente',
    fecha_documento DATE DEFAULT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_expediente_vigencia (vigencia),
    INDEX idx_expediente_estudiante (estudiante_id),
    CONSTRAINT fk_expediente_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLA: historial_modificaciones
-- ============================================================
CREATE TABLE historial_modificaciones (
    id CHAR(36) NOT NULL,
    tabla_afectada VARCHAR(100) NOT NULL,
    registro_id CHAR(36) NOT NULL,
    campo_modificado VARCHAR(100) NOT NULL,
    valor_anterior TEXT DEFAULT NULL,
    valor_nuevo TEXT DEFAULT NULL,
    accion VARCHAR(50) NOT NULL,
    usuario_id CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_historial_registro (registro_id),
    INDEX idx_historial_tabla (tabla_afectada),
    INDEX idx_historial_usuario (usuario_id),
    CONSTRAINT fk_historial_usuario FOREIGN KEY (usuario_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Usuario administrador inicial (password: admin123)
-- UUID generado estaticamente para bootstrap
-- ============================================================
INSERT INTO users (id, nombre, email, password, rol, limite_estudiantes, vigencia)
VALUES (
    '00000000-0000-4000-a000-000000000001',
    'Administrador',
    'admin@pacipvc.cl',
    '$2y$10$FtiVAjrhD./Q2P7BiIigdeenmrnlz/6ILg5M4ZWAiAP50y3ZUWiYq',
    'Admin',
    999,
    1
);

-- ============================================================
-- SEED: cursos_niveles (NT1..8° con valor_numerico)
-- ============================================================
INSERT INTO cursos_niveles (id, nombre, valor_numerico, vigencia) VALUES
('c0000000-0000-4000-a000-000000000001', 'NT1', 0, 1),
('c0000000-0000-4000-a000-000000000002', 'NT2', 1, 1),
('c0000000-0000-4000-a000-000000000003', '1° Básico', 2, 1),
('c0000000-0000-4000-a000-000000000004', '2° Básico', 3, 1),
('c0000000-0000-4000-a000-000000000005', '3° Básico', 4, 1),
('c0000000-0000-4000-a000-000000000006', '4° Básico', 5, 1),
('c0000000-0000-4000-a000-000000000007', '5° Básico', 6, 1),
('c0000000-0000-4000-a000-000000000008', '6° Básico', 7, 1),
('c0000000-0000-4000-a000-000000000009', '7° Básico', 8, 1),
('c0000000-0000-4000-a000-000000000010', '8° Básico', 9, 1);

-- ============================================================
-- SEED: letras básicas
-- ============================================================
INSERT INTO letras (id, letra, vigencia) VALUES
('d0000000-0000-4000-a000-000000000001', 'A', 1),
('d0000000-0000-4000-a000-000000000002', 'B', 1),
('d0000000-0000-4000-a000-000000000003', 'C', 1),
('d0000000-0000-4000-a000-000000000004', 'D', 1),
('d0000000-0000-4000-a000-000000000005', 'E', 1),
('d0000000-0000-4000-a000-000000000006', 'F', 1);

-- ============================================================
-- SEED: eval_db (Motor de sugerencias evaluativas)
-- Cubre habilidades comunes x niveles x tipo Significativa
-- ============================================================
INSERT INTO eval_db (id, habilidad, nivel_id, tipo_adecuacion, modalidad_sugerida, instrumento_sugerido, criterio_logro, vigencia) VALUES
-- Lectura Inicial (NT1, NT2, 1°)
('e0000000-0000-4000-a000-000000000001', 'Lectura', 'c0000000-0000-4000-a000-000000000001', 'Significativa',
 'Evaluación oral guiada con apoyo de material concreto. Uso de imágenes y láminas para verificar reconocimiento de grafemas y fonemas.',
 'Lista de cotejo por habilidad base.\nRegistro anecdótico estructurado.\nEscala de avance por logro funcional.',
 'Avance respecto a línea base diagnóstica. No comparación normativa con grupo curso. Reconoce al menos 10 grafemas y sus fonemas asociados.', 1),

('e0000000-0000-4000-a000-000000000002', 'Lectura', 'c0000000-0000-4000-a000-000000000002', 'Significativa',
 'Evaluación oral guiada. Lectura compartida con mediación adulta. Evidencia mediante desempeño práctico con textos predecibles.',
 'Lista de cotejo por habilidad lectora emergente.\nRúbrica de progreso individual.\nRegistro anecdótico.',
 'Lee palabras de uso frecuente con apoyo visual. Avance individual respecto a evaluación diagnóstica inicial.', 1),

('e0000000-0000-4000-a000-000000000003', 'Lectura', 'c0000000-0000-4000-a000-000000000003', 'Significativa',
 'Evaluación oral y escrita simplificada. Lectura guiada de textos breves con preguntas de comprensión literal.',
 'Rúbrica adaptada con indicadores simplificados.\nLista de cotejo por comprensión lectora.\nPortafolio de evidencias.',
 'Lee textos breves y responde preguntas literales. Progreso individual sin comparación normativa con el curso.', 1),

-- Escritura (NT1, NT2, 1°)
('e0000000-0000-4000-a000-000000000004', 'Escritura', 'c0000000-0000-4000-a000-000000000001', 'Significativa',
 'Evaluación mediante producción gráfica libre y guiada. Observación de trazos y representaciones simbólicas.',
 'Pauta de observación de grafomotricidad.\nPortafolio de muestras de escritura.\nRegistro fotográfico de producciones.',
 'Realiza trazos con intencionalidad comunicativa. Diferencia dibujo de escritura. Progreso respecto a línea base.', 1),

('e0000000-0000-4000-a000-000000000005', 'Escritura', 'c0000000-0000-4000-a000-000000000002', 'Significativa',
 'Evaluación de escritura emergente con dictado de palabras simples y copia guiada. Uso de material concreto para formación de palabras.',
 'Lista de cotejo de escritura emergente.\nRúbrica adaptada.\nRegistro de producciones escritas.',
 'Escribe su nombre y al menos 5 palabras de uso frecuente. Avance individual según diagnóstico.', 1),

('e0000000-0000-4000-a000-000000000006', 'Escritura', 'c0000000-0000-4000-a000-000000000003', 'Significativa',
 'Evaluación de escritura guiada con apoyo visual. Producción de oraciones simples con estructura sujeto-verbo.',
 'Rúbrica de escritura adaptada.\nPortafolio de textos producidos.\nLista de cotejo.',
 'Produce oraciones simples legibles. Usa mayúscula y punto en al menos 3 de 5 oraciones.', 1),

-- Cálculo / Matemáticas (NT1, NT2, 1°)
('e0000000-0000-4000-a000-000000000007', 'Cálculo', 'c0000000-0000-4000-a000-000000000001', 'Significativa',
 'Evaluación mediante manipulación de material concreto (bloques, fichas). Observación directa de conteo y clasificación.',
 'Pauta de observación de nociones prenuméricas.\nLista de cotejo de clasificación y seriación.\nRegistro anecdótico.',
 'Clasifica objetos por al menos 2 atributos. Realiza conteo hasta 10 con material concreto.', 1),

('e0000000-0000-4000-a000-000000000008', 'Cálculo', 'c0000000-0000-4000-a000-000000000002', 'Significativa',
 'Evaluación práctica con material concreto y pictórico. Resolución de problemas simples con apoyo visual.',
 'Lista de cotejo de habilidades numéricas.\nRúbrica de resolución de problemas simples.\nRegistro de desempeño.',
 'Cuenta hasta 20. Realiza adiciones y sustracciones hasta 10 con material concreto. Progreso individual.', 1),

('e0000000-0000-4000-a000-000000000009', 'Cálculo', 'c0000000-0000-4000-a000-000000000003', 'Significativa',
 'Evaluación con apoyo concreto y pictórico. Problemas matemáticos contextualizados con cantidades pequeñas.',
 'Rúbrica adaptada de resolución de problemas.\nLista de cotejo de operaciones básicas.\nPortafolio.',
 'Resuelve adiciones y sustracciones hasta 20. Identifica al menos 3 de 5 figuras geométricas básicas.', 1),

-- Comprensión Oral (NT1, NT2, 1°)
('e0000000-0000-4000-a000-000000000010', 'Comprensión oral', 'c0000000-0000-4000-a000-000000000001', 'Significativa',
 'Evaluación mediante narración oral guiada. Preguntas simples sobre relatos breves con apoyo de imágenes.',
 'Pauta de observación de comprensión oral.\nRegistro anecdótico.\nLista de cotejo de vocabulario receptivo.',
 'Responde preguntas simples sobre relatos narrados. Sigue instrucciones de 2 pasos. Progreso individual.', 1),

('e0000000-0000-4000-a000-000000000011', 'Comprensión oral', 'c0000000-0000-4000-a000-000000000002', 'Significativa',
 'Evaluación oral con preguntas de comprensión literal e inferencial simple sobre textos leídos en voz alta.',
 'Lista de cotejo de comprensión oral.\nRúbrica de participación oral.\nRegistro anecdótico.',
 'Identifica personajes y acciones principales. Responde al menos 3 de 5 preguntas literales sobre un relato.', 1),

('e0000000-0000-4000-a000-000000000012', 'Comprensión oral', 'c0000000-0000-4000-a000-000000000003', 'Significativa',
 'Evaluación oral guiada con textos narrativos e informativos breves. Preguntas literales e inferenciales.',
 'Rúbrica de comprensión oral adaptada.\nLista de cotejo.\nRegistro de participación.',
 'Comprende y retiene información de textos breves. Responde preguntas literales e inferenciales simples.', 1),

-- Habilidades comunes para niveles intermedios (2°, 3°, 4°)
('e0000000-0000-4000-a000-000000000013', 'Lectura', 'c0000000-0000-4000-a000-000000000004', 'Significativa',
 'Evaluación de comprensión lectora con textos adaptados. Lectura oral y silenciosa con preguntas de comprensión.',
 'Rúbrica de comprensión lectora adaptada.\nLista de cotejo de fluidez lectora.\nPortafolio de lecturas.',
 'Lee textos breves con fluidez adecuada. Comprende información explícita e infiere significados simples.', 1),

('e0000000-0000-4000-a000-000000000014', 'Escritura', 'c0000000-0000-4000-a000-000000000004', 'Significativa',
 'Evaluación de producción escrita guiada. Redacción de párrafos cortos con estructura simple.',
 'Rúbrica de escritura adaptada.\nPortafolio de textos.\nLista de cotejo de convenciones.',
 'Produce párrafos con coherencia básica. Usa puntuación en al menos el 60% de los casos.', 1),

('e0000000-0000-4000-a000-000000000015', 'Cálculo', 'c0000000-0000-4000-a000-000000000004', 'Significativa',
 'Evaluación práctica y escrita con apoyo pictórico. Resolución de problemas con operaciones básicas.',
 'Rúbrica de resolución de problemas adaptada.\nLista de cotejo de operaciones.\nEvaluación práctica.',
 'Resuelve operaciones hasta 100. Aplica estrategias de resolución de problemas con apoyo visual.', 1);
