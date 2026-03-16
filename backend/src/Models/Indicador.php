<?php

declare(strict_types=1);

namespace App\Models;

class Indicador extends BaseModel
{
    protected string $table    = 'indicadores_db';
    protected array  $fillable = [
        'oa_id', 'curso', 'eje', 'nivel_logro', 'nivel_desempeno', 'texto_indicador'
    ];
}
