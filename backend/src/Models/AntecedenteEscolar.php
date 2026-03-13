<?php

declare(strict_types=1);

namespace App\Models;

class AntecedenteEscolar extends BaseModel
{
    protected string $table    = 'antecedentes_escolares';
    protected array  $fillable = [
        'estudiante_id', 'anio', 'establecimiento_origen',
        'curso', 'observaciones'
    ];
}
