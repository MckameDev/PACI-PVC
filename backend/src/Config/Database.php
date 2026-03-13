<?php

declare(strict_types=1);

namespace App\Config;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $instance = null;

    private function __construct() {}
    private function __clone() {}

    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            // Cargar variables de entorno
            Env::load();

            $host    = Env::get('DB_HOST', 'localhost');
            $port    = Env::get('DB_PORT', '3306');
            $dbName  = Env::get('DB_NAME', 'PACI_PVC');
            $user    = Env::get('DB_USER', 'root');
            $pass    = Env::get('DB_PASS', '');
            $charset = 'utf8mb4';

            try {
                $dsn = sprintf(
                    'mysql:host=%s;port=%s;dbname=%s;charset=%s',
                    $host,
                    $port,
                    $dbName,
                    $charset
                );

                self::$instance = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'status'  => 'error',
                    'message' => 'Error de conexion a la base de datos'
                ]);
                exit;
            }
        }

        return self::$instance;
    }
}
