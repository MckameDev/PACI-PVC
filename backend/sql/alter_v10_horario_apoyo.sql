-- ============================================================
-- MIGRACIÓN v10: Horario de Apoyo para PACI Completo
-- ============================================================

USE PACI_PVC;

-- Cabecera del horario de apoyo por PACI
CREATE TABLE IF NOT EXISTS paci_horario_apoyo (
    id CHAR(36) NOT NULL,
    paci_id CHAR(36) NOT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_horario_apoyo_paci (paci_id),
    INDEX idx_horario_apoyo_vigencia (vigencia),
    CONSTRAINT fk_horario_apoyo_paci FOREIGN KEY (paci_id) REFERENCES paci(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Columnas configurables de la tabla de horario
CREATE TABLE IF NOT EXISTS paci_horario_apoyo_columnas (
    id CHAR(36) NOT NULL,
    horario_id CHAR(36) NOT NULL,
    col_key VARCHAR(60) NOT NULL,
    titulo VARCHAR(120) NOT NULL,
    orden INT NOT NULL DEFAULT 1,
    es_fija TINYINT(1) NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_horario_col_horario (horario_id),
    INDEX idx_horario_col_vigencia (vigencia),
    INDEX idx_horario_col_orden (orden),
    CONSTRAINT fk_horario_col_horario FOREIGN KEY (horario_id) REFERENCES paci_horario_apoyo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Filas de la tabla de horario
CREATE TABLE IF NOT EXISTS paci_horario_apoyo_filas (
    id CHAR(36) NOT NULL,
    horario_id CHAR(36) NOT NULL,
    orden INT NOT NULL DEFAULT 1,
    hora VARCHAR(60) DEFAULT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_horario_fila_horario (horario_id),
    INDEX idx_horario_fila_vigencia (vigencia),
    INDEX idx_horario_fila_orden (orden),
    CONSTRAINT fk_horario_fila_horario FOREIGN KEY (horario_id) REFERENCES paci_horario_apoyo(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contenido de cada celda (fila x columna)
CREATE TABLE IF NOT EXISTS paci_horario_apoyo_celdas (
    id CHAR(36) NOT NULL,
    fila_id CHAR(36) NOT NULL,
    columna_id CHAR(36) NOT NULL,
    contenido TEXT DEFAULT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) DEFAULT NULL,
    updated_by CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_horario_celda_fila_col (fila_id, columna_id),
    INDEX idx_horario_celda_fila (fila_id),
    INDEX idx_horario_celda_col (columna_id),
    INDEX idx_horario_celda_vigencia (vigencia),
    CONSTRAINT fk_horario_celda_fila FOREIGN KEY (fila_id) REFERENCES paci_horario_apoyo_filas(id),
    CONSTRAINT fk_horario_celda_col FOREIGN KEY (columna_id) REFERENCES paci_horario_apoyo_columnas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
