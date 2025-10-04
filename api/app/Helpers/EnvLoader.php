<?php
/**
 * Environment Configuration Loader
 * Simple .env file loader for AceTrack API
 */

class EnvLoader {
    
    /**
     * Load environment variables from .env file
     */
    public static function load($filePath = null) {
        $filePath = $filePath ?: dirname(dirname(__DIR__)) . '/.env';
        
        if (!file_exists($filePath)) {
            return false;
        }
        
        $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        foreach ($lines as $line) {
            // Skip comments
            if (strpos(trim($line), '#') === 0) {
                continue;
            }
            
            // Parse key=value pairs
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // Remove quotes if present
                $value = trim($value, '"\'');
                
                // Set environment variable if not already set
                if (!isset($_ENV[$key])) {
                    $_ENV[$key] = $value;
                    putenv("$key=$value");
                }
            }
        }
        
        return true;
    }
    
    /**
     * Get environment variable with default
     */
    public static function get($key, $default = null) {
        return $_ENV[$key] ?? getenv($key) ?: $default;
    }
    
    /**
     * Check if .env file exists
     */
    public static function envFileExists($filePath = null) {
        $filePath = $filePath ?: dirname(dirname(__DIR__)) . '/.env';
        return file_exists($filePath);
    }
    
    /**
     * Create .env file from example
     */
    public static function createFromExample() {
        $examplePath = dirname(dirname(__DIR__)) . '/.env.example';
        $envPath = dirname(dirname(__DIR__)) . '/.env';
        
        if (file_exists($examplePath) && !file_exists($envPath)) {
            return copy($examplePath, $envPath);
        }
        
        return false;
    }
}

// Auto-load .env file if it exists
if (EnvLoader::envFileExists()) {
    EnvLoader::load();
}
?>