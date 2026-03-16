-- ============================================================
-- MIGRACIÓN v7: Reestructuración OA + Nuevas Tablas Curriculares
-- PACI PVC v2.0 — ERP Educativo Inclusivo
-- ============================================================
-- 1. ALTER oa_db — 6 columnas nuevas
-- 2. ALTER indicadores_db — 3 columnas nuevas
-- 3. CREATE 11 tablas catálogo/runtime curriculares
-- ============================================================

USE PACI_PVC;

-- ============================================================
-- 1. ENRIQUECER TABLA oa_db
-- Nuevas columnas según estructura Excel curricular
-- ============================================================
ALTER TABLE oa_db
    ADD COLUMN ambito              VARCHAR(150) DEFAULT NULL AFTER eje_id,
    ADD COLUMN nucleo              VARCHAR(150) DEFAULT NULL AFTER ambito,
    ADD COLUMN base_de_habilidades VARCHAR(255) DEFAULT NULL AFTER habilidad_core,
    ADD COLUMN nivel_logro         VARCHAR(50)  DEFAULT NULL AFTER base_de_habilidades,
    ADD COLUMN indicador_logro     TEXT         DEFAULT NULL AFTER nivel_logro,
    ADD COLUMN fuente              VARCHAR(100) DEFAULT NULL AFTER indicador_logro;

-- ============================================================
-- 2. ENRIQUECER TABLA indicadores_db
-- Agregar curso, eje y nivel_logro (Inicial/Intermedio/Avanzado)
-- Se mantiene nivel_desempeno (L/ED/NL) para retrocompatibilidad
-- ============================================================
ALTER TABLE indicadores_db
    ADD COLUMN curso       VARCHAR(50)  DEFAULT NULL AFTER oa_id,
    ADD COLUMN eje         VARCHAR(100) DEFAULT NULL AFTER curso,
    ADD COLUMN nivel_logro VARCHAR(50)  DEFAULT NULL AFTER eje;

-- ============================================================
-- 3. NUEVAS TABLAS CURRICULARES
-- ============================================================

-- 3.1 Habilidades del Lenguaje
CREATE TABLE IF NOT EXISTS habilidades_lenguaje (
    id          CHAR(36)     NOT NULL,
    nivel       VARCHAR(50)  DEFAULT NULL,
    eje         VARCHAR(100) DEFAULT NULL,
    habilidad   VARCHAR(150) DEFAULT NULL,
    descripcion TEXT         DEFAULT NULL,
    orden       INT          DEFAULT NULL,
    vigencia    TINYINT(1)   NOT NULL DEFAULT 1,
    created_by  CHAR(36)     DEFAULT NULL,
    updated_by  CHAR(36)     DEFAULT NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_hab_lenguaje_vigencia (vigencia),
    INDEX idx_hab_lenguaje_nivel_eje (nivel, eje)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.2 Activación PACI (tabla de vinculación habilidad → OA → estrategia)
CREATE TABLE IF NOT EXISTS activacion_paci (
    id                  CHAR(36)     NOT NULL,
    habilidad_detectada VARCHAR(150) DEFAULT NULL,
    eje                 VARCHAR(100) DEFAULT NULL,
    core_nivel          VARCHAR(50)  DEFAULT NULL,
    id_oa               VARCHAR(50)  DEFAULT NULL,
    estrategia          VARCHAR(255) DEFAULT NULL,
    adecuacion          VARCHAR(255) DEFAULT NULL,
    actividad           TEXT         DEFAULT NULL,
    orden               INT          DEFAULT NULL,
    vigencia            TINYINT(1)   NOT NULL DEFAULT 1,
    created_by          CHAR(36)     DEFAULT NULL,
    updated_by          CHAR(36)     DEFAULT NULL,
    created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_activacion_vigencia (vigencia),
    INDEX idx_activacion_eje_core (eje, core_nivel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.3 Core Lectura
CREATE TABLE IF NOT EXISTS core_lectura (
    id              CHAR(36)     NOT NULL,
    core_nivel      VARCHAR(50)  DEFAULT NULL,
    core_habilidad  VARCHAR(150) DEFAULT NULL,
    proceso_lector  VARCHAR(150) DEFAULT NULL,
    descripcion     TEXT         DEFAULT NULL,
    orden           INT          DEFAULT NULL,
    vigencia        TINYINT(1)   NOT NULL DEFAULT 1,
    created_by      CHAR(36)     DEFAULT NULL,
    updated_by      CHAR(36)     DEFAULT NULL,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_core_lectura_vigencia (vigencia),
    INDEX idx_core_lectura_nivel (core_nivel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.4 Core Escritura
CREATE TABLE IF NOT EXISTS core_escritura (
    id               CHAR(36)     NOT NULL,
    core_nivel       VARCHAR(50)  DEFAULT NULL,
    core_habilidad   VARCHAR(150) DEFAULT NULL,
    proceso_escritor VARCHAR(150) DEFAULT NULL,
    descripcion      TEXT         DEFAULT NULL,
    orden            INT          DEFAULT NULL,
    vigencia         TINYINT(1)   NOT NULL DEFAULT 1,
    created_by       CHAR(36)     DEFAULT NULL,
    updated_by       CHAR(36)     DEFAULT NULL,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_core_escritura_vigencia (vigencia),
    INDEX idx_core_escritura_nivel (core_nivel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.5 Core Comunicación Oral
CREATE TABLE IF NOT EXISTS core_comunicacion_oral (
    id             CHAR(36)     NOT NULL,
    core_nivel     VARCHAR(50)  DEFAULT NULL,
    core_habilidad VARCHAR(150) DEFAULT NULL,
    proceso_oral   VARCHAR(150) DEFAULT NULL,
    descripcion    TEXT         DEFAULT NULL,
    orden          INT          DEFAULT NULL,
    vigencia       TINYINT(1)   NOT NULL DEFAULT 1,
    created_by     CHAR(36)     DEFAULT NULL,
    updated_by     CHAR(36)     DEFAULT NULL,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_core_comunicacion_vigencia (vigencia),
    INDEX idx_core_comunicacion_nivel (core_nivel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.6 Matriz de Progresión Curricular
CREATE TABLE IF NOT EXISTS matriz_progresion (
    id               CHAR(36)     NOT NULL,
    asignatura       VARCHAR(100) DEFAULT NULL,
    eje              VARCHAR(100) DEFAULT NULL,
    core_nivel       VARCHAR(50)  DEFAULT NULL,
    nivel_curricular VARCHAR(50)  DEFAULT NULL,
    id_oa            VARCHAR(50)  DEFAULT NULL,
    habilidad_clave  VARCHAR(255) DEFAULT NULL,
    orden            INT          DEFAULT NULL,
    vigencia         TINYINT(1)   NOT NULL DEFAULT 1,
    created_by       CHAR(36)     DEFAULT NULL,
    updated_by       CHAR(36)     DEFAULT NULL,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_matriz_progresion_vigencia (vigencia),
    INDEX idx_matriz_progresion_asig_eje (asignatura, eje, core_nivel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.7 Estrategias Core
CREATE TABLE IF NOT EXISTS estrategias_core (
    id         CHAR(36)     NOT NULL,
    asignatura VARCHAR(100) DEFAULT NULL,
    eje        VARCHAR(100) DEFAULT NULL,
    core_nivel VARCHAR(50)  DEFAULT NULL,
    estrategia VARCHAR(255) DEFAULT NULL,
    actividad  TEXT         DEFAULT NULL,
    orden      INT          DEFAULT NULL,
    vigencia   TINYINT(1)   NOT NULL DEFAULT 1,
    created_by CHAR(36)     DEFAULT NULL,
    updated_by CHAR(36)     DEFAULT NULL,
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_estrategias_core_vigencia (vigencia),
    INDEX idx_estrategias_core_eje_nivel (eje, core_nivel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.8 Diagnóstico Core (runtime, vinculada a estudiantes)
CREATE TABLE IF NOT EXISTS diagnostico_core (
    id                   CHAR(36)     NOT NULL,
    estudiante_id        CHAR(36)     DEFAULT NULL,
    curso                VARCHAR(50)  DEFAULT NULL,
    eje                  VARCHAR(100) DEFAULT NULL,
    habilidad_observada  TEXT         DEFAULT NULL,
    core_sugerido        VARCHAR(50)  DEFAULT NULL,
    orden                INT          DEFAULT NULL,
    vigencia             TINYINT(1)   NOT NULL DEFAULT 1,
    created_by           CHAR(36)     DEFAULT NULL,
    updated_by           CHAR(36)     DEFAULT NULL,
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_diagnostico_core_vigencia (vigencia),
    INDEX idx_diagnostico_core_estudiante (estudiante_id),
    CONSTRAINT fk_diagnostico_core_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.9 Progresión Lectora
CREATE TABLE IF NOT EXISTS progresion_lectora (
    id                CHAR(36)     NOT NULL,
    nivel             VARCHAR(50)  DEFAULT NULL,
    core_nivel        VARCHAR(50)  DEFAULT NULL,
    habilidad_lectora VARCHAR(150) DEFAULT NULL,
    descripcion       TEXT         DEFAULT NULL,
    orden             INT          DEFAULT NULL,
    vigencia          TINYINT(1)   NOT NULL DEFAULT 1,
    created_by        CHAR(36)     DEFAULT NULL,
    updated_by        CHAR(36)     DEFAULT NULL,
    created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_progresion_lectora_vigencia (vigencia),
    INDEX idx_progresion_lectora_nivel (nivel, core_nivel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.10 Matriz de Adecuaciones
CREATE TABLE IF NOT EXISTS matriz_adecuaciones (
    id                   CHAR(36)     NOT NULL,
    asignatura           VARCHAR(100) DEFAULT NULL,
    eje                  VARCHAR(100) DEFAULT NULL,
    core_nivel           VARCHAR(50)  DEFAULT NULL,
    dificultad_detectada TEXT         DEFAULT NULL,
    adecuacion_sugerida  TEXT         DEFAULT NULL,
    orden                INT          DEFAULT NULL,
    vigencia             TINYINT(1)   NOT NULL DEFAULT 1,
    created_by           CHAR(36)     DEFAULT NULL,
    updated_by           CHAR(36)     DEFAULT NULL,
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_matriz_adecuaciones_vigencia (vigencia),
    INDEX idx_matriz_adecuaciones_eje_nivel (eje, core_nivel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.11 Progresión Curricular
CREATE TABLE IF NOT EXISTS progresion_curricular (
    id             CHAR(36)     NOT NULL,
    habilidad      VARCHAR(150) DEFAULT NULL,
    nivel_core     VARCHAR(50)  DEFAULT NULL,
    nivel_sugerido VARCHAR(50)  DEFAULT NULL,
    eje            VARCHAR(100) DEFAULT NULL,
    descripcion    TEXT         DEFAULT NULL,
    orden          INT          DEFAULT NULL,
    vigencia       TINYINT(1)   NOT NULL DEFAULT 1,
    created_by     CHAR(36)     DEFAULT NULL,
    updated_by     CHAR(36)     DEFAULT NULL,
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_progresion_curricular_vigencia (vigencia),
    INDEX idx_progresion_curricular_hab_nivel (habilidad, nivel_core)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
