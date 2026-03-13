<?php

declare(strict_types=1);

namespace App\Models;

class Eje extends BaseModel
{
    protected string $table = 'ejes';
    protected bool $trackHistory = true;
    protected array $fillable = [
        'asignatura_id',
        'nombre',
    ];
}
