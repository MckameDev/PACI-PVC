<?php

declare(strict_types=1);

namespace App\Helpers;

class Response
{
    // Respuesta JSON generica
    public static function json(mixed $data, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Respuesta exitosa con datos
    public static function success(mixed $data, int $code = 200): void
    {
        self::json(['status' => 'success', 'data' => $data], $code);
    }

    // Respuesta de recurso creado
    public static function created(mixed $data): void
    {
        self::json(['status' => 'success', 'data' => $data], 201);
    }

    // Respuesta de error
    public static function error(string $message, int $code = 400): void
    {
        self::json(['status' => 'error', 'message' => $message], $code);
    }

    // Respuesta de error de validacion
    public static function validationError(array $errors): void
    {
        self::json(['status' => 'error', 'message' => 'Error de validacion', 'errors' => $errors], 422);
    }

    // Respuesta 404
    public static function notFound(string $message = 'Recurso no encontrado'): void
    {
        self::json(['status' => 'error', 'message' => $message], 404);
    }
}
