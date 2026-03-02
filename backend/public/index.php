<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

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

date_default_timezone_set(AppConfig::APP_TIMEZONE);

Cors::handle();

$router = new Router();
$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remover prefijo del directorio si se accede via XAMPP (ej: /PaciPVC/backend/public)
$basePath = '/PaciPVC/backend/public';
if (str_starts_with($uri, $basePath)) {
    $uri = substr($uri, strlen($basePath));
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
// Rutas protegidas: Objetivos de Aprendizaje
// -----------------------------------------------------------
$router->get('/api/oa', [OaController::class, 'index'], true);
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
// Rutas protegidas: Historial de Modificaciones
// -----------------------------------------------------------
$router->get('/api/historial/registro/{id}', [HistorialController::class, 'byRegistro'], true);
$router->get('/api/historial/tabla/{tabla}', [HistorialController::class, 'byTabla'], true);

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
            Response::success(['status' => 'ok', 'database' => 'connected', 'timestamp' => date('c')]);
        } catch (\Exception $e) {
            Response::error('Base de datos no disponible', 503);
        }
    }
}
