<?php

declare(strict_types=1);

namespace App\Services;

use App\Helpers\Response;
use Throwable;

class PaciStructuredDocumentParserService
{
    public function parseUploadedDocument(array $file): array
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            Response::error('No se pudo cargar el documento estructurado.', 400);
        }

        $tmpPath = (string) ($file['tmp_name'] ?? '');
        if ($tmpPath === '' || !is_file($tmpPath)) {
            Response::error('Archivo temporal no disponible.', 400);
        }

        $originalName = (string) ($file['name'] ?? 'documento.txt');
        $extension = strtolower((string) pathinfo($originalName, PATHINFO_EXTENSION));
        $allowed = ['pdf', 'docx', 'txt', 'md', 'csv'];

        if (!in_array($extension, $allowed, true)) {
            Response::error('Formato no soportado. Usa PDF, DOCX, TXT, MD o CSV.', 422);
        }

        $rawText = $this->extractText($tmpPath, $extension);
        if (trim($rawText) === '') {
            Response::error('No se pudo extraer contenido útil del documento.', 422);
        }

        $pairs = $this->extractStructuredPairs($rawText);
        $normalizedContext = $this->normalizePairsToContext($pairs);

        return [
            'file_name' => $originalName,
            'raw_text' => $rawText,
            'pairs' => $pairs,
            'normalized_context' => $normalizedContext,
            'warnings' => $this->buildWarnings($pairs, $normalizedContext),
        ];
    }

    private function extractText(string $tmpPath, string $extension): string
    {
        if ($extension === 'docx') {
            return $this->extractDocxText($tmpPath);
        }

        if ($extension === 'pdf') {
            return $this->extractPdfText($tmpPath);
        }

        $raw = file_get_contents($tmpPath);
        if ($raw === false) {
            Response::error('No fue posible leer el archivo cargado.', 400);
        }

        return (string) $raw;
    }

    private function extractDocxText(string $tmpPath): string
    {
        if (!class_exists('ZipArchive')) {
            Response::error('No está habilitado ZipArchive para leer DOCX.', 500);
        }

        $zip = new \ZipArchive();
        $open = $zip->open($tmpPath);
        if ($open !== true) {
            Response::error('No se pudo abrir el DOCX.', 422);
        }

        $parts = [];
        $entries = ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/footer1.xml', 'word/footer2.xml'];

        foreach ($entries as $entry) {
            $xml = $zip->getFromName($entry);
            if ($xml === false) {
                continue;
            }

            $text = strip_tags(str_replace('</w:p>', "\n", (string) $xml));
            $parts[] = html_entity_decode($text, ENT_QUOTES | ENT_XML1, 'UTF-8');
        }

        $zip->close();

        return trim(implode("\n", $parts));
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

        Response::error('No se pudo extraer texto del PDF. Verifica smalot/pdfparser o instala pdftotext.', 422);
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

    private function extractStructuredPairs(string $text): array
    {
        $normalized = str_replace(["\r\n", "\r"], "\n", $text);
        $lines = preg_split('/\n+/', $normalized) ?: [];
        $lines = array_values(array_filter(array_map(static fn($line) => trim((string) $line), $lines), static fn($line) => $line !== ''));

        $pairs = [];

        for ($i = 0; $i < count($lines); $i += 1) {
            $line = $lines[$i];

            if (preg_match('/^(.{2,120}?)\s*[:：]\s*(.+)$/u', $line, $m)) {
                $pairs[] = ['title' => trim($m[1]), 'value' => trim($m[2]), 'source' => 'inline'];
                continue;
            }

            if ($this->looksLikeTitle($line) && isset($lines[$i + 1]) && !$this->looksLikeTitle($lines[$i + 1])) {
                $pairs[] = ['title' => trim($line), 'value' => trim($lines[$i + 1]), 'source' => 'multiline'];
                $i += 1;
            }
        }

        return $pairs;
    }

    private function normalizePairsToContext(array $pairs): array
    {
        $context = [];

        foreach ($pairs as $pair) {
            $title = (string) ($pair['title'] ?? '');
            $value = (string) ($pair['value'] ?? '');
            if ($title === '' || $value === '') {
                continue;
            }

            $key = $this->mapTitleToContextKey($title);
            if ($key === null) {
                $context['contexto_documental'][] = $title . ': ' . $value;
                continue;
            }

            if (isset($context[$key])) {
                $context[$key] .= ' | ' . $value;
            } else {
                $context[$key] = $value;
            }
        }

        if (!empty($context['contexto_documental']) && is_array($context['contexto_documental'])) {
            $context['contexto_documental'] = implode(' | ', $context['contexto_documental']);
        }

        return $context;
    }

    private function mapTitleToContextKey(string $title): ?string
    {
        $t = $this->normalize($title);

        $map = [
            'establecimiento' => ['establecimiento', 'escuela', 'colegio'],
            'estudiante' => ['estudiante', 'alumno', 'nombre del estudiante'],
            'apoderado' => ['apoderado', 'tutor', 'responsable'],
            'diagnostico' => ['diagnostico', 'nee', 'neep', 'neet'],
            'tipo_nee' => ['tipo nee', 'tipo de nee', 'nee'],
            'comorbilidad' => ['comorbilidad'],
            'curso' => ['curso', 'curso nivel', 'nivel curso'],
            'profesor_jefe' => ['profesor jefe', 'docente jefe', 'profesor/a jefe'],
            'profesor_asignatura' => ['profesor asignatura', 'docente asignatura', 'profesor/a de asignatura'],
            'educador_diferencial' => ['educador diferencial', 'docente diferencial'],
            'perfil_dua' => ['perfil dua', 'perfil del estudiante', 'perfil'],
            'barreras' => ['barreras', 'barreras para el aprendizaje'],
            'fortalezas' => ['fortalezas', 'potencialidades'],
            'asignatura' => ['asignatura', 'materia'],
            'unidad' => ['unidad'],
            'eje' => ['eje'],
            'nivel_trabajo' => ['nivel de trabajo', 'nivel trabajo'],
            'texto_oa' => ['oa original', 'objetivo de aprendizaje', 'oa'],
            'indicadores_nivelados' => ['indicadores', 'indicadores nivelados'],
            'habilidades_base' => ['habilidad', 'habilidades base'],
            'estrategias_dua' => ['estrategias dua', 'estrategias'],
            'estrategias_oa' => ['estrategias oa'],
            'meta_especifica' => ['meta', 'meta especifica'],
            'meta_integradora' => ['meta integradora'],
            'actividades' => ['actividades', 'actividad'],
            'seguimiento' => ['seguimiento', 'seguimiento oa'],
            'paec_activadores' => ['activadores', 'paec activadores'],
            'paec_estrategias' => ['paec estrategias', 'estrategias paec'],
            'paec_desregulacion' => ['desregulacion', 'paec desregulacion'],
            'criterios_evaluacion' => ['criterios de evaluacion', 'evaluacion', 'instrumento evaluacion'],
            'observaciones' => ['observaciones'],
        ];

        foreach ($map as $key => $aliases) {
            foreach ($aliases as $alias) {
                if (str_contains($t, $this->normalize($alias))) {
                    return $key;
                }
            }
        }

        return null;
    }

    private function looksLikeTitle(string $line): bool
    {
        if (mb_strlen($line) < 2 || mb_strlen($line) > 120) {
            return false;
        }

        if (preg_match('/[:：]$/u', $line)) {
            return true;
        }

        if (preg_match('/^[\p{L}\p{N}\s\-\.\(\)]+$/u', $line) !== 1) {
            return false;
        }

        if (preg_match('/[\.!?]$/u', $line) === 1) {
            return false;
        }

        return true;
    }

    private function buildWarnings(array $pairs, array $context): array
    {
        $warnings = [];

        if (count($pairs) === 0) {
            $warnings[] = 'No se detectaron pares titulo-valor claramente estructurados.';
        }

        $required = ['estudiante', 'diagnostico', 'asignatura', 'eje'];
        foreach ($required as $key) {
            if (empty($context[$key])) {
                $warnings[] = 'No se detectó el campo clave: ' . $key;
            }
        }

        return $warnings;
    }

    private function normalize(string $text): string
    {
        $text = mb_strtolower(trim($text));
        $text = str_replace(['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'], ['a', 'e', 'i', 'o', 'u', 'u', 'n'], $text);
        return $text;
    }
}
