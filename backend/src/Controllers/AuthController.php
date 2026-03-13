<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Config\AppConfig;
use App\Services\UserService;
use App\Middleware\AuthMiddleware;
use App\Helpers\Response;
use App\Helpers\Validator;
use Firebase\JWT\JWT;

class AuthController
{
    private UserService $userService;

    public function __construct()
    {
        $this->userService = new UserService();
    }

    // POST /api/auth/login - Autenticacion y generacion de JWT
    public function login(array $params): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];

        $validator = Validator::make($data, [
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        if (!empty($validator->getErrors())) {
            Response::validationError($validator->getErrors());
        }

        $user = $this->userService->findByEmail($data['email']);

        if (!$user || !password_verify($data['password'], $user['password'])) {
            Response::error('Credenciales invalidas', 401);
        }

        $now       = time();
        $jwtExp    = AppConfig::jwtExpiration();
        $jwtSecret = AppConfig::jwtSecret();
        $payload   = [
            'sub' => $user['id'],
            'rol' => $user['rol'],
            'iat' => $now,
            'exp' => $now + $jwtExp,
        ];

        $token = JWT::encode($payload, $jwtSecret, AppConfig::JWT_ALGORITHM);

        Response::success([
            'token'      => $token,
            'token_type' => 'Bearer',
            'expires_in' => $jwtExp,
            'user'       => [
                'id'     => $user['id'],
                'nombre' => $user['nombre'],
                'email'  => $user['email'],
                'rol'    => $user['rol'],
            ],
        ]);
    }

    // POST /api/auth/register - Registro de usuario (solo Admins)
    public function register(array $params): void
    {
        AuthMiddleware::requireRole(['Admin']);
        $data   = json_decode(file_get_contents('php://input'), true) ?? [];
        $userId = AuthMiddleware::getUserId();
        $result = $this->userService->create($data, $userId);
        Response::created($result);
    }

    // GET /api/auth/me - Datos del usuario autenticado
    public function me(array $params): void
    {
        $userId = AuthMiddleware::getUserId();
        $user   = $this->userService->getById($userId);

        if (!$user) {
            Response::notFound('Usuario no encontrado');
        }

        unset($user['password']);
        Response::success($user);
    }
}
