<?php

declare(strict_types=1);

namespace App\Models;

class Apoderado extends BaseModel
{
    protected string $table    = 'apoderados';
    protected array  $fillable = [
        'estudiante_id', 'nombre', 'rut', 'parentesco',
        'telefono', 'email', 'direccion', 'es_principal'
    ];
}
