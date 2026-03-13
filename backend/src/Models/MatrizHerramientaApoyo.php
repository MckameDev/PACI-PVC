<?php

declare(strict_types=1);

namespace App\Models;

class MatrizHerramientaApoyo extends BaseModel
{
    protected string $table    = 'matriz_herramientas_apoyo';
    protected array  $fillable = [
        'codigo', 'nombre', 'proposito_acceso', 'descripcion', 'barrera_mitiga', 'orden'
    ];
}
