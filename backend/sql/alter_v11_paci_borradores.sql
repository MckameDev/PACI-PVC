-- ============================================================
-- MIGRACIÓN v11: Tabla de Borradores PACI (server-side drafts)
-- PACI PVC v2.0 — Reemplaza localStorage con persistencia en BD
-- ============================================================
-- Crea:
--   1. Tabla paci_borradores (1 borrador por usuario)
-- ============================================================

USE PACI_PVC;

CREATE TABLE IF NOT EXISTS paci_borradores (
    id CHAR(36) NOT NULL,
    usuario_id CHAR(36) NOT NULL,
    paso_actual INT NOT NULL DEFAULT 1,
    form_data JSON NOT NULL,
    estudiante_id CHAR(36) DEFAULT NULL,
    asignatura_id CHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_paci_borrador_usuario (usuario_id),
    INDEX idx_paci_borrador_estudiante (estudiante_id),
    CONSTRAINT fk_paci_borrador_usuario FOREIGN KEY (usuario_id) REFERENCES users(id),
    CONSTRAINT fk_paci_borrador_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id) ON DELETE SET NULL,
    CONSTRAINT fk_paci_borrador_asignatura FOREIGN KEY (asignatura_id) REFERENCES asignaturas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
