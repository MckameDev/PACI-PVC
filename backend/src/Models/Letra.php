<?php

declare(strict_types=1);

namespace App\Models;

class Letra extends BaseModel
{
    protected string $table    = 'letras';
    protected array  $fillable = [
        'letra'
    ];
}
