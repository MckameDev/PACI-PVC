<?php

declare(strict_types=1);

namespace App\Models;

class MatrizEstrategiaDua extends BaseModel
{
    protected string $table    = 'matriz_estrategias_dua';
    protected array  $fillable = [
        'nombre', 'principio_dua', 'categoria', 'orden'
    ];
}
