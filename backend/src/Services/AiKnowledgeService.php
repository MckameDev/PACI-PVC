<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Helpers\Response;
use App\Helpers\UUID;
use PDO;
use Throwable;

class AiKnowledgeService
{
    private const DEFAULT_CHUNK_SIZE = 1200;
    private const DEFAULT_CHUNK_OVERLAP = 220;
    private const MAX_CHUNKS_PER_BOOK = 500;

    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    public function ingestBookFromText(array $data, ?string $userId): array
    {
        $titulo = trim((string) ($data['titulo'] ?? ''));
        $contenido = (string) ($data['contenido'] ?? '');

        $contenido = $this->normalizeText($contenido);
        if (mb_strlen($contenido) < 120) {
            Response::validationError(['contenido' => ['El contenido es demasiado corto para nutrir la IA']]);
        }

        if ($titulo === '') {
            $titulo = $this->inferBookTitle($contenido, $data['fuente'] ?? null);
        }

        $hash = hash('sha256', $contenido);
        $existing = $this->findByHash($hash);
        if ($existing) {
            return [
                'book' => $existing,
                'ingesta' => [
                    'duplicado' => true,
                    'chunks_generados' => (int) ($existing['total_chunks'] ?? 0),
                ],
            ];
        }

        $tags = $this->normalizeTags($data['tags'] ?? null);
        if (empty($tags)) {
            $tags = $this->extractBookTags($contenido);
        }
        $chunkSize = $this->safeInt($data['chunk_size'] ?? self::DEFAULT_CHUNK_SIZE, 600, 2500, self::DEFAULT_CHUNK_SIZE);
        $overlap = $this->safeInt($data['chunk_overlap'] ?? self::DEFAULT_CHUNK_OVERLAP, 80, 600, self::DEFAULT_CHUNK_OVERLAP);

        $chunks = $this->splitIntoChunks($contenido, $chunkSize, $overlap);
        if (empty($chunks)) {
            Response::error('No se pudieron generar fragmentos desde el libro recibido', 422);
        }

        $bookId = UUID::generate();
        $this->db->beginTransaction();

        try {
            $stmt = $this->db->prepare(
                'INSERT INTO ai_knowledge_books
                (id, titulo, autor, fuente, materia, nivel, tags_json, resumen, contenido, hash_sha256, total_chunks, vigencia, created_by, updated_by)
                VALUES
                (:id, :titulo, :autor, :fuente, :materia, :nivel, :tags_json, :resumen, :contenido, :hash_sha256, :total_chunks, 1, :created_by, :updated_by)'
            );

            $stmt->execute([
                ':id' => $bookId,
                ':titulo' => $titulo,
                ':autor' => $this->nullableTrim($data['autor'] ?? null),
                ':fuente' => $this->nullableTrim($data['fuente'] ?? null),
                ':materia' => $this->nullableTrim($data['materia'] ?? null),
                ':nivel' => $this->nullableTrim($data['nivel'] ?? null),
                ':tags_json' => json_encode($tags, JSON_UNESCAPED_UNICODE),
                ':resumen' => $this->buildSummary($contenido),
                ':contenido' => $contenido,
                ':hash_sha256' => $hash,
                ':total_chunks' => count($chunks),
                ':created_by' => $userId,
                ':updated_by' => $userId,
            ]);

            $chunkStmt = $this->db->prepare(
                'INSERT INTO ai_knowledge_chunks
                (id, book_id, orden, texto, keywords, char_count, vigencia, created_by, updated_by)
                VALUES
                (:id, :book_id, :orden, :texto, :keywords, :char_count, 1, :created_by, :updated_by)'
            );

            foreach ($chunks as $idx => $chunkText) {
                $chunkStmt->execute([
                    ':id' => UUID::generate(),
                    ':book_id' => $bookId,
                    ':orden' => $idx + 1,
                    ':texto' => $chunkText,
                    ':keywords' => $this->extractKeywords($chunkText),
                    ':char_count' => mb_strlen($chunkText),
                    ':created_by' => $userId,
                    ':updated_by' => $userId,
                ]);
            }

            $this->db->commit();
        } catch (Throwable $e) {
            $this->db->rollBack();
            throw $e;
        }

        $book = $this->getBookById($bookId);

        return [
            'book' => $book,
            'ingesta' => [
                'duplicado' => false,
                'chunks_generados' => count($chunks),
                'chunk_size' => $chunkSize,
                'chunk_overlap' => $overlap,
            ],
        ];
    }

    public function ingestBookFromUpload(array $file, array $payload, ?string $userId): array
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::error('No se pudo cargar el archivo del libro', 400);
        }

        $tmpPath = (string) ($file['tmp_name'] ?? '');
        if ($tmpPath === '' || !is_file($tmpPath)) {
            Response::error('Archivo temporal no disponible', 400);
        }

        $originalName = (string) ($file['name'] ?? 'libro.txt');
        $extension = strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));
        $allowed = ['txt', 'md', 'csv', 'json', 'html', 'htm', 'docx', 'pdf'];

        if (!in_array($extension, $allowed, true)) {
            Response::error('Formato no soportado. Usa PDF, DOCX, TXT, MD, CSV, JSON o HTML.', 422);
        }

        $content = $this->extractTextFromUpload($tmpPath, $extension);

        $payload['titulo'] = trim((string) ($payload['titulo'] ?? pathinfo($originalName, PATHINFO_FILENAME)));
        $payload['fuente'] = trim((string) ($payload['fuente'] ?? ('upload:' . $originalName)));
        $payload['contenido'] = $content;

        return $this->ingestBookFromText($payload, $userId);
    }

    private function extractTextFromUpload(string $tmpPath, string $extension): string
    {
        if ($extension === 'docx') {
            return $this->extractDocxText($tmpPath);
        }

        if ($extension === 'pdf') {
            return $this->extractPdfText($tmpPath);
        }

        $raw = file_get_contents($tmpPath);
        if ($raw === false) {
            Response::error('No fue posible leer el archivo cargado', 400);
        }

        $content = (string) $raw;
        if ($extension === 'json') {
            $decoded = json_decode($content, true);
            if (is_array($decoded)) {
                $content = json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) ?: $content;
            }
        }

        return $content;
    }

    private function extractDocxText(string $tmpPath): string
    {
        if (!class_exists('ZipArchive')) {
            Response::error('No está habilitado ZipArchive en el servidor para leer DOCX.', 500);
        }

        $zip = new \ZipArchive();
        $opened = $zip->open($tmpPath);
        if ($opened !== true) {
            Response::error('No se pudo abrir el archivo DOCX.', 422);
        }

        $parts = [];
        $candidateEntries = [
            'word/document.xml',
            'word/header1.xml',
            'word/header2.xml',
            'word/footer1.xml',
            'word/footer2.xml',
        ];

        foreach ($candidateEntries as $entry) {
            $xml = $zip->getFromName($entry);
            if ($xml === false) {
                continue;
            }

            $text = strip_tags(str_replace('</w:p>', "\n", (string) $xml));
            $text = html_entity_decode($text, ENT_QUOTES | ENT_XML1, 'UTF-8');
            $parts[] = $text;
        }

        $zip->close();

        $content = trim(implode("\n", $parts));
        if ($content === '') {
            Response::error('No se pudo extraer texto legible del DOCX.', 422);
        }

        return $content;
    }

    private function extractPdfText(string $tmpPath): string
    {
        $phpParserText = $this->extractPdfTextWithPhpParser($tmpPath);
        if ($phpParserText !== '') {
            return $phpParserText;
        }

        if (!$this->isShellExecAvailable()) {
            Response::error('No se pudo leer el PDF con parser PHP y el servidor no permite shell_exec. Verifica que smalot/pdfparser esté instalado o usa DOCX/TXT.', 422);
        }

        $escaped = escapeshellarg($tmpPath);
        $command = 'pdftotext -layout -enc UTF-8 ' . $escaped . ' - 2>' . $this->stderrSink();
        $output = shell_exec($command);

        $text = trim((string) $output);
        if ($text !== '') {
            return $text;
        }

        Response::error('No se pudo extraer texto del PDF. Verifica smalot/pdfparser o instala pdftotext en el servidor.', 422);
    }

    private function extractPdfTextWithPhpParser(string $tmpPath): string
    {
        if (!class_exists(\Smalot\PdfParser\Parser::class)) {
            return '';
        }

        try {
            $parser = new \Smalot\PdfParser\Parser();
            $pdf = $parser->parseFile($tmpPath);
            return trim((string) $pdf->getText());
        } catch (Throwable) {
            return '';
        }
    }

    private function isShellExecAvailable(): bool
    {
        if (!function_exists('shell_exec')) {
            return false;
        }

        $disabled = (string) ini_get('disable_functions');
        if ($disabled === '') {
            return true;
        }

        $disabledFunctions = array_map('trim', explode(',', $disabled));
        return !in_array('shell_exec', $disabledFunctions, true);
    }

    private function stderrSink(): string
    {
        return DIRECTORY_SEPARATOR === '\\' ? 'NUL' : '/dev/null';
    }

    public function listBooks(array $filters = []): array
    {
        $includeInactive = !empty($filters['include_inactive']);
        $materia = $this->nullableTrim($filters['materia'] ?? null);
        $nivel = $this->nullableTrim($filters['nivel'] ?? null);

        $where = [];
        $params = [];

        if (!$includeInactive) {
            $where[] = 'vigencia = 1';
        }

        if ($materia !== null) {
            $where[] = 'materia = :materia';
            $params[':materia'] = $materia;
        }

        if ($nivel !== null) {
            $where[] = 'nivel = :nivel';
            $params[':nivel'] = $nivel;
        }

        $sql = 'SELECT id, titulo, autor, fuente, materia, nivel, tags_json, resumen, total_chunks, vigencia, created_at, updated_at
                FROM ai_knowledge_books';

        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        $sql .= ' ORDER BY updated_at DESC, created_at DESC LIMIT 300';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['tags'] = $this->decodeTags($row['tags_json'] ?? '[]');
            unset($row['tags_json']);
        }

        return $rows;
    }

    public function toggleBook(string $id, ?string $userId): bool
    {
        $stmt = $this->db->prepare(
            'UPDATE ai_knowledge_books
             SET vigencia = CASE WHEN vigencia = 1 THEN 0 ELSE 1 END,
                 updated_by = :updated_by
             WHERE id = :id'
        );

        $stmt->execute([
            ':id' => $id,
            ':updated_by' => $userId,
        ]);

        return $stmt->rowCount() > 0;
    }

    public function searchRelevantChunks(string $query, array $filters = [], int $limit = 8): array
    {
        $query = trim($query);
        if ($query === '') {
            return [];
        }

        $terms = $this->extractQueryTerms($query);
        $limit = $this->safeInt($limit, 1, 20, 8);

        $params = [];
        $where = ['c.vigencia = 1', 'b.vigencia = 1'];

        $materia = $this->nullableTrim($filters['materia'] ?? null);
        if ($materia !== null) {
            $where[] = 'b.materia = :materia';
            $params[':materia'] = $materia;
        }

        $nivel = $this->nullableTrim($filters['nivel'] ?? null);
        if ($nivel !== null) {
            $where[] = 'b.nivel = :nivel';
            $params[':nivel'] = $nivel;
        }

        if (!empty($terms)) {
            $parts = [];
            foreach ($terms as $idx => $term) {
                $k = ':t' . $idx;
                $params[$k] = '%' . $term . '%';
                $parts[] = '(c.texto LIKE ' . $k . ' OR c.keywords LIKE ' . $k . ' OR b.titulo LIKE ' . $k . ')';
            }
            $where[] = '(' . implode(' OR ', $parts) . ')';
        }

        $sql = 'SELECT
                    c.id,
                    c.book_id,
                    c.orden,
                    c.texto,
                    c.keywords,
                    b.titulo,
                    b.autor,
                    b.fuente,
                    b.materia,
                    b.nivel,
                    b.updated_at
                FROM ai_knowledge_chunks c
                INNER JOIN ai_knowledge_books b ON b.id = c.book_id
                WHERE ' . implode(' AND ', $where) . '
                ORDER BY b.updated_at DESC, c.orden ASC
                LIMIT 400';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($rows)) {
            return [];
        }

        $normalizedQuery = $this->normalizeText($query);

        foreach ($rows as &$row) {
            $haystack = $this->normalizeText((string) $row['texto'] . ' ' . (string) $row['keywords'] . ' ' . (string) $row['titulo']);
            $score = 0;

            foreach ($terms as $term) {
                $score += substr_count($haystack, $term) * 2;
            }

            if (str_contains($haystack, $normalizedQuery)) {
                $score += 4;
            }

            $row['score'] = $score;
            $row['extracto'] = $this->buildExcerpt((string) $row['texto'], 340);
        }

        usort(
            $rows,
            static function (array $a, array $b): int {
                $byScore = (int) $b['score'] <=> (int) $a['score'];
                if ($byScore !== 0) {
                    return $byScore;
                }
                return ((int) $a['orden']) <=> ((int) $b['orden']);
            }
        );

        return array_slice($rows, 0, $limit);
    }

    public function buildContextForPrompt(string $query, array $filters = [], int $maxChars = 4500, int $limit = 6): string
    {
        $chunks = $this->searchRelevantChunks($query, $filters, $limit);
        if (empty($chunks)) {
            return '';
        }

        $block = "";
        foreach ($chunks as $idx => $chunk) {
            $line = sprintf(
                "[%d] %s | Materia: %s | Nivel: %s | Fuente: %s\n%s\n\n",
                $idx + 1,
                (string) ($chunk['titulo'] ?? 'Sin titulo'),
                (string) ($chunk['materia'] ?? 'N/A'),
                (string) ($chunk['nivel'] ?? 'N/A'),
                (string) ($chunk['fuente'] ?? 'N/A'),
                $this->buildExcerpt((string) ($chunk['texto'] ?? ''), 700)
            );

            if (mb_strlen($block . $line) > $maxChars) {
                break;
            }

            $block .= $line;
        }

        return trim($block);
    }

    public function buildKnowledgeDigest(int $limit = 12): string
    {
        $books = $this->listBooks(['include_inactive' => false]);
        if (empty($books)) {
            return '- Sin libros activos cargados.';
        }

        $books = array_slice($books, 0, $this->safeInt($limit, 1, 30, 12));

        $lines = [];
        foreach ($books as $book) {
            $tags = array_slice($book['tags'] ?? [], 0, 6);
            $tagLabel = empty($tags) ? 'sin_tags' : implode(', ', $tags);
            $summary = trim((string) ($book['resumen'] ?? ''));
            if ($summary === '') {
                $summary = $this->buildExcerpt((string) ($book['contenido'] ?? ''), 180);
            }

            $lines[] = sprintf(
                '- %s | tags: %s | resumen: %s',
                (string) ($book['titulo'] ?? 'Sin titulo'),
                $tagLabel,
                $this->buildExcerpt($summary, 220)
            );
        }

        return implode("\n", $lines);
    }

    private function splitIntoChunks(string $text, int $chunkSize, int $overlap): array
    {
        $chunks = [];
        $len = mb_strlen($text);
        if ($len === 0) {
            return $chunks;
        }

        $start = 0;
        while ($start < $len && count($chunks) < self::MAX_CHUNKS_PER_BOOK) {
            $slice = mb_substr($text, $start, $chunkSize);
            if ($slice === '') {
                break;
            }

            $cutPos = mb_strrpos($slice, '. ');
            if ($cutPos === false || $cutPos < (int) ($chunkSize * 0.55)) {
                $cutPos = mb_strrpos($slice, "\n");
            }

            if ($cutPos !== false && $cutPos > 0) {
                $slice = mb_substr($slice, 0, $cutPos + 1);
            }

            $slice = trim($slice);
            if ($slice !== '') {
                $chunks[] = $slice;
            }

            $advance = max(120, mb_strlen($slice) - $overlap);
            $start += $advance;
        }

        return $chunks;
    }

    private function findByHash(string $hash): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, titulo, autor, fuente, materia, nivel, tags_json, total_chunks, vigencia, created_at, updated_at
             FROM ai_knowledge_books
             WHERE hash_sha256 = :hash
             LIMIT 1'
        );
        $stmt->execute([':hash' => $hash]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        $row['tags'] = $this->decodeTags($row['tags_json'] ?? '[]');
        unset($row['tags_json']);

        return $row;
    }

    private function getBookById(string $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, titulo, autor, fuente, materia, nivel, tags_json, resumen, total_chunks, vigencia, created_at, updated_at
             FROM ai_knowledge_books
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute([':id' => $id]);

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        $row['tags'] = $this->decodeTags($row['tags_json'] ?? '[]');
        unset($row['tags_json']);

        return $row;
    }

    private function extractKeywords(string $text): string
    {
        $normalized = $this->normalizeText($text);
        $words = preg_split('/\s+/', $normalized) ?: [];
        $stop = $this->stopWords();
        $freq = [];

        foreach ($words as $word) {
            $word = trim($word);
            if ($word === '' || mb_strlen($word) < 4 || isset($stop[$word])) {
                continue;
            }
            $freq[$word] = ($freq[$word] ?? 0) + 1;
        }

        arsort($freq);
        return implode(', ', array_slice(array_keys($freq), 0, 16));
    }

    private function normalizeText(string $text): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $text = preg_replace('/\t+/', ' ', $text) ?? $text;
        $text = preg_replace('/[ ]{2,}/', ' ', $text) ?? $text;
        $text = preg_replace('/\n{3,}/', "\n\n", $text) ?? $text;

        return trim(mb_strtolower($text));
    }

    private function buildSummary(string $text): string
    {
        $trimmed = trim($text);
        if ($trimmed === '') {
            return '';
        }

        if (mb_strlen($trimmed) <= 700) {
            return $trimmed;
        }

        return trim(mb_substr($trimmed, 0, 700)) . '...';
    }

    private function inferBookTitle(string $content, mixed $source = null): string
    {
        $sourceText = trim((string) $source);
        if ($sourceText !== '') {
            return $this->buildExcerpt($sourceText, 120);
        }

        $lines = preg_split('/\R+/', $content) ?: [];
        foreach ($lines as $line) {
            $candidate = trim((string) $line);
            if ($candidate === '') {
                continue;
            }

            $candidate = preg_replace('/\s+/', ' ', $candidate) ?? $candidate;
            return $this->buildExcerpt($candidate, 120);
        }

        return 'Libro cargado para IA';
    }

    private function extractBookTags(string $content): array
    {
        $digest = $this->extractKeywords($content);
        if ($digest === '') {
            return [];
        }

        return array_values(array_filter(array_map('trim', explode(',', $digest))));
    }

    private function buildExcerpt(string $text, int $maxChars): string
    {
        $text = trim($text);
        if (mb_strlen($text) <= $maxChars) {
            return $text;
        }

        return trim(mb_substr($text, 0, $maxChars)) . '...';
    }

    private function normalizeTags(mixed $tags): array
    {
        if (is_string($tags)) {
            $pieces = array_map('trim', explode(',', $tags));
            $tags = array_filter($pieces, static fn(string $tag): bool => $tag !== '');
        }

        if (!is_array($tags)) {
            return [];
        }

        $normalized = [];
        foreach ($tags as $tag) {
            $clean = trim((string) $tag);
            if ($clean !== '') {
                $normalized[] = $clean;
            }
        }

        return array_values(array_unique($normalized));
    }

    private function decodeTags(string $tagsJson): array
    {
        $decoded = json_decode($tagsJson, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function extractQueryTerms(string $query): array
    {
        $normalized = $this->normalizeText($query);
        $normalized = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $normalized) ?? $normalized;
        $parts = preg_split('/\s+/', $normalized) ?: [];

        $stop = $this->stopWords();
        $terms = [];
        foreach ($parts as $part) {
            if (mb_strlen($part) < 3 || isset($stop[$part])) {
                continue;
            }
            $terms[] = $part;
        }

        return array_values(array_slice(array_unique($terms), 0, 10));
    }

    private function nullableTrim(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $clean = trim((string) $value);
        return $clean === '' ? null : $clean;
    }

    private function safeInt(mixed $value, int $min, int $max, int $default): int
    {
        if (!is_numeric($value)) {
            return $default;
        }

        $num = (int) $value;
        if ($num < $min) {
            return $min;
        }
        if ($num > $max) {
            return $max;
        }

        return $num;
    }

    private function stopWords(): array
    {
        static $cache = null;
        if (is_array($cache)) {
            return $cache;
        }

        $words = [
            'de', 'la', 'el', 'los', 'las', 'y', 'o', 'u', 'a', 'en', 'por', 'para', 'con',
            'del', 'al', 'un', 'una', 'unos', 'unas', 'que', 'se', 'su', 'sus', 'como',
            'mas', 'más', 'sin', 'sobre', 'entre', 'desde', 'hasta', 'cada', 'este', 'esta',
            'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'ser', 'estar', 'puede', 'pueden',
            'nivel', 'estudiante', 'docente', 'actividad', 'objetivo', 'aprendizaje', 'oa',
            'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were'
        ];

        $cache = array_fill_keys($words, true);
        return $cache;
    }
}
