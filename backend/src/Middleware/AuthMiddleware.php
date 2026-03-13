<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Config\AppConfig;
use App\Helpers\Response;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;

class AuthMiddleware
{
    private static ?object $currentUser = null;

    // Valida token JWT del header Authorization
    public static function handle(): void
    {
        // Intentar obtener Authorization de múltiples fuentes (Apache/CGI puede renombrarlo)
        $header = $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        // Fallback: leer directamente de apache_request_headers si está disponible
        if (empty($header) && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $header  = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }

        if (empty($header) || !str_starts_with($header, 'Bearer ')) {
            Response::error('Token de autenticacion requerido', 401);
        }

        $token = substr($header, 7);

        try {
            $decoded = JWT::decode($token, new Key(AppConfig::jwtSecret(), AppConfig::JWT_ALGORITHM));
            self::$currentUser = $decoded;
        } catch (ExpiredException $e) {
            Response::error('Token expirado', 401);
        } catch (\Exception $e) {
            Response::error('Token invalido', 401);
        }
    }

    // Retorna el ID del usuario autenticado
    public static function getUserId(): ?string
    {
        return self::$currentUser->sub ?? null;
    }

    // Retorna el rol del usuario autenticado
    public static function getUserRole(): ?string
    {
        return self::$currentUser->rol ?? null;
    }

    // Retorna el payload completo del token decodificado
    public static function getUser(): ?object
    {
        return self::$currentUser;
    }

    // Verifica que el usuario tenga uno de los roles permitidos
    public static function requireRole(array $allowedRoles): void
    {
        $role = self::getUserRole();
        if (!in_array($role, $allowedRoles, true)) {
            Response::error('No tiene permisos para realizar esta accion', 403);
        }
    }
}
