-- ==========================================================
-- v12: Configuración Admin para Motor IA OpenRouter
-- Ejecutar en la BD PACI_PVC
-- ==========================================================

CREATE TABLE IF NOT EXISTS ai_admin_configs (
    id CHAR(36) PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL DEFAULT 'Motor PACI v4.0',
    prompt_inicial LONGTEXT NOT NULL,
    modelo VARCHAR(120) NULL,
    temperature DECIMAL(4,2) NULL,
    max_tokens INT NULL,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) NULL,
    updated_by CHAR(36) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ai_admin_configs_vigencia (vigencia),
    INDEX idx_ai_admin_configs_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_admin_parametros (
    id CHAR(36) PRIMARY KEY,
    config_id CHAR(36) NOT NULL,
    clave VARCHAR(100) NOT NULL,
    valor LONGTEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'text',
    descripcion VARCHAR(255) NULL,
    orden INT NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) NULL,
    updated_by CHAR(36) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ai_admin_parametros_config_clave (config_id, clave),
    INDEX idx_ai_admin_parametros_vigencia (vigencia),
    INDEX idx_ai_admin_parametros_orden (orden),
    CONSTRAINT fk_ai_admin_parametros_config
        FOREIGN KEY (config_id) REFERENCES ai_admin_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
