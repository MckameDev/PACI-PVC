<?php

declare(strict_types=1);

namespace App\Models;

class MatrizEstrategiaEscritura extends BaseModel
{
    protected string $table    = 'matriz_estrategias_escritura';
    protected array  $fillable = [
        'codigo', 'nombre', 'problema_ataca', 'descripcion', 'tipo_apoyo', 'orden'
    ];
}
