<?php

declare(strict_types=1);

namespace App\Models;

class MatrizProgresion extends BaseModel
{
    protected string $table    = 'matriz_progresion';
    protected array  $fillable = [
        'asignatura', 'eje', 'core_nivel', 'nivel_curricular', 'id_oa', 'habilidad_clave', 'orden'
    ];
}
