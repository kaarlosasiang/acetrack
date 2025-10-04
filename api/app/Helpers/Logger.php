<?php
class Logger {
    const ERROR = 'ERROR';
    const WARNING = 'WARNING';
    const INFO = 'INFO';
    const DEBUG = 'DEBUG';
    
    private static $logDir = null;
    
    // Initialize logger
    public static function init() {
        if (self::$logDir === null) {
            self::$logDir = STORAGE_PATH . '/logs';
            
            // Create logs directory if it doesn't exist
            if (!is_dir(self::$logDir)) {
                mkdir(self::$logDir, 0755, true);
            }
        }
    }
    
    // Write log entry
    public static function log($level, $message, $context = [], $logFile = 'app.log') {
        self::init();
        
        $timestamp = date('Y-m-d H:i:s');
        $contextStr = !empty($context) ? json_encode($context, JSON_UNESCAPED_UNICODE) : '';
        
        // Format log entry
        $logEntry = "[{$timestamp}] [{$level}] {$message}";
        
        if ($contextStr) {
            $logEntry .= " Context: {$contextStr}";
        }
        
        $logEntry .= PHP_EOL;
        
        // Write to log file
        $logFilePath = self::$logDir . '/' . $logFile;
        file_put_contents($logFilePath, $logEntry, FILE_APPEND | LOCK_EX);
    }
    
    // Log error
    public static function error($message, $context = [], $logFile = 'error.log') {
        self::log(self::ERROR, $message, $context, $logFile);
    }
    
    // Log warning
    public static function warning($message, $context = [], $logFile = 'app.log') {
        self::log(self::WARNING, $message, $context, $logFile);
    }
    
    // Log info
    public static function info($message, $context = [], $logFile = 'app.log') {
        self::log(self::INFO, $message, $context, $logFile);
    }
    
    // Log debug (only in development)
    public static function debug($message, $context = [], $logFile = 'debug.log') {
        if (APP_ENV === 'development') {
            self::log(self::DEBUG, $message, $context, $logFile);
        }
    }
    
    // Log API request
    public static function logRequest($method, $path, $userId = null, $statusCode = null, $duration = null) {
        $context = [
            'method' => $method,
            'path' => $path,
            'user_id' => $userId,
            'status_code' => $statusCode,
            'duration_ms' => $duration,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ];
        
        self::info("API Request: {$method} {$path}", $context, 'access.log');
    }
    
    // Log authentication events
    public static function logAuth($event, $userId, $context = []) {
        $context['user_id'] = $userId;
        $context['ip'] = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $context['user_agent'] = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        
        self::info("Auth: {$event}", $context, 'auth.log');
    }
    
    // Log database queries (for debugging)
    public static function logQuery($sql, $params = [], $duration = null, $error = null) {
        if (APP_ENV !== 'development') {
            return; // Only log queries in development
        }
        
        $context = [
            'sql' => $sql,
            'params' => $params,
            'duration_ms' => $duration
        ];
        
        if ($error) {
            $context['error'] = $error;
            self::error("Database Query Failed", $context, 'database.log');
        } else {
            self::debug("Database Query", $context, 'database.log');
        }
    }
    
    // Log exception with full stack trace
    public static function logException(Exception $e, $context = []) {
        $context['exception'] = [
            'class' => get_class($e),
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ];
        
        self::error("Exception: " . $e->getMessage(), $context, 'error.log');
    }
    
    // Log security events
    public static function logSecurity($event, $context = []) {
        $context['ip'] = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $context['user_agent'] = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        $context['timestamp'] = time();
        
        self::warning("Security: {$event}", $context, 'security.log');
    }
    
    // Log tenant-related events
    public static function logTenant($event, $organizationId, $userId = null, $context = []) {
        $context['organization_id'] = $organizationId;
        $context['user_id'] = $userId;
        
        self::info("Tenant: {$event}", $context, 'tenant.log');
    }
    
    // Get log files list
    public static function getLogFiles() {
        self::init();
        
        $files = [];
        $iterator = new DirectoryIterator(self::$logDir);
        
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'log') {
                $files[] = [
                    'name' => $file->getFilename(),
                    'size' => $file->getSize(),
                    'modified' => $file->getMTime()
                ];
            }
        }
        
        // Sort by modification time (newest first)
        usort($files, function($a, $b) {
            return $b['modified'] - $a['modified'];
        });
        
        return $files;
    }
    
    // Read log file content
    public static function readLog($filename, $lines = 100, $reverse = true) {
        self::init();
        
        $filepath = self::$logDir . '/' . $filename;
        
        if (!file_exists($filepath)) {
            throw new Exception("Log file not found: {$filename}");
        }
        
        $content = file_get_contents($filepath);
        $logLines = explode("\n", trim($content));
        
        if ($reverse) {
            $logLines = array_reverse($logLines);
        }
        
        return array_slice($logLines, 0, $lines);
    }
    
    // Clear old log files
    public static function clearOldLogs($days = 30) {
        self::init();
        
        $cutoffTime = time() - ($days * 24 * 60 * 60);
        $deletedFiles = 0;
        
        $iterator = new DirectoryIterator(self::$logDir);
        
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'log') {
                if ($file->getMTime() < $cutoffTime) {
                    unlink($file->getPathname());
                    $deletedFiles++;
                }
            }
        }
        
        self::info("Log cleanup completed", ['deleted_files' => $deletedFiles]);
        
        return $deletedFiles;
    }
    
    // Rotate large log files
    public static function rotateLogs($maxSizeMB = 10) {
        self::init();
        
        $maxSize = $maxSizeMB * 1024 * 1024; // Convert to bytes
        $rotatedFiles = 0;
        
        $iterator = new DirectoryIterator(self::$logDir);
        
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'log') {
                if ($file->getSize() > $maxSize) {
                    $originalPath = $file->getPathname();
                    $rotatedPath = $originalPath . '.' . date('Y-m-d-H-i-s');
                    
                    // Rename current log file
                    rename($originalPath, $rotatedPath);
                    
                    // Create new empty log file
                    touch($originalPath);
                    chmod($originalPath, 0644);
                    
                    $rotatedFiles++;
                }
            }
        }
        
        if ($rotatedFiles > 0) {
            self::info("Log rotation completed", ['rotated_files' => $rotatedFiles]);
        }
        
        return $rotatedFiles;
    }
    
    // Format bytes to human readable format
    private static function formatBytes($bytes, $precision = 2) {
        $units = ['B', 'KB', 'MB', 'GB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, $precision) . ' ' . $units[$i];
    }
    
    // Get log statistics
    public static function getLogStats() {
        self::init();
        
        $stats = [
            'total_files' => 0,
            'total_size' => 0,
            'files' => []
        ];
        
        $iterator = new DirectoryIterator(self::$logDir);
        
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'log') {
                $stats['total_files']++;
                $stats['total_size'] += $file->getSize();
                
                $stats['files'][] = [
                    'name' => $file->getFilename(),
                    'size' => self::formatBytes($file->getSize()),
                    'size_bytes' => $file->getSize(),
                    'modified' => date('Y-m-d H:i:s', $file->getMTime())
                ];
            }
        }
        
        $stats['total_size_formatted'] = self::formatBytes($stats['total_size']);
        
        // Sort files by size (largest first)
        usort($stats['files'], function($a, $b) {
            return $b['size_bytes'] - $a['size_bytes'];
        });
        
        return $stats;
    }
}
?>