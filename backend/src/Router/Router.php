<?php

declare(strict_types=1);

namespace App\Router;

use App\Helpers\Response;

class Router
{
    private array $routes = [];
    private string $prefix = '';

    // Registra ruta GET
    public function get(string $path, array $handler, bool $auth = true): void
    {
        $this->addRoute('GET', $path, $handler, $auth);
    }

    // Registra ruta POST
    public function post(string $path, array $handler, bool $auth = true): void
    {
        $this->addRoute('POST', $path, $handler, $auth);
    }

    // Registra ruta PUT
    public function put(string $path, array $handler, bool $auth = true): void
    {
        $this->addRoute('PUT', $path, $handler, $auth);
    }

    // Registra ruta PATCH
    public function patch(string $path, array $handler, bool $auth = true): void
    {
        $this->addRoute('PATCH', $path, $handler, $auth);
    }

    // Define prefijo para agrupacion de rutas
    public function group(string $prefix, callable $callback): void
    {
        $previousPrefix = $this->prefix;
        $this->prefix   = $previousPrefix . $prefix;
        $callback($this);
        $this->prefix = $previousPrefix;
    }

    // Despacha la peticion entrante al handler correspondiente
    public function dispatch(string $method, string $uri): void
    {
        $uri = '/' . trim($uri, '/');

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }

            $pattern = $this->buildPattern($route['path']);

            if (preg_match($pattern, $uri, $matches)) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);

                if ($route['auth']) {
                    \App\Middleware\AuthMiddleware::handle();
                }

                $controller = new $route['handler'][0]();
                $methodName = $route['handler'][1];

                $controller->$methodName($params);
                return;
            }
        }

        Response::notFound('Ruta no encontrada');
    }

    // Agrega ruta al registro interno
    private function addRoute(string $method, string $path, array $handler, bool $auth): void
    {
        $this->routes[] = [
            'method'  => $method,
            'path'    => $this->prefix . $path,
            'handler' => $handler,
            'auth'    => $auth,
        ];
    }

    // Convierte path con parametros dinamicos a patron regex
    private function buildPattern(string $path): string
    {
        $pattern = preg_replace('/\{([a-zA-Z_]+)\}/', '(?P<$1>[a-f0-9\-]{36}|[a-zA-Z0-9\-_]+)', $path);
        return '#^' . $pattern . '$#';
    }
}
