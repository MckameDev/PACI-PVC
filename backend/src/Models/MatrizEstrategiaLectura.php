<?php

declare(strict_types=1);

namespace App\Models;

class MatrizEstrategiaLectura extends BaseModel
{
    protected string $table    = 'matriz_estrategias_lectura';
    protected array  $fillable = [
        'codigo', 'nombre', 'momento_lectura', 'descripcion_pedagogica', 'objetivo_metacognitivo', 'orden'
    ];
}
