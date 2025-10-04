<?php
require_once 'Logger.php';

class QRCodeHelper {
    private $logger;
    private $qrCodeApiUrl = 'https://api.qrserver.com/v1/create-qr-code/';
    
    public function __construct() {
        $this->logger = new Logger();
    }
    
    // Generate QR code for event attendance
    public function generateEventQR($eventId, $organizationId, $expiresAt = null) {
        try {
            // Generate unique token for this QR code
            $qrToken = $this->generateToken();
            
            // Create QR data payload
            $qrData = [
                'type' => 'event_attendance',
                'event_id' => $eventId,
                'org_id' => $organizationId,
                'token' => $qrToken,
                'expires_at' => $expiresAt ?: date('Y-m-d H:i:s', strtotime('+24 hours')),
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            // Create the scan URL that will be embedded in QR code
            $baseUrl = $_SERVER['HTTP_HOST'] ?? 'localhost:8888';
            $scanUrl = "http://{$baseUrl}/acetrack/backend/public/scan/{$qrToken}";
            
            // Generate QR code image
            $qrCodeImage = $this->generateQRImage($scanUrl);
            
            // Store QR code data in database or cache
            $this->storeQRData($qrToken, $qrData);
            
            return [
                'success' => true,
                'qr_token' => $qrToken,
                'qr_url' => $scanUrl,
                'qr_data' => json_encode($qrData),
                'qr_code_image' => $qrCodeImage,
                'expires_at' => $qrData['expires_at']
            ];
            
        } catch (Exception $e) {
            $this->logger->error('QR Code Generation Failed', [
                'event_id' => $eventId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    // Generate QR code for organization member registration
    public function generateMembershipQR($organizationId, $expiresAt = null) {
        try {
            $qrToken = $this->generateToken();
            
            $qrData = [
                'type' => 'membership_registration',
                'org_id' => $organizationId,
                'token' => $qrToken,
                'expires_at' => $expiresAt ?: date('Y-m-d H:i:s', strtotime('+7 days')),
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            $baseUrl = $_SERVER['HTTP_HOST'] ?? 'localhost:8888';
            $scanUrl = "http://{$baseUrl}/acetrack/backend/public/scan/{$qrToken}";
            
            $qrCodeImage = $this->generateQRImage($scanUrl);
            $this->storeQRData($qrToken, $qrData);
            
            return [
                'success' => true,
                'qr_token' => $qrToken,
                'qr_url' => $scanUrl,
                'qr_data' => json_encode($qrData),
                'qr_code_image' => $qrCodeImage,
                'expires_at' => $qrData['expires_at']
            ];
            
        } catch (Exception $e) {
            $this->logger->error('Membership QR Generation Failed', [
                'org_id' => $organizationId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    // Generate QR code image using external API
    private function generateQRImage($data, $size = 200) {
        try {
            $params = [
                'size' => $size . 'x' . $size,
                'data' => urlencode($data),
                'format' => 'png',
                'ecc' => 'L', // Error correction level
                'margin' => 10
            ];
            
            $url = $this->qrCodeApiUrl . '?' . http_build_query($params);
            
            // Get QR code image
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'user_agent' => 'AceTrack-Backend/1.0'
                ]
            ]);
            
            $imageData = file_get_contents($url, false, $context);
            
            if ($imageData === false) {
                throw new Exception('Failed to generate QR code image');
            }
            
            // Convert to base64 for easy embedding
            return 'data:image/png;base64,' . base64_encode($imageData);
            
        } catch (Exception $e) {
            // Fallback: return a simple text-based QR placeholder
            $this->logger->warning('QR Image Generation Failed, using fallback', [
                'error' => $e->getMessage()
            ]);
            
            return $this->generateFallbackQR($data);
        }
    }
    
    // Fallback QR code generation using simple ASCII art
    private function generateFallbackQR($data) {
        // Create a simple data URL with the scan URL as text
        $fallbackText = "QR CODE\n\nScan URL:\n" . $data . "\n\nOr enter token manually in the app.";
        return 'data:text/plain;base64,' . base64_encode($fallbackText);
    }
    
    // Store QR code data for later retrieval during scanning
    private function storeQRData($token, $data) {
        try {
            // Store in a simple file-based cache
            // In production, this could use Redis or database
            $cacheDir = STORAGE_PATH . '/qr_cache';
            if (!is_dir($cacheDir)) {
                mkdir($cacheDir, 0755, true);
            }
            
            $cacheFile = $cacheDir . '/' . $token . '.json';
            file_put_contents($cacheFile, json_encode($data, JSON_PRETTY_PRINT));
            
            // Also store in logs for debugging
            $this->logger->info('QR Code Generated', [
                'token' => $token,
                'type' => $data['type'],
                'expires_at' => $data['expires_at']
            ]);
            
        } catch (Exception $e) {
            $this->logger->error('QR Data Storage Failed', [
                'token' => $token,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }
    
    // Retrieve QR code data during scanning
    public function getQRData($token) {
        try {
            $cacheFile = STORAGE_PATH . '/qr_cache/' . $token . '.json';
            
            if (!file_exists($cacheFile)) {
                return null;
            }
            
            $data = json_decode(file_get_contents($cacheFile), true);
            
            // Check if QR code is expired
            if (strtotime($data['expires_at']) < time()) {
                // Delete expired QR code
                unlink($cacheFile);
                return null;
            }
            
            return $data;
            
        } catch (Exception $e) {
            $this->logger->error('QR Data Retrieval Failed', [
                'token' => $token,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    // Validate and process QR code scan
    public function processQRScan($token, $userId = null) {
        try {
            $qrData = $this->getQRData($token);
            
            if (!$qrData) {
                return [
                    'success' => false,
                    'error' => 'Invalid or expired QR code'
                ];
            }
            
            // Log the scan attempt
            $this->logger->info('QR Code Scanned', [
                'token' => $token,
                'user_id' => $userId,
                'type' => $qrData['type']
            ]);
            
            switch ($qrData['type']) {
                case 'event_attendance':
                    return $this->processEventAttendanceScan($qrData, $userId);
                case 'membership_registration':
                    return $this->processMembershipScan($qrData, $userId);
                default:
                    return [
                        'success' => false,
                        'error' => 'Unknown QR code type'
                    ];
            }
            
        } catch (Exception $e) {
            $this->logger->error('QR Scan Processing Failed', [
                'token' => $token,
                'error' => $e->getMessage()
            ]);
            
            return [
                'success' => false,
                'error' => 'Failed to process QR scan'
            ];
        }
    }
    
    // Process event attendance QR scan
    private function processEventAttendanceScan($qrData, $userId) {
        return [
            'success' => true,
            'type' => 'event_attendance',
            'event_id' => $qrData['event_id'],
            'org_id' => $qrData['org_id'],
            'action_required' => 'check_in', // or 'check_out'
            'message' => 'Ready for attendance check-in',
            'next_step' => 'Process attendance through AttendanceController'
        ];
    }
    
    // Process membership registration QR scan
    private function processMembershipScan($qrData, $userId) {
        return [
            'success' => true,
            'type' => 'membership_registration',
            'org_id' => $qrData['org_id'],
            'action_required' => 'join_organization',
            'message' => 'Ready for organization membership',
            'next_step' => 'Process registration through OrganizationMemberController'
        ];
    }
    
    // Generate secure token
    private function generateToken() {
        return bin2hex(random_bytes(16)) . '_' . time();
    }
    
    // Clean up expired QR codes (utility method)
    public function cleanupExpiredQRCodes() {
        try {
            $cacheDir = STORAGE_PATH . '/qr_cache';
            if (!is_dir($cacheDir)) {
                return ['cleaned' => 0];
            }
            
            $files = scandir($cacheDir);
            $cleaned = 0;
            
            foreach ($files as $file) {
                if (pathinfo($file, PATHINFO_EXTENSION) === 'json') {
                    $filePath = $cacheDir . '/' . $file;
                    $data = json_decode(file_get_contents($filePath), true);
                    
                    if ($data && strtotime($data['expires_at']) < time()) {
                        unlink($filePath);
                        $cleaned++;
                    }
                }
            }
            
            $this->logger->info('QR Cache Cleanup', ['cleaned_count' => $cleaned]);
            
            return ['cleaned' => $cleaned];
            
        } catch (Exception $e) {
            $this->logger->error('QR Cleanup Failed', ['error' => $e->getMessage()]);
            return ['cleaned' => 0, 'error' => $e->getMessage()];
        }
    }
    
    // Get QR code statistics
    public function getQRStats() {
        try {
            $cacheDir = STORAGE_PATH . '/qr_cache';
            if (!is_dir($cacheDir)) {
                return [
                    'total' => 0,
                    'active' => 0,
                    'expired' => 0,
                    'by_type' => []
                ];
            }
            
            $files = scandir($cacheDir);
            $stats = [
                'total' => 0,
                'active' => 0,
                'expired' => 0,
                'by_type' => []
            ];
            
            foreach ($files as $file) {
                if (pathinfo($file, PATHINFO_EXTENSION) === 'json') {
                    $data = json_decode(file_get_contents($cacheDir . '/' . $file), true);
                    if ($data) {
                        $stats['total']++;
                        
                        $type = $data['type'] ?? 'unknown';
                        if (!isset($stats['by_type'][$type])) {
                            $stats['by_type'][$type] = 0;
                        }
                        $stats['by_type'][$type]++;
                        
                        if (strtotime($data['expires_at']) >= time()) {
                            $stats['active']++;
                        } else {
                            $stats['expired']++;
                        }
                    }
                }
            }
            
            return $stats;
            
        } catch (Exception $e) {
            $this->logger->error('QR Stats Failed', ['error' => $e->getMessage()]);
            return ['error' => $e->getMessage()];
        }
    }
}
?>