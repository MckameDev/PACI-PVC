<?php

declare(strict_types=1);

namespace App\Models;

class PaciBorrador extends BaseModel
{
    protected string $table   = 'paci_borradores';
    protected array  $fillable = [
        'usuario_id', 'paso_actual', 'form_data', 'estudiante_id', 'asignatura_id'
    ];
}
