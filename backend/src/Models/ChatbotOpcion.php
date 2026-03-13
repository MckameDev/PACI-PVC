<?php

declare(strict_types=1);

namespace App\Models;

class ChatbotOpcion extends BaseModel
{
    protected string $table    = 'chatbot_opciones';
    protected array  $fillable = [
        'tema_id', 'parent_id', 'nivel', 'texto_opcion', 'texto_respuesta', 'orden'
    ];
}
