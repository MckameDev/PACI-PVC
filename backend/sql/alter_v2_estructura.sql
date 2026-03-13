-- ============================================================
-- PACI_PVC v2 - Migration: Estructura jerárquica curricular,
-- indicadores seleccionables, meta integradora, PAEC variables
-- ============================================================

USE PACI_PVC;

-- ============================================================
-- 1. TABLA: ejes (Ejes temáticos por asignatura)
-- Permite catálogo formal de ejes en lugar de texto libre
-- ============================================================
CREATE TABLE IF NOT EXISTS ejes (
    id CHAR(36) NOT NULL,
    asignatura_id CHAR(36) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ejes_asig_nombre (asignatura_id, nombre),
    INDEX idx_ejes_vigencia (vigencia),
    CONSTRAINT fk_ejes_asignatura FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. TABLA: adecuaciones_oa (Meta integradora por OA en un PACI)
-- Reemplaza el enfoque columns-in-trayectoria con tabla dedicada
-- ============================================================
CREATE TABLE IF NOT EXISTS adecuaciones_oa (
    id CHAR(36) NOT NULL,
    paci_id CHAR(36) NOT NULL,
    trayectoria_id CHAR(36) NOT NULL,
    meta_integradora TEXT DEFAULT NULL,
    estrategias TEXT DEFAULT NULL,
    adecuaciones TEXT DEFAULT NULL,
    instrumento_evaluacion TEXT DEFAULT NULL,
    justificacion TEXT DEFAULT NULL,
    criterios_evaluacion TEXT DEFAULT NULL,
    observaciones TEXT DEFAULT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_adecuaciones_oa_vigencia (vigencia),
    INDEX idx_adecuaciones_oa_paci (paci_id),
    CONSTRAINT fk_adecuaciones_oa_paci FOREIGN KEY (paci_id) REFERENCES paci(id),
    CONSTRAINT fk_adecuaciones_oa_trayectoria FOREIGN KEY (trayectoria_id) REFERENCES paci_trayectoria(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. TABLA: adecuacion_indicadores (Junction: indicadores seleccionados)
-- Almacena qué indicadores fueron seleccionados para cada adecuación
-- ============================================================
CREATE TABLE IF NOT EXISTS adecuacion_indicadores (
    id CHAR(36) NOT NULL,
    trayectoria_id CHAR(36) NOT NULL,
    indicador_id CHAR(36) NOT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_adec_ind_trayectoria_indicador (trayectoria_id, indicador_id),
    INDEX idx_adec_ind_vigencia (vigencia),
    CONSTRAINT fk_adec_ind_trayectoria FOREIGN KEY (trayectoria_id) REFERENCES paci_trayectoria(id),
    CONSTRAINT fk_adec_ind_indicador FOREIGN KEY (indicador_id) REFERENCES indicadores_db(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. TABLA: paec_variables (Variables PAEC estructuradas)
-- Almacena cada variable PAEC como registro individual
-- ============================================================
CREATE TABLE IF NOT EXISTS paec_variables (
    id CHAR(36) NOT NULL,
    paci_id CHAR(36) NOT NULL,
    tipo ENUM('Activador', 'Estrategia', 'Desregulacion', 'Protocolo') NOT NULL,
    descripcion TEXT NOT NULL,
    estrategia TEXT DEFAULT NULL,
    orden INT DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_paec_variables_vigencia (vigencia),
    INDEX idx_paec_variables_paci (paci_id),
    CONSTRAINT fk_paec_variables_paci FOREIGN KEY (paci_id) REFERENCES paci(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Agregar columna eje_id opcional a oa_db para vincular al catálogo
-- Se mantiene la columna eje existente para retrocompatibilidad
-- ============================================================
ALTER TABLE oa_db
    ADD COLUMN eje_id CHAR(36) DEFAULT NULL AFTER eje,
    ADD INDEX idx_oa_eje_id (eje_id),
    ADD CONSTRAINT fk_oa_eje FOREIGN KEY (eje_id) REFERENCES ejes(id);

-- ============================================================
-- 6. Agregar campo limite_paci a users para control beta
-- ============================================================
ALTER TABLE users
    ADD COLUMN limite_paci INT NOT NULL DEFAULT 50 AFTER limite_estudiantes;
