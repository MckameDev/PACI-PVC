-- ============================================================
-- MIGRACIÓN v5: Matrices Pedagógicas + Módulos Nuevos
-- PACI PVC v2.0 — ERP Educativo Inclusivo
-- ============================================================
-- Crea:
--   1. 5 tablas catálogo (matrices parametrizadas)
--   2. 5 tablas junction (PACI ↔ Matrices)
--   3. 4 tablas de nuevos módulos (Apoderados, Salud, Antecedentes, Seguimiento)
-- Seed: valores iniciales de matrices basados en Decreto 83/2015
-- ============================================================

USE PACI_PVC;

-- ============================================================
-- 1. TABLAS CATÁLOGO: MATRICES PEDAGÓGICAS
-- ============================================================

-- 1.1 Matriz de Fortalezas del Estudiante
CREATE TABLE IF NOT EXISTS matriz_fortalezas (
    id CHAR(36) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    categoria VARCHAR(100) DEFAULT NULL,
    orden INT NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_matriz_fortalezas_vigencia (vigencia),
    INDEX idx_matriz_fortalezas_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.2 Matriz de Barreras de Aprendizaje
CREATE TABLE IF NOT EXISTS matriz_barreras (
    id CHAR(36) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    categoria VARCHAR(100) DEFAULT NULL,
    orden INT NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_matriz_barreras_vigencia (vigencia),
    INDEX idx_matriz_barreras_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.3 Matriz de Estrategias DUA
CREATE TABLE IF NOT EXISTS matriz_estrategias_dua (
    id CHAR(36) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    principio_dua ENUM('Representacion', 'Expresion', 'Motivacion') NOT NULL,
    categoria VARCHAR(100) DEFAULT NULL,
    orden INT NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_matriz_estrategias_dua_vigencia (vigencia),
    INDEX idx_matriz_estrategias_dua_principio (principio_dua),
    INDEX idx_matriz_estrategias_dua_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.4 Matriz de Acceso Curricular
CREATE TABLE IF NOT EXISTS matriz_acceso_curricular (
    id CHAR(36) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT DEFAULT NULL,
    orden INT NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_matriz_acceso_vigencia (vigencia),
    INDEX idx_matriz_acceso_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1.5 Matriz de Habilidades Base
CREATE TABLE IF NOT EXISTS matriz_habilidades_base (
    id CHAR(36) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT DEFAULT NULL,
    orden INT NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_matriz_habilidades_vigencia (vigencia),
    INDEX idx_matriz_habilidades_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. TABLAS JUNCTION: PACI ↔ MATRICES
-- ============================================================

-- 2.1 PACI ↔ Fortalezas seleccionadas
CREATE TABLE IF NOT EXISTS paci_fortalezas (
    id CHAR(36) NOT NULL,
    paci_id CHAR(36) NOT NULL,
    fortaleza_id CHAR(36) NOT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_paci_fortaleza (paci_id, fortaleza_id),
    INDEX idx_paci_fortalezas_vigencia (vigencia),
    CONSTRAINT fk_paci_fort_paci FOREIGN KEY (paci_id) REFERENCES paci(id),
    CONSTRAINT fk_paci_fort_matriz FOREIGN KEY (fortaleza_id) REFERENCES matriz_fortalezas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.2 PACI ↔ Barreras seleccionadas
CREATE TABLE IF NOT EXISTS paci_barreras (
    id CHAR(36) NOT NULL,
    paci_id CHAR(36) NOT NULL,
    barrera_id CHAR(36) NOT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_paci_barrera (paci_id, barrera_id),
    INDEX idx_paci_barreras_vigencia (vigencia),
    CONSTRAINT fk_paci_barr_paci FOREIGN KEY (paci_id) REFERENCES paci(id),
    CONSTRAINT fk_paci_barr_matriz FOREIGN KEY (barrera_id) REFERENCES matriz_barreras(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.3 PACI ↔ Estrategias DUA seleccionadas
CREATE TABLE IF NOT EXISTS paci_estrategias_dua (
    id CHAR(36) NOT NULL,
    paci_id CHAR(36) NOT NULL,
    estrategia_id CHAR(36) NOT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_paci_estrategia_dua (paci_id, estrategia_id),
    INDEX idx_paci_estrategias_dua_vigencia (vigencia),
    CONSTRAINT fk_paci_edua_paci FOREIGN KEY (paci_id) REFERENCES paci(id),
    CONSTRAINT fk_paci_edua_matriz FOREIGN KEY (estrategia_id) REFERENCES matriz_estrategias_dua(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.4 PACI ↔ Acceso Curricular seleccionado
CREATE TABLE IF NOT EXISTS paci_acceso_curricular (
    id CHAR(36) NOT NULL,
    paci_id CHAR(36) NOT NULL,
    acceso_id CHAR(36) NOT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_paci_acceso (paci_id, acceso_id),
    INDEX idx_paci_acceso_vigencia (vigencia),
    CONSTRAINT fk_paci_acc_paci FOREIGN KEY (paci_id) REFERENCES paci(id),
    CONSTRAINT fk_paci_acc_matriz FOREIGN KEY (acceso_id) REFERENCES matriz_acceso_curricular(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.5 PACI ↔ Habilidades Base seleccionadas
CREATE TABLE IF NOT EXISTS paci_habilidades_base (
    id CHAR(36) NOT NULL,
    paci_id CHAR(36) NOT NULL,
    habilidad_id CHAR(36) NOT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_paci_habilidad (paci_id, habilidad_id),
    INDEX idx_paci_habilidades_vigencia (vigencia),
    CONSTRAINT fk_paci_hab_paci FOREIGN KEY (paci_id) REFERENCES paci(id),
    CONSTRAINT fk_paci_hab_matriz FOREIGN KEY (habilidad_id) REFERENCES matriz_habilidades_base(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. NUEVOS MÓDULOS
-- ============================================================

-- 3.1 Apoderados
CREATE TABLE IF NOT EXISTS apoderados (
    id CHAR(36) NOT NULL,
    estudiante_id CHAR(36) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    rut VARCHAR(20) DEFAULT NULL,
    parentesco VARCHAR(100) DEFAULT NULL,
    telefono VARCHAR(50) DEFAULT NULL,
    email VARCHAR(150) DEFAULT NULL,
    direccion VARCHAR(255) DEFAULT NULL,
    es_principal TINYINT(1) NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_apoderados_vigencia (vigencia),
    INDEX idx_apoderados_estudiante (estudiante_id),
    CONSTRAINT fk_apoderados_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.2 Salud del Estudiante
CREATE TABLE IF NOT EXISTS salud_estudiante (
    id CHAR(36) NOT NULL,
    estudiante_id CHAR(36) NOT NULL,
    tipo_registro ENUM('Diagnostico', 'Tratamiento', 'Medicacion', 'Terapia', 'Control', 'Otro') NOT NULL,
    descripcion TEXT NOT NULL,
    profesional VARCHAR(200) DEFAULT NULL,
    fecha DATE DEFAULT NULL,
    documento_adjunto VARCHAR(500) DEFAULT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_salud_vigencia (vigencia),
    INDEX idx_salud_estudiante (estudiante_id),
    CONSTRAINT fk_salud_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.3 Antecedentes Escolares
CREATE TABLE IF NOT EXISTS antecedentes_escolares (
    id CHAR(36) NOT NULL,
    estudiante_id CHAR(36) NOT NULL,
    anio VARCHAR(10) NOT NULL,
    establecimiento_origen VARCHAR(200) DEFAULT NULL,
    curso VARCHAR(100) DEFAULT NULL,
    observaciones TEXT DEFAULT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_antecedentes_vigencia (vigencia),
    INDEX idx_antecedentes_estudiante (estudiante_id),
    CONSTRAINT fk_antecedentes_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.4 Seguimiento PACI (Semáforo mensual por OA)
CREATE TABLE IF NOT EXISTS seguimiento_paci (
    id CHAR(36) NOT NULL,
    paci_id CHAR(36) NOT NULL,
    trayectoria_id CHAR(36) NOT NULL,
    mes INT NOT NULL COMMENT '1=Marzo, 2=Abril, ..., 10=Diciembre',
    anio VARCHAR(10) NOT NULL,
    estado ENUM('No Iniciado', 'En Proceso', 'Logrado', 'Logrado con Apoyo') NOT NULL DEFAULT 'No Iniciado',
    observaciones TEXT DEFAULT NULL,
    evidencia VARCHAR(500) DEFAULT NULL,
    fecha_registro DATE DEFAULT NULL,
    usuario_id CHAR(36) DEFAULT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_seguimiento_tray_mes_anio (trayectoria_id, mes, anio),
    INDEX idx_seguimiento_vigencia (vigencia),
    INDEX idx_seguimiento_paci (paci_id),
    INDEX idx_seguimiento_trayectoria (trayectoria_id),
    CONSTRAINT fk_seguimiento_paci FOREIGN KEY (paci_id) REFERENCES paci(id),
    CONSTRAINT fk_seguimiento_trayectoria FOREIGN KEY (trayectoria_id) REFERENCES paci_trayectoria(id),
    CONSTRAINT fk_seguimiento_usuario FOREIGN KEY (usuario_id) REFERENCES users(id),
    CONSTRAINT chk_seguimiento_mes CHECK (mes >= 1 AND mes <= 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. SEED: DATOS INICIALES DE MATRICES PEDAGÓGICAS
-- Basados en Decreto 83/2015 y enfoque DUA
-- ============================================================

-- 4.1 Fortalezas
INSERT INTO matriz_fortalezas (id, nombre, categoria, orden) VALUES
('mf000000-0000-4000-a000-000000000001', 'Buena memoria visual', 'Cognitiva', 1),
('mf000000-0000-4000-a000-000000000002', 'Buena comprensión oral', 'Comunicativa', 2),
('mf000000-0000-4000-a000-000000000003', 'Interés por actividades prácticas', 'Motivacional', 3),
('mf000000-0000-4000-a000-000000000004', 'Interés por la tecnología', 'Motivacional', 4),
('mf000000-0000-4000-a000-000000000005', 'Capacidad de seguir rutinas', 'Conductual', 5),
('mf000000-0000-4000-a000-000000000006', 'Responde bien a refuerzo positivo', 'Conductual', 6);

-- 4.2 Barreras
INSERT INTO matriz_barreras (id, nombre, categoria, orden) VALUES
('mb000000-0000-4000-a000-000000000001', 'Dificultad para mantener la atención', 'Cognitiva', 1),
('mb000000-0000-4000-a000-000000000002', 'Dificultad en comprensión lectora', 'Académica', 2),
('mb000000-0000-4000-a000-000000000003', 'Dificultad en procesamiento del lenguaje', 'Comunicativa', 3),
('mb000000-0000-4000-a000-000000000004', 'Ritmo de trabajo más lento', 'Funcional', 4),
('mb000000-0000-4000-a000-000000000005', 'Dificultades en funciones ejecutivas', 'Cognitiva', 5),
('mb000000-0000-4000-a000-000000000006', 'Baja tolerancia a la frustración', 'Socioemocional', 6);

-- 4.3 Estrategias DUA — Representación
INSERT INTO matriz_estrategias_dua (id, nombre, principio_dua, categoria, orden) VALUES
('me000000-0000-4000-a000-000000000001', 'Material visual (imágenes, esquemas, pictogramas)', 'Representacion', 'Visual', 1),
('me000000-0000-4000-a000-000000000002', 'Material manipulativo o concreto', 'Representacion', 'Kinestésico', 2),
('me000000-0000-4000-a000-000000000003', 'Explicación oral guiada', 'Representacion', 'Auditivo', 3);

-- 4.4 Estrategias DUA — Expresión
INSERT INTO matriz_estrategias_dua (id, nombre, principio_dua, categoria, orden) VALUES
('me000000-0000-4000-a000-000000000004', 'Expresión oral', 'Expresion', 'Oral', 4),
('me000000-0000-4000-a000-000000000005', 'Dibujos o representaciones gráficas', 'Expresion', 'Gráfico', 5),
('me000000-0000-4000-a000-000000000006', 'Uso de tecnología (tablet o computador)', 'Expresion', 'Digital', 6);

-- 4.5 Estrategias DUA — Motivación
INSERT INTO matriz_estrategias_dua (id, nombre, principio_dua, categoria, orden) VALUES
('me000000-0000-4000-a000-000000000007', 'Refuerzo positivo inmediato', 'Motivacion', 'Refuerzo', 7),
('me000000-0000-4000-a000-000000000008', 'Actividades lúdicas o gamificadas', 'Motivacion', 'Lúdico', 8),
('me000000-0000-4000-a000-000000000009', 'Metas cortas y alcanzables', 'Motivacion', 'Estructurado', 9);

-- 4.6 Acceso Curricular
INSERT INTO matriz_acceso_curricular (id, nombre, descripcion, orden) VALUES
('ma000000-0000-4000-a000-000000000001', 'Proceso lector aún no adquirido', 'El estudiante no ha consolidado la decodificación lectora básica', 1),
('ma000000-0000-4000-a000-000000000002', 'Dificultad en escritura', 'El estudiante presenta dificultades en la producción escrita', 2),
('ma000000-0000-4000-a000-000000000003', 'Dificultad en cálculo matemático', 'El estudiante presenta dificultades en operaciones numéricas básicas', 3);

-- 4.7 Habilidades Base
INSERT INTO matriz_habilidades_base (id, nombre, descripcion, orden) VALUES
('mh000000-0000-4000-a000-000000000001', 'Proceso lector', 'Desarrollo y consolidación de habilidades lectoras', 1),
('mh000000-0000-4000-a000-000000000002', 'Comprensión oral', 'Comprensión y procesamiento de información oral', 2),
('mh000000-0000-4000-a000-000000000003', 'Autorregulación', 'Capacidad de regular emociones y comportamiento', 3),
('mh000000-0000-4000-a000-000000000004', 'Autonomía', 'Desarrollo de independencia en tareas cotidianas', 4),
('mh000000-0000-4000-a000-000000000005', 'Habilidades sociales', 'Interacción positiva con pares y adultos', 5);
