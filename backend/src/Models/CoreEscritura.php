<?php

declare(strict_types=1);

namespace App\Models;

class CoreEscritura extends BaseModel
{
    protected string $table    = 'core_escritura';
    protected array  $fillable = [
        'core_nivel', 'core_habilidad', 'proceso_escritor', 'descripcion', 'orden'
    ];
}
