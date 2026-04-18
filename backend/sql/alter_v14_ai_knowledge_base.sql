-- ==========================================================
-- v14: Base de conocimiento curricular para IA
-- Ejecutar en la BD PACI_PVC
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS ai_knowledge_chunks;
DROP TABLE IF EXISTS ai_knowledge_books;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE IF NOT EXISTS ai_knowledge_books (
    id CHAR(36) PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    autor VARCHAR(180) NULL,
    fuente VARCHAR(255) NULL,
    materia VARCHAR(120) NULL,
    nivel VARCHAR(120) NULL,
    tags_json LONGTEXT NULL,
    resumen LONGTEXT NULL,
    contenido LONGTEXT NOT NULL,
    hash_sha256 CHAR(64) NOT NULL,
    total_chunks INT NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) NULL,
    updated_by CHAR(36) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ai_knowledge_books_hash (hash_sha256),
    INDEX idx_ai_knowledge_books_vigencia (vigencia),
    INDEX idx_ai_knowledge_books_materia (materia),
    INDEX idx_ai_knowledge_books_nivel (nivel),
    INDEX idx_ai_knowledge_books_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
    id CHAR(36) PRIMARY KEY,
    book_id CHAR(36) NOT NULL,
    orden INT NOT NULL,
    texto LONGTEXT NOT NULL,
    keywords TEXT NULL,
    char_count INT NOT NULL DEFAULT 0,
    vigencia TINYINT(1) NOT NULL DEFAULT 1,
    created_by CHAR(36) NULL,
    updated_by CHAR(36) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ai_knowledge_chunks_book_orden (book_id, orden),
    INDEX idx_ai_knowledge_chunks_book_vigencia (book_id, vigencia),
    FULLTEXT KEY ft_ai_knowledge_chunks_texto (texto, keywords),
    CONSTRAINT fk_ai_knowledge_chunks_book
        FOREIGN KEY (book_id) REFERENCES ai_knowledge_books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
