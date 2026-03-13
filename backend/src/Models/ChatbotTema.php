<?php

declare(strict_types=1);

namespace App\Models;

class ChatbotTema extends BaseModel
{
    protected string $table    = 'chatbot_temas';
    protected array  $fillable = [
        'titulo', 'descripcion', 'icono', 'orden'
    ];
}
