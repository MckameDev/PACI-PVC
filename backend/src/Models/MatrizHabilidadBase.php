<?php

declare(strict_types=1);

namespace App\Models;

class MatrizHabilidadBase extends BaseModel
{
    protected string $table    = 'matriz_habilidades_base';
    protected array  $fillable = [
        'nombre', 'descripcion', 'orden'
    ];
}
