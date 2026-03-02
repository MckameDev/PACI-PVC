<?php

declare(strict_types=1);

namespace App\Models;

class Expediente extends BaseModel
{
    protected string $table    = 'expediente_pie';
    protected array  $fillable = [
        'estudiante_id', 'tipo_documento', 'descripcion',
        'ruta_archivo', 'estado', 'fecha_documento'
    ];
}
