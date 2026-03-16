<?php

declare(strict_types=1);

namespace App\Models;

class ProgresionCurricular extends BaseModel
{
    protected string $table    = 'progresion_curricular';
    protected array  $fillable = [
        'habilidad', 'nivel_core', 'nivel_sugerido', 'eje', 'descripcion', 'orden'
    ];
}
