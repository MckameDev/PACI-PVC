<?php

declare(strict_types=1);

namespace App\Models;

class User extends BaseModel
{
    protected string $table    = 'users';
    protected array  $fillable = [
        'nombre', 'email', 'password', 'rol', 'limite_estudiantes'
    ];
}
