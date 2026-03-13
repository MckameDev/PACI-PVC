<?php

declare(strict_types=1);

namespace App\Config;

/**
 * Carga variables de entorno desde un archivo .env
 * Si la variable ya existe en el entorno (ej. PHP-FPM), no se sobreescribe.
 */
class Env
{
    private static bool $loaded = false;
    private static array $vars = [];

    /**
     * Carga el archivo .env desde la raíz del proyecto backend.
     */
    public static function load(string $path = null): void
    {
        if (self::$loaded) {
            return;
        }

        $path = $path ?? dirname(__DIR__, 2) . '/.env';

        if (!file_exists($path)) {
            self::$loaded = true;
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        foreach ($lines as $line) {
            $line = trim($line);

            // Ignorar comentarios
            if (str_starts_with($line, '#')) {
                continue;
            }

            // Solo procesar lineas con =
            if (!str_contains($line, '=')) {
                continue;
            }

            [$key, $value] = explode('=', $line, 2);
            $key   = trim($key);
            $value = trim($value);

            // Quitar comillas envolventes
            if ((str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
                $value = substr($value, 1, -1);
            }

            self::$vars[$key] = $value;

            // Solo setear si no existe ya en el entorno
            if (getenv($key) === false) {
                $_ENV[$key] = $value;
            }
        }

        self::$loaded = true;
    }

    /**
     * Obtiene una variable de entorno con valor por defecto.
     */
    public static function get(string $key, string $default = ''): string
    {
        // Primero intentar desde el entorno del sistema
        $value = getenv($key);
        if ($value !== false) {
            return $value;
        }

        // Luego desde las variables cargadas del .env
        return self::$vars[$key] ?? $default;
    }
}
