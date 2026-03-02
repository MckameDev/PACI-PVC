<?php

declare(strict_types=1);

namespace App\Models;

class PerfilDua extends BaseModel
{
    protected string $table    = 'perfil_dua';
    protected array  $fillable = [
        'paci_id', 'fortalezas', 'barreras',
        'preferencias_representacion', 'preferencias_expresion', 'preferencias_motivacion'
    ];
}
