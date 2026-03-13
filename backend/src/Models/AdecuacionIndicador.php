<?php

declare(strict_types=1);

namespace App\Models;

class AdecuacionIndicador extends BaseModel
{
    protected string $table = 'adecuacion_indicadores';
    protected bool $trackHistory = false;
    protected array $fillable = [
        'trayectoria_id',
        'indicador_id',
    ];
}
