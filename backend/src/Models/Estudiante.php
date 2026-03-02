<?php

declare(strict_types=1);

namespace App\Models;

class Estudiante extends BaseModel
{
    protected string $table        = 'estudiantes';
    protected bool   $trackHistory = true;
    protected array  $fillable     = [
        'rut', 'nombre_completo', 'usuario_id', 'establecimiento_id',
        'curso_nivel_id', 'letra_id', 'diagnostico', 'tipo_nee'
    ];
}
