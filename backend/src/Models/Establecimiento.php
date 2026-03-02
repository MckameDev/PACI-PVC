<?php

declare(strict_types=1);

namespace App\Models;

class Establecimiento extends BaseModel
{
    protected string $table    = 'establecimientos';
    protected array  $fillable = [
        'nombre', 'codigo', 'direccion', 'comuna', 'region'
    ];
}
