<?php

declare(strict_types=1);

namespace App\Models;

class EstrategiaCore extends BaseModel
{
    protected string $table    = 'estrategias_core';
    protected array  $fillable = [
        'asignatura', 'eje', 'core_nivel', 'estrategia', 'actividad', 'orden'
    ];
}
