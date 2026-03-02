<?php

declare(strict_types=1);

namespace App\Models;

class Asignatura extends BaseModel
{
    protected string $table    = 'asignaturas';
    protected array  $fillable = [
        'nombre', 'codigo'
    ];
}
