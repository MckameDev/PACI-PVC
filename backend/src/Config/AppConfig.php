<?php

declare(strict_types=1);

namespace App\Config;

class AppConfig
{
    public const JWT_ALGORITHM  = 'HS256';
    public const APP_TIMEZONE   = 'America/Santiago';
    public const ITEMS_PER_PAGE = 20;

    // Valores por defecto (se sobreescriben con .env)
    private const DEFAULT_JWT_SECRET   = 'PaciPVC_S3cr3t_K3y_2026_Ch4ng3_1n_Pr0d';
    private const DEFAULT_JWT_EXPIRY   = 28800;

    public static function jwtSecret(): string
    {
        Env::load();
        return Env::get('JWT_SECRET', self::DEFAULT_JWT_SECRET);
    }

    public static function jwtExpiration(): int
    {
        Env::load();
        return (int) Env::get('JWT_EXPIRY', (string) self::DEFAULT_JWT_EXPIRY);
    }
}
