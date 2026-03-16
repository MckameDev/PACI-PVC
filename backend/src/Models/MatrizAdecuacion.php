<?php

declare(strict_types=1);

namespace App\Models;

class MatrizAdecuacion extends BaseModel
{
    protected string $table    = 'matriz_adecuaciones';
    protected array  $fillable = [
        'asignatura', 'eje', 'core_nivel', 'dificultad_detectada', 'adecuacion_sugerida', 'orden'
    ];
}
