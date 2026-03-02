<?php

declare(strict_types=1);

namespace App\Models;

class CursoNivel extends BaseModel
{
    protected string $table    = 'cursos_niveles';
    protected array  $fillable = [
        'nombre', 'valor_numerico'
    ];
}
