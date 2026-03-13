<?php

declare(strict_types=1);

namespace App\Models;

class SaludEstudiante extends BaseModel
{
    protected string $table    = 'salud_estudiante';
    protected array  $fillable = [
        'estudiante_id', 'tipo_registro', 'descripcion',
        'profesional', 'fecha', 'documento_adjunto'
    ];
}
