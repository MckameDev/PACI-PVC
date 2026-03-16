<?php

declare(strict_types=1);

namespace App\Models;

class Oa extends BaseModel
{
    protected string $table    = 'oa_db';
    protected array  $fillable = [
        'id_oa', 'asignatura_id', 'nivel_trabajo_id', 'eje', 'eje_id', 'ambito', 'nucleo',
        'tipo_oa', 'codigo_oa', 'texto_oa', 'habilidad_core', 'es_habilidad_estructural',
        'base_de_habilidades', 'nivel_logro', 'indicador_logro', 'fuente'
    ];
}
