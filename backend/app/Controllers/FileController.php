<?php
require_once 'BaseController.php';

class FileController extends BaseController {
    
    // Serve uploaded files (public endpoint with optional authentication)
    public function serve($params = []) {
        try {
            $filename = $params['filename'] ?? null;
            
            if (!$filename) {
                $this->error('Filename is required', 400);
            }
            
            // Sanitize filename to prevent directory traversal
            $filename = basename($filename);
            $filePath = STORAGE_PATH . '/uploads/' . $filename;
            
            // Check if file exists
            if (!file_exists($filePath)) {
                $this->error('File not found', 404);
            }
            
            // Get file information
            $fileInfo = pathinfo($filePath);
            $mimeType = $this->getMimeType($fileInfo['extension'] ?? '');
            
            // Set appropriate headers
            header('Content-Type: ' . $mimeType);
            header('Content-Length: ' . filesize($filePath));
            header('Content-Disposition: inline; filename="' . $filename . '"');
            
            // Cache headers for static files
            $cacheTime = 3600 * 24 * 30; // 30 days
            header('Cache-Control: public, max-age=' . $cacheTime);
            header('Expires: ' . gmdate('D, d M Y H:i:s', time() + $cacheTime) . ' GMT');
            header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($filePath)) . ' GMT');
            
            // Handle conditional requests
            $lastModified = filemtime($filePath);
            $etag = md5($filename . $lastModified);
            
            header('ETag: "' . $etag . '"');
            
            // Check if client has cached version
            $ifModifiedSince = $_SERVER['HTTP_IF_MODIFIED_SINCE'] ?? '';
            $ifNoneMatch = $_SERVER['HTTP_IF_NONE_MATCH'] ?? '';
            
            if ($ifModifiedSince && strtotime($ifModifiedSince) >= $lastModified) {
                http_response_code(304);
                exit();
            }
            
            if ($ifNoneMatch && $ifNoneMatch === '"' . $etag . '"') {
                http_response_code(304);
                exit();
            }
            
            // Serve the file
            readfile($filePath);
            exit();
            
        } catch (Exception $e) {
            $this->error('Failed to serve file: ' . $e->getMessage(), 500);
        }
    }
    
    // Upload general file (authenticated endpoint)
    public function upload($params = []) {
        $this->requireAuth();
        
        try {
            $fileKey = $this->input('file_key', 'file');
            $fileType = $this->input('file_type', 'document'); // image, document, avatar, banner
            
            if (!isset($_FILES[$fileKey])) {
                $this->error('No file provided', 400);
            }
            
            // Determine allowed file types and size based on file type
            $allowedTypes = ALLOWED_DOCUMENT_TYPES;
            $maxSize = MAX_UPLOAD_SIZE;
            
            switch ($fileType) {
                case 'image':
                case 'avatar':
                case 'banner':
                    $allowedTypes = ALLOWED_IMAGE_TYPES;
                    break;
                case 'document':
                    $allowedTypes = ALLOWED_DOCUMENT_TYPES;
                    break;
                default:
                    $allowedTypes = array_merge(ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES);
            }
            
            // Upload the file
            $uploadResult = $this->uploadFile($fileKey, $allowedTypes, $maxSize);
            
            if (!$uploadResult) {
                $this->error('Failed to upload file');
            }
            
            // Log the file upload
            $this->logAudit('file_uploaded', 'File', null, null, [
                'filename' => $uploadResult['filename'],
                'original_name' => $uploadResult['original_name'],
                'file_type' => $fileType,
                'size' => $uploadResult['size']
            ]);
            
            $this->success($uploadResult, 'File uploaded successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to upload file: ' . $e->getMessage(), 500);
        }
    }
    
    // Delete file (authenticated endpoint)
    public function delete($params = []) {
        $this->requireAuth();
        
        try {
            $filename = $this->input('filename');
            
            if (!$filename) {
                $this->error('Filename is required', 400);
            }
            
            // Sanitize filename
            $filename = basename($filename);
            $filePath = STORAGE_PATH . '/uploads/' . $filename;
            
            // Check if file exists
            if (!file_exists($filePath)) {
                $this->error('File not found', 404);
            }
            
            // TODO: Add permission check - users should only be able to delete their own files
            // This would require a file ownership tracking system
            
            // Delete the file
            if (!unlink($filePath)) {
                $this->error('Failed to delete file');
            }
            
            // Log the file deletion
            $this->logAudit('file_deleted', 'File', null, ['filename' => $filename], null);
            
            $this->success(null, 'File deleted successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to delete file: ' . $e->getMessage(), 500);
        }
    }
    
    // Get file information (authenticated endpoint)
    public function info($params = []) {
        $this->requireAuth();
        
        try {
            $filename = $this->input('filename');
            
            if (!$filename) {
                $this->error('Filename is required', 400);
            }
            
            // Sanitize filename
            $filename = basename($filename);
            $filePath = STORAGE_PATH . '/uploads/' . $filename;
            
            // Check if file exists
            if (!file_exists($filePath)) {
                $this->error('File not found', 404);
            }
            
            // Get file information
            $fileInfo = [
                'filename' => $filename,
                'size' => filesize($filePath),
                'mime_type' => $this->getMimeType(pathinfo($filePath, PATHINFO_EXTENSION)),
                'created_at' => date('Y-m-d H:i:s', filectime($filePath)),
                'modified_at' => date('Y-m-d H:i:s', filemtime($filePath)),
                'url' => '/uploads/' . $filename
            ];
            
            $this->success($fileInfo, 'File information retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get file information: ' . $e->getMessage(), 500);
        }
    }
    
    // List user's uploaded files (authenticated endpoint)
    public function listFiles($params = []) {
        $this->requireAuth();
        
        try {
            $fileType = $this->input('file_type'); // image, document, etc.
            $page = max(1, (int)($this->input('page', 1)));
            $perPage = min(50, max(1, (int)($this->input('per_page', 20))));
            
            $uploadsDir = STORAGE_PATH . '/uploads/';
            
            if (!is_dir($uploadsDir)) {
                $this->success([
                    'files' => [],
                    'pagination' => [
                        'current_page' => 1,
                        'per_page' => $perPage,
                        'total' => 0,
                        'total_pages' => 0
                    ]
                ], 'No files found');
            }
            
            // Get all files
            $allFiles = array_diff(scandir($uploadsDir), ['.', '..']);
            $files = [];
            
            foreach ($allFiles as $filename) {
                $filePath = $uploadsDir . $filename;
                
                if (is_file($filePath)) {
                    $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
                    
                    // Filter by file type if specified
                    if ($fileType) {
                        $isImage = in_array($extension, ALLOWED_IMAGE_TYPES);
                        $isDocument = in_array($extension, ALLOWED_DOCUMENT_TYPES);
                        
                        if ($fileType === 'image' && !$isImage) continue;
                        if ($fileType === 'document' && !$isDocument) continue;
                    }
                    
                    $files[] = [
                        'filename' => $filename,
                        'size' => filesize($filePath),
                        'mime_type' => $this->getMimeType($extension),
                        'created_at' => date('Y-m-d H:i:s', filectime($filePath)),
                        'url' => '/uploads/' . $filename,
                        'type' => in_array($extension, ALLOWED_IMAGE_TYPES) ? 'image' : 'document'
                    ];
                }
            }
            
            // Sort by creation time (newest first)
            usort($files, function($a, $b) {
                return strtotime($b['created_at']) - strtotime($a['created_at']);
            });
            
            // Pagination
            $total = count($files);
            $totalPages = ceil($total / $perPage);
            $offset = ($page - 1) * $perPage;
            $paginatedFiles = array_slice($files, $offset, $perPage);
            
            $this->success([
                'files' => $paginatedFiles,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $perPage,
                    'total' => $total,
                    'total_pages' => $totalPages,
                    'has_next' => $page < $totalPages,
                    'has_prev' => $page > 1
                ]
            ], 'Files retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to list files: ' . $e->getMessage(), 500);
        }
    }
    
    // Get MIME type based on file extension
    private function getMimeType($extension) {
        $mimeTypes = [
            // Images
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            
            // Documents
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt' => 'text/plain',
            
            // Archives
            'zip' => 'application/zip',
            'rar' => 'application/x-rar-compressed',
            
            // Audio/Video (if needed)
            'mp4' => 'video/mp4',
            'mp3' => 'audio/mpeg',
            
            // Default
            'default' => 'application/octet-stream'
        ];
        
        return $mimeTypes[strtolower($extension)] ?? $mimeTypes['default'];
    }
    
    // Clean old files (admin utility)
    public function cleanup($params = []) {
        $this->requireSuperAdmin();
        
        try {
            $daysOld = max(1, (int)($this->input('days_old', 30)));
            $dryRun = $this->input('dry_run', true); // Don't actually delete by default
            
            $uploadsDir = STORAGE_PATH . '/uploads/';
            $cutoffTime = time() - ($daysOld * 24 * 3600);
            $deletedFiles = [];
            $totalSize = 0;
            
            if (!is_dir($uploadsDir)) {
                $this->success([
                    'deleted_files' => [],
                    'total_deleted' => 0,
                    'space_freed' => 0,
                    'dry_run' => $dryRun
                ], 'No uploads directory found');
            }
            
            $allFiles = array_diff(scandir($uploadsDir), ['.', '..']);
            
            foreach ($allFiles as $filename) {
                $filePath = $uploadsDir . $filename;
                
                if (is_file($filePath) && filemtime($filePath) < $cutoffTime) {
                    $fileSize = filesize($filePath);
                    $totalSize += $fileSize;
                    
                    $deletedFiles[] = [
                        'filename' => $filename,
                        'size' => $fileSize,
                        'last_modified' => date('Y-m-d H:i:s', filemtime($filePath))
                    ];
                    
                    // Actually delete the file if not a dry run
                    if (!$dryRun) {
                        unlink($filePath);
                    }
                }
            }
            
            if (!$dryRun && count($deletedFiles) > 0) {
                $this->logAudit('files_cleanup', 'File', null, null, [
                    'deleted_count' => count($deletedFiles),
                    'space_freed' => $totalSize,
                    'days_old' => $daysOld
                ]);
            }
            
            $this->success([
                'deleted_files' => $deletedFiles,
                'total_deleted' => count($deletedFiles),
                'space_freed' => $totalSize,
                'space_freed_human' => $this->formatBytes($totalSize),
                'dry_run' => $dryRun,
                'cutoff_date' => date('Y-m-d H:i:s', $cutoffTime)
            ], $dryRun ? 'File cleanup simulation completed' : 'File cleanup completed');
            
        } catch (Exception $e) {
            $this->error('Failed to cleanup files: ' . $e->getMessage(), 500);
        }
    }
    
    // Format bytes to human readable format
    private function formatBytes($bytes, $precision = 2) {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, $precision) . ' ' . $units[$i];
    }
}
?>