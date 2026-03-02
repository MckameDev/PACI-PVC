<?php

declare(strict_types=1);

namespace App\Models;

class Paci extends BaseModel
{
    protected string $table        = 'paci';
    protected bool   $trackHistory = true;
    protected array  $fillable     = [
        'estudiante_id', 'usuario_id', 'fecha_emision', 'formato_generado',
        'aplica_paec', 'paec_activadores', 'paec_estrategias', 'paec_desregulacion'
    ];
}
