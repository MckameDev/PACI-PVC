<?php

declare(strict_types=1);

namespace App\Helpers;

use Ramsey\Uuid\Uuid as RamseyUuid;

class UUID
{
    // Genera UUID v4 estandar RFC 4122
    public static function generate(): string
    {
        return RamseyUuid::uuid4()->toString();
    }

    // Valida formato UUID
    public static function isValid(string $uuid): bool
    {
        return RamseyUuid::isValid($uuid);
    }
}
