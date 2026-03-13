<?php

declare(strict_types=1);

namespace App\Models;

class MatrizEstrategiaComunicacion extends BaseModel
{
    protected string $table    = 'matriz_estrategias_comunicacion';
    protected array  $fillable = [
        'codigo', 'nombre', 'nivel_sugerido', 'descripcion_pedagogica', 'foco_intervencion', 'orden'
    ];
}
