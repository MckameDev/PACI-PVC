<?php

declare(strict_types=1);

$autoloadCandidates = [
    __DIR__ . '/../vendor/autoload.php',
    __DIR__ . '/../vendor_alt/autoload.php',
    __DIR__ . '/../vendor_new/autoload.php',
    __DIR__ . '/../../vendor/autoload.php',
    __DIR__ . '/../../vendor_alt/autoload.php',
    __DIR__ . '/../../vendor_new/autoload.php',
    __DIR__ . '/../../backend/vendor/autoload.php',
    __DIR__ . '/../../backend/vendor_alt/autoload.php',
    __DIR__ . '/../../backend/vendor_new/autoload.php',
];

$autoloadLoaded = false;
foreach ($autoloadCandidates as $autoloadPath) {
    if (is_file($autoloadPath)) {
        require_once $autoloadPath;
        $autoloadLoaded = true;
        break;
    }
}

if (!$autoloadLoaded) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => 'error',
        'message' => 'No se encontro vendor/autoload.php. Verifica la carpeta vendor en el servidor.'
    ]);
    exit;
}

use App\Config\Cors;
use App\Config\AppConfig;
use App\Router\Router;
use App\Helpers\Response;

use App\Controllers\AuthController;
use App\Controllers\UserController;
use App\Controllers\EstablecimientoController;
use App\Controllers\CursoNivelController;
use App\Controllers\LetraController;
use App\Controllers\AsignaturaController;
use App\Controllers\ProfesorController;
use App\Controllers\EstudianteController;
use App\Controllers\PaciController;
use App\Controllers\OaController;
use App\Controllers\IndicadorController;
use App\Controllers\EvalController;
use App\Controllers\ExpedienteController;
use App\Controllers\HistorialController;
use App\Controllers\EjeController;
use App\Controllers\ImportController;
use App\Controllers\MatrizFortalezaController;
use App\Controllers\MatrizBarreraController;
use App\Controllers\MatrizEstrategiaDuaController;
use App\Controllers\MatrizAccesoCurricularController;
use App\Controllers\MatrizHabilidadBaseController;
use App\Controllers\ApoderadoController;
use App\Controllers\SaludEstudianteController;
use App\Controllers\AntecedenteEscolarController;
use App\Controllers\SeguimientoPaciController;
use App\Controllers\AiController;
use App\Controllers\OpenRouterAiController;
use App\Controllers\AiAdminController;
use App\Controllers\MatrizEstrategiaLecturaController;
use App\Controllers\MatrizEstrategiaEscrituraController;
use App\Controllers\MatrizEstrategiaComunicacionController;
use App\Controllers\MatrizHerramientaApoyoController;
use App\Controllers\ChatbotController;
use App\Controllers\HabilidadLenguajeController;
use App\Controllers\ActivacionPaciController;
use App\Controllers\CoreLecturaController;
use App\Controllers\CoreEscrituraController;
use App\Controllers\CoreComunicacionOralController;
use App\Controllers\MatrizProgresionController;
use App\Controllers\EstrategiaCoreController;
use App\Controllers\DiagnosticoCoreController;
use App\Controllers\ProgresionLectoraController;
use App\Controllers\MatrizAdecuacionController;
use App\Controllers\ProgresionCurricularController;
use App\Controllers\PaciBorradorController;

date_default_timezone_set(AppConfig::APP_TIMEZONE);

Cors::handle();

$router = new Router();
$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Auto-detectar basePath desde SCRIPT_NAME (funciona en XAMPP y Nginx/VPS)
// En XAMPP:  SCRIPT_NAME = /PaciPVC/backend/public/index.php  → basePath = /PaciPVC/backend/public
// En Nginx:  SCRIPT_NAME = /backend/index.php (o /backend/public/index.php) → basePath = /backend (o /backend/public)
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$basePath   = rtrim(dirname($scriptName), '/\\');
if ($basePath === '.' || $basePath === '') {
    $basePath = '';
}

// Si el basePath termina en /public, también probar sin /public
// (cubre el caso de Nginx con alias que expone /public en SCRIPT_NAME)
$basePathAlt = preg_replace('#/public$#', '', $basePath);

if ($basePath && str_starts_with($uri, $basePath)) {
    $uri = substr($uri, strlen($basePath));
} elseif ($basePathAlt && $basePathAlt !== $basePath && str_starts_with($uri, $basePathAlt)) {
    $uri = substr($uri, strlen($basePathAlt));
}

// Fallback: si la URI todavía empieza con /backend, quitarlo
// (para Nginx con location /backend/ que pasa REQUEST_URI completo)
if (str_starts_with($uri, '/backend')) {
    $uri = substr($uri, strlen('/backend'));
}

if ($uri === '' || $uri === false) {
    $uri = '/';
}

// -----------------------------------------------------------
// Ruta de salud (sin autenticacion)
// -----------------------------------------------------------
$router->get('/api/health', [HealthCheck::class, 'check'], false);

// -----------------------------------------------------------
// Rutas de autenticacion
// -----------------------------------------------------------
$router->post('/api/auth/login', [AuthController::class, 'login'], false);
$router->post('/api/auth/register', [AuthController::class, 'register'], true);
$router->get('/api/auth/me', [AuthController::class, 'me'], true);

// -----------------------------------------------------------
// Rutas protegidas: Users
// -----------------------------------------------------------
$router->get('/api/users', [UserController::class, 'index'], true);
$router->get('/api/users/{id}', [UserController::class, 'show'], true);
$router->post('/api/users', [UserController::class, 'store'], true);
$router->put('/api/users/{id}', [UserController::class, 'update'], true);
$router->patch('/api/users/{id}', [UserController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Establecimientos
// -----------------------------------------------------------
$router->get('/api/establecimientos', [EstablecimientoController::class, 'index'], true);
$router->get('/api/establecimientos/{id}', [EstablecimientoController::class, 'show'], true);
$router->post('/api/establecimientos', [EstablecimientoController::class, 'store'], true);
$router->put('/api/establecimientos/{id}', [EstablecimientoController::class, 'update'], true);
$router->patch('/api/establecimientos/{id}', [EstablecimientoController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Cursos/Niveles
// -----------------------------------------------------------
$router->get('/api/cursos-niveles', [CursoNivelController::class, 'index'], true);
$router->get('/api/cursos-niveles/{id}', [CursoNivelController::class, 'show'], true);
$router->post('/api/cursos-niveles', [CursoNivelController::class, 'store'], true);
$router->put('/api/cursos-niveles/{id}', [CursoNivelController::class, 'update'], true);
$router->patch('/api/cursos-niveles/{id}', [CursoNivelController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Letras
// -----------------------------------------------------------
$router->get('/api/letras', [LetraController::class, 'index'], true);
$router->get('/api/letras/{id}', [LetraController::class, 'show'], true);
$router->post('/api/letras', [LetraController::class, 'store'], true);
$router->put('/api/letras/{id}', [LetraController::class, 'update'], true);
$router->patch('/api/letras/{id}', [LetraController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Asignaturas
// -----------------------------------------------------------
$router->get('/api/asignaturas', [AsignaturaController::class, 'index'], true);
$router->get('/api/asignaturas/{id}', [AsignaturaController::class, 'show'], true);
$router->post('/api/asignaturas', [AsignaturaController::class, 'store'], true);
$router->put('/api/asignaturas/{id}', [AsignaturaController::class, 'update'], true);
$router->patch('/api/asignaturas/{id}', [AsignaturaController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Profesores
// -----------------------------------------------------------
$router->get('/api/profesores', [ProfesorController::class, 'index'], true);
$router->get('/api/profesores/{id}', [ProfesorController::class, 'show'], true);
$router->post('/api/profesores', [ProfesorController::class, 'store'], true);
$router->put('/api/profesores/{id}', [ProfesorController::class, 'update'], true);
$router->patch('/api/profesores/{id}', [ProfesorController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Estudiantes
// -----------------------------------------------------------
$router->get('/api/estudiantes', [EstudianteController::class, 'index'], true);
$router->get('/api/estudiantes/{id}', [EstudianteController::class, 'show'], true);
$router->post('/api/estudiantes', [EstudianteController::class, 'store'], true);
$router->put('/api/estudiantes/{id}', [EstudianteController::class, 'update'], true);
$router->patch('/api/estudiantes/{id}', [EstudianteController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: PACI
// -----------------------------------------------------------
$router->get('/api/paci', [PaciController::class, 'index'], true);
$router->get('/api/paci/{id}', [PaciController::class, 'show'], true);
$router->post('/api/paci', [PaciController::class, 'store'], true);
$router->put('/api/paci/{id}', [PaciController::class, 'update'], true);
$router->patch('/api/paci/{id}', [PaciController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Borrador PACI (server-side drafts)
// -----------------------------------------------------------
$router->get('/api/paci-borrador', [PaciBorradorController::class, 'show'], true);
$router->put('/api/paci-borrador', [PaciBorradorController::class, 'upsert'], true);
$router->patch('/api/paci-borrador', [PaciBorradorController::class, 'destroy'], true);

// -----------------------------------------------------------
// Rutas protegidas: Objetivos de Aprendizaje
// -----------------------------------------------------------
$router->get('/api/oa', [OaController::class, 'index'], true);
$router->get('/api/oa/ejes', [OaController::class, 'ejes'], true);
$router->get('/api/oa/{id}', [OaController::class, 'show'], true);
$router->post('/api/oa', [OaController::class, 'store'], true);
$router->put('/api/oa/{id}', [OaController::class, 'update'], true);
$router->patch('/api/oa/{id}', [OaController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Indicadores
// -----------------------------------------------------------
$router->get('/api/indicadores', [IndicadorController::class, 'index'], true);
$router->get('/api/indicadores/{id}', [IndicadorController::class, 'show'], true);
$router->post('/api/indicadores', [IndicadorController::class, 'store'], true);
$router->put('/api/indicadores/{id}', [IndicadorController::class, 'update'], true);
$router->patch('/api/indicadores/{id}', [IndicadorController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Evaluaciones
// -----------------------------------------------------------
$router->get('/api/evaluaciones', [EvalController::class, 'index'], true);
$router->get('/api/evaluaciones/{id}', [EvalController::class, 'show'], true);
$router->post('/api/evaluaciones', [EvalController::class, 'store'], true);
$router->put('/api/evaluaciones/{id}', [EvalController::class, 'update'], true);
$router->patch('/api/evaluaciones/{id}', [EvalController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Expedientes PIE
// -----------------------------------------------------------
$router->get('/api/expedientes', [ExpedienteController::class, 'index'], true);
$router->get('/api/expedientes/{id}', [ExpedienteController::class, 'show'], true);
$router->post('/api/expedientes', [ExpedienteController::class, 'store'], true);
$router->put('/api/expedientes/{id}', [ExpedienteController::class, 'update'], true);
$router->patch('/api/expedientes/{id}', [ExpedienteController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Ejes (catálogo por asignatura)
// -----------------------------------------------------------
$router->get('/api/ejes', [EjeController::class, 'index'], true);
$router->get('/api/ejes/{id}', [EjeController::class, 'show'], true);
$router->post('/api/ejes', [EjeController::class, 'store'], true);
$router->put('/api/ejes/{id}', [EjeController::class, 'update'], true);
$router->patch('/api/ejes/{id}', [EjeController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Import (Excel → OA / Indicadores)
// -----------------------------------------------------------
$router->post('/api/import/oa', [ImportController::class, 'importOa'], true);
$router->post('/api/import/indicadores', [ImportController::class, 'importIndicadores'], true);
$router->post('/api/import/barreras', [ImportController::class, 'importBarreras'], true);
$router->post('/api/import/fortalezas', [ImportController::class, 'importFortalezas'], true);
$router->post('/api/import/estrategias-lectura', [ImportController::class, 'importEstrategiasLectura'], true);
$router->post('/api/import/estrategias-escritura', [ImportController::class, 'importEstrategiasEscritura'], true);
$router->post('/api/import/estrategias-comunicacion', [ImportController::class, 'importEstrategiasComunicacion'], true);
$router->post('/api/import/herramientas-apoyo', [ImportController::class, 'importHerramientasApoyo'], true);

// -----------------------------------------------------------
// Import: Tablas Core v7 (10 endpoints)
// -----------------------------------------------------------
$router->post('/api/import/habilidades-lenguaje', [ImportController::class, 'importHabilidadesLenguaje'], true);
$router->post('/api/import/activacion-paci', [ImportController::class, 'importActivacionPaci'], true);
$router->post('/api/import/core-lectura', [ImportController::class, 'importCoreLectura'], true);
$router->post('/api/import/core-escritura', [ImportController::class, 'importCoreEscritura'], true);
$router->post('/api/import/core-comunicacion-oral', [ImportController::class, 'importCoreComunicacionOral'], true);
$router->post('/api/import/matriz-progresion', [ImportController::class, 'importMatrizProgresion'], true);
$router->post('/api/import/estrategias-core', [ImportController::class, 'importEstrategiasCore'], true);
$router->post('/api/import/progresion-lectora', [ImportController::class, 'importProgresionLectora'], true);
$router->post('/api/import/matriz-adecuaciones', [ImportController::class, 'importMatrizAdecuaciones'], true);
$router->post('/api/import/progresion-curricular', [ImportController::class, 'importProgresionCurricular'], true);

// -----------------------------------------------------------
// Rutas protegidas: Historial de Modificaciones
// -----------------------------------------------------------
$router->get('/api/historial/registro/{id}', [HistorialController::class, 'byRegistro'], true);
$router->get('/api/historial/tabla/{tabla}', [HistorialController::class, 'byTabla'], true);

// -----------------------------------------------------------
// Rutas protegidas: Matrices pedagógicas (catálogos v2)
// -----------------------------------------------------------
$router->get('/api/matrices/fortalezas', [MatrizFortalezaController::class, 'index'], true);
$router->get('/api/matrices/fortalezas/{id}', [MatrizFortalezaController::class, 'show'], true);
$router->post('/api/matrices/fortalezas', [MatrizFortalezaController::class, 'store'], true);
$router->put('/api/matrices/fortalezas/{id}', [MatrizFortalezaController::class, 'update'], true);
$router->patch('/api/matrices/fortalezas/{id}', [MatrizFortalezaController::class, 'toggleVigencia'], true);

$router->get('/api/matrices/barreras', [MatrizBarreraController::class, 'index'], true);
$router->get('/api/matrices/barreras/{id}', [MatrizBarreraController::class, 'show'], true);
$router->post('/api/matrices/barreras', [MatrizBarreraController::class, 'store'], true);
$router->put('/api/matrices/barreras/{id}', [MatrizBarreraController::class, 'update'], true);
$router->patch('/api/matrices/barreras/{id}', [MatrizBarreraController::class, 'toggleVigencia'], true);

$router->get('/api/matrices/estrategias-dua', [MatrizEstrategiaDuaController::class, 'index'], true);
$router->get('/api/matrices/estrategias-dua/{id}', [MatrizEstrategiaDuaController::class, 'show'], true);
$router->post('/api/matrices/estrategias-dua', [MatrizEstrategiaDuaController::class, 'store'], true);
$router->put('/api/matrices/estrategias-dua/{id}', [MatrizEstrategiaDuaController::class, 'update'], true);
$router->patch('/api/matrices/estrategias-dua/{id}', [MatrizEstrategiaDuaController::class, 'toggleVigencia'], true);

$router->get('/api/matrices/acceso-curricular', [MatrizAccesoCurricularController::class, 'index'], true);
$router->get('/api/matrices/acceso-curricular/{id}', [MatrizAccesoCurricularController::class, 'show'], true);
$router->post('/api/matrices/acceso-curricular', [MatrizAccesoCurricularController::class, 'store'], true);
$router->put('/api/matrices/acceso-curricular/{id}', [MatrizAccesoCurricularController::class, 'update'], true);
$router->patch('/api/matrices/acceso-curricular/{id}', [MatrizAccesoCurricularController::class, 'toggleVigencia'], true);

$router->get('/api/matrices/habilidades-base', [MatrizHabilidadBaseController::class, 'index'], true);
$router->get('/api/matrices/habilidades-base/{id}', [MatrizHabilidadBaseController::class, 'show'], true);
$router->post('/api/matrices/habilidades-base', [MatrizHabilidadBaseController::class, 'store'], true);
$router->put('/api/matrices/habilidades-base/{id}', [MatrizHabilidadBaseController::class, 'update'], true);
$router->patch('/api/matrices/habilidades-base/{id}', [MatrizHabilidadBaseController::class, 'toggleVigencia'], true);

$router->get('/api/matrices/estrategias-lectura', [MatrizEstrategiaLecturaController::class, 'index'], true);
$router->get('/api/matrices/estrategias-lectura/{id}', [MatrizEstrategiaLecturaController::class, 'show'], true);
$router->post('/api/matrices/estrategias-lectura', [MatrizEstrategiaLecturaController::class, 'store'], true);
$router->put('/api/matrices/estrategias-lectura/{id}', [MatrizEstrategiaLecturaController::class, 'update'], true);
$router->patch('/api/matrices/estrategias-lectura/{id}', [MatrizEstrategiaLecturaController::class, 'toggleVigencia'], true);

$router->get('/api/matrices/estrategias-escritura', [MatrizEstrategiaEscrituraController::class, 'index'], true);
$router->get('/api/matrices/estrategias-escritura/{id}', [MatrizEstrategiaEscrituraController::class, 'show'], true);
$router->post('/api/matrices/estrategias-escritura', [MatrizEstrategiaEscrituraController::class, 'store'], true);
$router->put('/api/matrices/estrategias-escritura/{id}', [MatrizEstrategiaEscrituraController::class, 'update'], true);
$router->patch('/api/matrices/estrategias-escritura/{id}', [MatrizEstrategiaEscrituraController::class, 'toggleVigencia'], true);

$router->get('/api/matrices/estrategias-comunicacion', [MatrizEstrategiaComunicacionController::class, 'index'], true);
$router->get('/api/matrices/estrategias-comunicacion/{id}', [MatrizEstrategiaComunicacionController::class, 'show'], true);
$router->post('/api/matrices/estrategias-comunicacion', [MatrizEstrategiaComunicacionController::class, 'store'], true);
$router->put('/api/matrices/estrategias-comunicacion/{id}', [MatrizEstrategiaComunicacionController::class, 'update'], true);
$router->patch('/api/matrices/estrategias-comunicacion/{id}', [MatrizEstrategiaComunicacionController::class, 'toggleVigencia'], true);

$router->get('/api/matrices/herramientas-apoyo', [MatrizHerramientaApoyoController::class, 'index'], true);
$router->get('/api/matrices/herramientas-apoyo/{id}', [MatrizHerramientaApoyoController::class, 'show'], true);
$router->post('/api/matrices/herramientas-apoyo', [MatrizHerramientaApoyoController::class, 'store'], true);
$router->put('/api/matrices/herramientas-apoyo/{id}', [MatrizHerramientaApoyoController::class, 'update'], true);
$router->patch('/api/matrices/herramientas-apoyo/{id}', [MatrizHerramientaApoyoController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Apoderados
// -----------------------------------------------------------
$router->get('/api/apoderados', [ApoderadoController::class, 'index'], true);
$router->get('/api/apoderados/{id}', [ApoderadoController::class, 'show'], true);
$router->post('/api/apoderados', [ApoderadoController::class, 'store'], true);
$router->put('/api/apoderados/{id}', [ApoderadoController::class, 'update'], true);
$router->patch('/api/apoderados/{id}', [ApoderadoController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Salud Estudiante
// -----------------------------------------------------------
$router->get('/api/salud-estudiante', [SaludEstudianteController::class, 'index'], true);
$router->get('/api/salud-estudiante/{id}', [SaludEstudianteController::class, 'show'], true);
$router->post('/api/salud-estudiante', [SaludEstudianteController::class, 'store'], true);
$router->put('/api/salud-estudiante/{id}', [SaludEstudianteController::class, 'update'], true);
$router->patch('/api/salud-estudiante/{id}', [SaludEstudianteController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Antecedentes Escolares
// -----------------------------------------------------------
$router->get('/api/antecedentes-escolares', [AntecedenteEscolarController::class, 'index'], true);
$router->get('/api/antecedentes-escolares/{id}', [AntecedenteEscolarController::class, 'show'], true);
$router->post('/api/antecedentes-escolares', [AntecedenteEscolarController::class, 'store'], true);
$router->put('/api/antecedentes-escolares/{id}', [AntecedenteEscolarController::class, 'update'], true);
$router->patch('/api/antecedentes-escolares/{id}', [AntecedenteEscolarController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: Seguimiento PACI
// -----------------------------------------------------------
$router->get('/api/seguimiento-paci', [SeguimientoPaciController::class, 'index'], true);
$router->get('/api/seguimiento-paci/{id}', [SeguimientoPaciController::class, 'show'], true);
$router->post('/api/seguimiento-paci', [SeguimientoPaciController::class, 'store'], true);
$router->put('/api/seguimiento-paci/{id}', [SeguimientoPaciController::class, 'update'], true);
$router->patch('/api/seguimiento-paci/{id}', [SeguimientoPaciController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Rutas protegidas: IA – Generación de OA adaptado
// -----------------------------------------------------------
$router->post('/api/ai/generar-oa-adaptado', [AiController::class, 'generarOaAdaptado'], true);

// -----------------------------------------------------------
// Rutas protegidas: IA OpenRouter (prueba aislada)
// -----------------------------------------------------------
$router->post('/api/ai-openrouter/generar-paci-completo', [OpenRouterAiController::class, 'generarPaciCompleto'], true);
$router->post('/api/ai-openrouter/generar-oa-adaptado', [OpenRouterAiController::class, 'generarOaAdaptado'], true);

// -----------------------------------------------------------
// Rutas protegidas: IA Admin (configuración del motor)
// -----------------------------------------------------------
$router->get('/api/admin/ia/config', [AiAdminController::class, 'getConfig'], true);
$router->put('/api/admin/ia/config', [AiAdminController::class, 'saveConfig'], true);
$router->post('/api/admin/ia/parametros', [AiAdminController::class, 'storeParametro'], true);
$router->put('/api/admin/ia/parametros/{id}', [AiAdminController::class, 'updateParametro'], true);
$router->patch('/api/admin/ia/parametros/{id}', [AiAdminController::class, 'toggleParametro'], true);

// -----------------------------------------------------------
// Rutas protegidas: Chatbot Pedagógico (público = autenticado)
// -----------------------------------------------------------
$router->get('/api/chatbot/temas', [ChatbotController::class, 'temasPublic'], true);
$router->get('/api/chatbot/temas/{id}/arbol', [ChatbotController::class, 'arbol'], true);

// -----------------------------------------------------------
// Rutas protegidas: Chatbot Admin (CRUD temas + opciones)
// -----------------------------------------------------------
$router->get('/api/admin/chatbot/temas', [ChatbotController::class, 'indexTemas'], true);
$router->get('/api/admin/chatbot/temas/{id}', [ChatbotController::class, 'showTema'], true);
$router->post('/api/admin/chatbot/temas', [ChatbotController::class, 'storeTema'], true);
$router->put('/api/admin/chatbot/temas/{id}', [ChatbotController::class, 'updateTema'], true);
$router->patch('/api/admin/chatbot/temas/{id}', [ChatbotController::class, 'toggleTema'], true);

$router->get('/api/admin/chatbot/opciones', [ChatbotController::class, 'indexOpciones'], true);
$router->get('/api/admin/chatbot/opciones/{id}', [ChatbotController::class, 'showOpcion'], true);
$router->post('/api/admin/chatbot/opciones', [ChatbotController::class, 'storeOpcion'], true);
$router->put('/api/admin/chatbot/opciones/{id}', [ChatbotController::class, 'updateOpcion'], true);
$router->patch('/api/admin/chatbot/opciones/{id}', [ChatbotController::class, 'toggleOpcion'], true);
$router->post('/api/admin/chatbot/import', [ChatbotController::class, 'importExcel'], true);

// -----------------------------------------------------------
// Rutas protegidas: Tablas Core v7 (11 catálogos)
// -----------------------------------------------------------
$router->get('/api/habilidades-lenguaje', [HabilidadLenguajeController::class, 'index'], true);
$router->get('/api/habilidades-lenguaje/{id}', [HabilidadLenguajeController::class, 'show'], true);
$router->post('/api/habilidades-lenguaje', [HabilidadLenguajeController::class, 'store'], true);
$router->put('/api/habilidades-lenguaje/{id}', [HabilidadLenguajeController::class, 'update'], true);
$router->patch('/api/habilidades-lenguaje/{id}', [HabilidadLenguajeController::class, 'toggleVigencia'], true);

$router->get('/api/activacion-paci', [ActivacionPaciController::class, 'index'], true);
$router->get('/api/activacion-paci/{id}', [ActivacionPaciController::class, 'show'], true);
$router->post('/api/activacion-paci', [ActivacionPaciController::class, 'store'], true);
$router->put('/api/activacion-paci/{id}', [ActivacionPaciController::class, 'update'], true);
$router->patch('/api/activacion-paci/{id}', [ActivacionPaciController::class, 'toggleVigencia'], true);

$router->get('/api/core-lectura', [CoreLecturaController::class, 'index'], true);
$router->get('/api/core-lectura/{id}', [CoreLecturaController::class, 'show'], true);
$router->post('/api/core-lectura', [CoreLecturaController::class, 'store'], true);
$router->put('/api/core-lectura/{id}', [CoreLecturaController::class, 'update'], true);
$router->patch('/api/core-lectura/{id}', [CoreLecturaController::class, 'toggleVigencia'], true);

$router->get('/api/core-escritura', [CoreEscrituraController::class, 'index'], true);
$router->get('/api/core-escritura/{id}', [CoreEscrituraController::class, 'show'], true);
$router->post('/api/core-escritura', [CoreEscrituraController::class, 'store'], true);
$router->put('/api/core-escritura/{id}', [CoreEscrituraController::class, 'update'], true);
$router->patch('/api/core-escritura/{id}', [CoreEscrituraController::class, 'toggleVigencia'], true);

$router->get('/api/core-comunicacion-oral', [CoreComunicacionOralController::class, 'index'], true);
$router->get('/api/core-comunicacion-oral/{id}', [CoreComunicacionOralController::class, 'show'], true);
$router->post('/api/core-comunicacion-oral', [CoreComunicacionOralController::class, 'store'], true);
$router->put('/api/core-comunicacion-oral/{id}', [CoreComunicacionOralController::class, 'update'], true);
$router->patch('/api/core-comunicacion-oral/{id}', [CoreComunicacionOralController::class, 'toggleVigencia'], true);

$router->get('/api/matriz-progresion', [MatrizProgresionController::class, 'index'], true);
$router->get('/api/matriz-progresion/{id}', [MatrizProgresionController::class, 'show'], true);
$router->post('/api/matriz-progresion', [MatrizProgresionController::class, 'store'], true);
$router->put('/api/matriz-progresion/{id}', [MatrizProgresionController::class, 'update'], true);
$router->patch('/api/matriz-progresion/{id}', [MatrizProgresionController::class, 'toggleVigencia'], true);

$router->get('/api/estrategias-core', [EstrategiaCoreController::class, 'index'], true);
$router->get('/api/estrategias-core/{id}', [EstrategiaCoreController::class, 'show'], true);
$router->post('/api/estrategias-core', [EstrategiaCoreController::class, 'store'], true);
$router->put('/api/estrategias-core/{id}', [EstrategiaCoreController::class, 'update'], true);
$router->patch('/api/estrategias-core/{id}', [EstrategiaCoreController::class, 'toggleVigencia'], true);

$router->get('/api/diagnostico-core', [DiagnosticoCoreController::class, 'index'], true);
$router->get('/api/diagnostico-core/{id}', [DiagnosticoCoreController::class, 'show'], true);
$router->post('/api/diagnostico-core', [DiagnosticoCoreController::class, 'store'], true);
$router->put('/api/diagnostico-core/{id}', [DiagnosticoCoreController::class, 'update'], true);
$router->patch('/api/diagnostico-core/{id}', [DiagnosticoCoreController::class, 'toggleVigencia'], true);

$router->get('/api/progresion-lectora', [ProgresionLectoraController::class, 'index'], true);
$router->get('/api/progresion-lectora/{id}', [ProgresionLectoraController::class, 'show'], true);
$router->post('/api/progresion-lectora', [ProgresionLectoraController::class, 'store'], true);
$router->put('/api/progresion-lectora/{id}', [ProgresionLectoraController::class, 'update'], true);
$router->patch('/api/progresion-lectora/{id}', [ProgresionLectoraController::class, 'toggleVigencia'], true);

$router->get('/api/matriz-adecuaciones', [MatrizAdecuacionController::class, 'index'], true);
$router->get('/api/matriz-adecuaciones/{id}', [MatrizAdecuacionController::class, 'show'], true);
$router->post('/api/matriz-adecuaciones', [MatrizAdecuacionController::class, 'store'], true);
$router->put('/api/matriz-adecuaciones/{id}', [MatrizAdecuacionController::class, 'update'], true);
$router->patch('/api/matriz-adecuaciones/{id}', [MatrizAdecuacionController::class, 'toggleVigencia'], true);

$router->get('/api/progresion-curricular', [ProgresionCurricularController::class, 'index'], true);
$router->get('/api/progresion-curricular/{id}', [ProgresionCurricularController::class, 'show'], true);
$router->post('/api/progresion-curricular', [ProgresionCurricularController::class, 'store'], true);
$router->put('/api/progresion-curricular/{id}', [ProgresionCurricularController::class, 'update'], true);
$router->patch('/api/progresion-curricular/{id}', [ProgresionCurricularController::class, 'toggleVigencia'], true);

// -----------------------------------------------------------
// Despachar la peticion
// -----------------------------------------------------------
try {
    $router->dispatch($method, $uri);
} catch (\Throwable $e) {
    Response::error('Error interno del servidor: ' . $e->getMessage(), 500);
}

// -----------------------------------------------------------
// Clase inline para health check
// -----------------------------------------------------------
class HealthCheck
{
    public function check(array $params): void
    {
        try {
            $db = \App\Config\Database::getInstance();
            $db->query('SELECT 1');

            $serviceCandidates = [
                dirname(__DIR__) . '/src/Services/PaciService.php',
                dirname(__DIR__) . '/backend/src/Services/PaciService.php',
                dirname(__DIR__, 2) . '/backend/src/Services/PaciService.php',
            ];

            $servicePath = null;
            foreach ($serviceCandidates as $candidate) {
                if (is_file($candidate)) {
                    $servicePath = $candidate;
                    break;
                }
            }

            $diag = [
                'service_path' => $servicePath,
                'service_exists' => $servicePath !== null,
                'service_mtime' => $servicePath ? date('c', (int) filemtime($servicePath)) : null,
                'service_md5' => $servicePath ? md5_file($servicePath) : null,
                'horario_tables' => [
                    'paci_horario_apoyo' => null,
                    'paci_horario_apoyo_columnas' => null,
                    'paci_horario_apoyo_filas' => null,
                    'paci_horario_apoyo_celdas' => null,
                ],
            ];

            foreach (array_keys($diag['horario_tables']) as $table) {
                try {
                    $stmt = $db->query("SELECT COUNT(*) AS total FROM {$table} WHERE vigencia = 1");
                    $row = $stmt->fetch();
                    $diag['horario_tables'][$table] = isset($row['total']) ? (int) $row['total'] : 0;
                } catch (\Throwable $e) {
                    $diag['horario_tables'][$table] = 'missing';
                }
            }

            Response::success([
                'status' => 'ok',
                'database' => 'connected',
                'timestamp' => date('c'),
                'diag' => $diag,
            ]);
        } catch (\Exception $e) {
            Response::error('Base de datos no disponible', 503);
        }
    }
}
