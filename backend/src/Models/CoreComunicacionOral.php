<?php

declare(strict_types=1);

namespace App\Models;

class CoreComunicacionOral extends BaseModel
{
    protected string $table    = 'core_comunicacion_oral';
    protected array  $fillable = [
        'core_nivel', 'core_habilidad', 'proceso_oral', 'descripcion', 'orden'
    ];
}
