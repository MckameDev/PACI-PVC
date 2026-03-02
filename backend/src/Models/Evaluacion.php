<?php

declare(strict_types=1);

namespace App\Models;

class Evaluacion extends BaseModel
{
    protected string $table    = 'eval_db';
    protected array  $fillable = [
        'habilidad', 'nivel_id', 'tipo_adecuacion',
        'modalidad_sugerida', 'instrumento_sugerido', 'criterio_logro'
    ];
}
