<?php

declare(strict_types=1);

namespace App\Models;

class HabilidadLenguaje extends BaseModel
{
    protected string $table    = 'habilidades_lenguaje';
    protected array  $fillable = [
        'nivel', 'eje', 'habilidad', 'descripcion', 'orden'
    ];
}
