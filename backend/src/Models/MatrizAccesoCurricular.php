<?php

declare(strict_types=1);

namespace App\Models;

class MatrizAccesoCurricular extends BaseModel
{
    protected string $table    = 'matriz_acceso_curricular';
    protected array  $fillable = [
        'nombre', 'descripcion', 'orden'
    ];
}
