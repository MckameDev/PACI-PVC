<?php

declare(strict_types=1);

namespace App\Models;

class CoreLectura extends BaseModel
{
    protected string $table    = 'core_lectura';
    protected array  $fillable = [
        'core_nivel', 'core_habilidad', 'proceso_lector', 'descripcion', 'orden'
    ];
}
