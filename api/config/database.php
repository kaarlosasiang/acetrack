<?php
// Database configuration
define('DB_HOST', 'localhost');
define('DB_PORT', '8889');
define('DB_NAME', 'acetrack');
define('DB_USER', 'root');
define('DB_PASS', 'root'); // Change this to your MAMP MySQL password

// Database connection class
class Database {
    private static $instance = null;
    private $connection;
    
    private function __construct() {
        try {
            $this->connection = new PDO(
                'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
                ]
            );
        } catch (PDOException $e) {
            throw new Exception('Database connection failed: ' . $e->getMessage());
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    // Execute a SELECT query
    public function query($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            throw new Exception('Query execution failed: ' . $e->getMessage());
        }
    }
    
    // Execute a SELECT query and return single row
    public function queryOne($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetch();
        } catch (PDOException $e) {
            throw new Exception('Query execution failed: ' . $e->getMessage());
        }
    }
    
    // Execute INSERT, UPDATE, DELETE queries
    public function execute($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $result = $stmt->execute($params);
            return [
                'success' => $result,
                'affected_rows' => $stmt->rowCount(),
                'last_insert_id' => $this->connection->lastInsertId()
            ];
        } catch (PDOException $e) {
            throw new Exception('Query execution failed: ' . $e->getMessage());
        }
    }
    
    // Start a transaction
    public function beginTransaction() {
        return $this->connection->beginTransaction();
    }
    
    // Commit a transaction
    public function commit() {
        return $this->connection->commit();
    }
    
    // Rollback a transaction
    public function rollback() {
        return $this->connection->rollback();
    }
    
    // Get the last inserted ID
    public function getLastInsertId() {
        return $this->connection->lastInsertId();
    }
    
    // Prevent cloning
    private function __clone() {}
    
    // Prevent unserialization
    public function __wakeup() {}
}

// Create global database instance
$db = Database::getInstance();
?>