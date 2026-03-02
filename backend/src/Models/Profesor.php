<?php

declare(strict_types=1);

namespace App\Models;

class Profesor extends BaseModel
{
    protected string $table    = 'profesores';
    protected array  $fillable = [
        'user_id', 'establecimiento_id', 'especialidad', 'cargo'
    ];
}
