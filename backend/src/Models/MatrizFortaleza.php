<?php

declare(strict_types=1);

namespace App\Models;

class MatrizFortaleza extends BaseModel
{
    protected string $table    = 'matriz_fortalezas';
    protected array  $fillable = [
        'codigo', 'nombre', 'categoria', 'descripcion_ia', 'valor_dua', 'orden'
    ];
}
