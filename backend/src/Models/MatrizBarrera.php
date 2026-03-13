<?php

declare(strict_types=1);

namespace App\Models;

class MatrizBarrera extends BaseModel
{
    protected string $table    = 'matriz_barreras';
    protected array  $fillable = [
        'codigo', 'nombre', 'categoria', 'definicion', 'dimension', 'orden'
    ];
}
