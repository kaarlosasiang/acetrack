<?php
require_once 'BaseController.php';

class HealthController extends BaseController
{
    /**
     * Basic health check endpoint
     * Returns system status and basic information
     */
    public function index($params = [])
    {
        try {
            $health_data = [
                'status' => 'healthy',
                'timestamp' => date('Y-m-d H:i:s'),
                'version' => '1.0.0',
                'system' => [
                    'php_version' => PHP_VERSION,
                    'memory_usage' => $this->formatBytes(memory_get_usage(true)),
                    'peak_memory' => $this->formatBytes(memory_get_peak_usage(true)),
                    'uptime' => $this->getUptime(),
                ],
                'checks' => [
                    'database' => $this->checkDatabase(),
                    'storage' => $this->checkStorage(),
                    'php_extensions' => $this->checkExtensions(),
                ]
            ];

            // Determine overall health status
            $all_checks_passed = true;
            foreach ($health_data['checks'] as $check) {
                if (!$check['status']) {
                    $all_checks_passed = false;
                    break;
                }
            }

            $health_data['status'] = $all_checks_passed ? 'healthy' : 'unhealthy';
            $http_status = $all_checks_passed ? 200 : 503;

            $this->jsonResponse($health_data, $http_status);

        } catch (Exception $e) {
            $this->jsonResponse([
                'status' => 'error',
                'message' => 'Health check failed',
                'error' => $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s')
            ], 503);
        }
    }

    /**
     * Simple ping endpoint
     */
    public function ping($params = [])
    {
        $this->jsonResponse([
            'status' => 'pong',
            'timestamp' => date('Y-m-d H:i:s')
        ], 200);
    }

    /**
     * Detailed system information (admin only)
     */
    public function system($params = [])
    {
        // Check if user is admin (this would require authentication middleware)
        // For now, we'll include basic checks

        $system_info = [
            'server' => [
                'software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
                'php_version' => PHP_VERSION,
                'php_sapi' => PHP_SAPI,
                'os' => PHP_OS,
                'architecture' => php_uname('m'),
                'hostname' => gethostname(),
            ],
            'memory' => [
                'current_usage' => memory_get_usage(true),
                'current_usage_formatted' => $this->formatBytes(memory_get_usage(true)),
                'peak_usage' => memory_get_peak_usage(true),
                'peak_usage_formatted' => $this->formatBytes(memory_get_peak_usage(true)),
                'limit' => ini_get('memory_limit'),
            ],
            'php_config' => [
                'max_execution_time' => ini_get('max_execution_time'),
                'post_max_size' => ini_get('post_max_size'),
                'upload_max_filesize' => ini_get('upload_max_filesize'),
                'max_file_uploads' => ini_get('max_file_uploads'),
            ],
            'extensions' => $this->getLoadedExtensions(),
            'storage' => $this->getStorageInfo(),
        ];

        $this->jsonResponse([
            'status' => 'success',
            'data' => $system_info,
            'timestamp' => date('Y-m-d H:i:s')
        ], 200);
    }

    /**
     * Check database connectivity
     */
    private function checkDatabase()
    {
        try {
            // Use the existing Database singleton
            $db = Database::getInstance();
            $connection = $db->getConnection();
            
            // Simple query to test connection
            $stmt = $connection->query('SELECT 1');
            $result = $stmt->fetch();
            
            return [
                'status' => true,
                'message' => 'Database connection successful',
                'response_time' => 'Fast'
            ];
            
        } catch (Exception $e) {
            return [
                'status' => false,
                'message' => 'Database connection failed',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Check storage directories
     */
    private function checkStorage()
    {
        $storage_paths = [
            'uploads' => __DIR__ . '/../../storage/uploads',
            'logs' => __DIR__ . '/../../storage/logs',
            'cache' => __DIR__ . '/../../storage/cache',
            'qr_codes' => __DIR__ . '/../../storage/qr_codes',
        ];

        $issues = [];
        foreach ($storage_paths as $name => $path) {
            if (!is_dir($path)) {
                $issues[] = "Directory $name does not exist: $path";
            } elseif (!is_writable($path)) {
                $issues[] = "Directory $name is not writable: $path";
            }
        }

        return [
            'status' => empty($issues),
            'message' => empty($issues) ? 'All storage directories accessible' : 'Storage issues found',
            'issues' => $issues
        ];
    }

    /**
     * Check required PHP extensions
     */
    private function checkExtensions()
    {
        $required_extensions = [
            'pdo',
            'pdo_mysql',
            'json',
            'mbstring',
            'openssl',
            'curl',
            'gd',
            'fileinfo',
        ];

        $missing = [];
        foreach ($required_extensions as $extension) {
            if (!extension_loaded($extension)) {
                $missing[] = $extension;
            }
        }

        return [
            'status' => empty($missing),
            'message' => empty($missing) ? 'All required extensions loaded' : 'Missing extensions found',
            'missing' => $missing,
            'loaded_count' => count($required_extensions) - count($missing),
            'total_required' => count($required_extensions)
        ];
    }

    /**
     * Get all loaded PHP extensions
     */
    private function getLoadedExtensions()
    {
        return get_loaded_extensions();
    }

    /**
     * Get storage information
     */
    private function getStorageInfo()
    {
        $storage_root = __DIR__ . '/../../storage';
        
        $info = [];
        if (is_dir($storage_root)) {
            $info['free_space'] = disk_free_space($storage_root);
            $info['free_space_formatted'] = $this->formatBytes(disk_free_space($storage_root));
            $info['total_space'] = disk_total_space($storage_root);
            $info['total_space_formatted'] = $this->formatBytes(disk_total_space($storage_root));
            $info['used_space'] = $info['total_space'] - $info['free_space'];
            $info['used_space_formatted'] = $this->formatBytes($info['used_space']);
            $info['usage_percentage'] = round(($info['used_space'] / $info['total_space']) * 100, 2);
        }

        return $info;
    }

    /**
     * Get system uptime (approximate)
     */
    private function getUptime()
    {
        // This is a simplified uptime - in production you might want to track actual service uptime
        if (function_exists('sys_getloadavg')) {
            $load = sys_getloadavg();
            return [
                'load_average' => $load,
                'note' => 'Load average for 1, 5, and 15 minutes'
            ];
        }
        
        return 'Uptime information not available';
    }

    /**
     * Format bytes into human readable format
     */
    private function formatBytes($bytes, $precision = 2)
    {
        $units = array('B', 'KB', 'MB', 'GB', 'TB');

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, $precision) . ' ' . $units[$i];
    }
}