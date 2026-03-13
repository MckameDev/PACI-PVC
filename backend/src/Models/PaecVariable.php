<?php

declare(strict_types=1);

namespace App\Models;

class PaecVariable extends BaseModel
{
    protected string $table = 'paec_variables';
    protected bool $trackHistory = true;
    protected array $fillable = [
        'paci_id',
        'tipo',
        'descripcion',
        'estrategia',
        'orden',
    ];
}
