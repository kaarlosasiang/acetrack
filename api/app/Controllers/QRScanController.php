<?php
require_once 'BaseController.php';
require_once APP_PATH . '/Helpers/QRCodeHelper.php';

class QRScanController extends BaseController {
    private $qrHelper;
    
    public function __construct() {
        parent::__construct();
        $this->qrHelper = new QRCodeHelper();
    }
    
    // Public endpoint for scanning QR codes
    public function scan($params = []) {
        try {
            $token = $params['token'] ?? null;
            
            if (!$token) {
                $this->error('QR token is required', 400);
            }
            
            // Get user ID if authenticated (optional for scan)
            $userId = null;
            if ($this->isAuthenticated()) {
                $userId = $this->getCurrentUserId();
            }
            
            // Process the QR scan
            $scanResult = $this->qrHelper->processQRScan($token, $userId);
            
            if (!$scanResult['success']) {
                $this->error($scanResult['error'], 400);
            }
            
            // Return appropriate response based on QR type
            switch ($scanResult['type']) {
                case 'event_attendance':
                    $this->handleEventAttendanceQR($scanResult);
                    break;
                case 'membership_registration':
                    $this->handleMembershipQR($scanResult);
                    break;
                default:
                    $this->error('Unknown QR code type', 400);
            }
            
        } catch (Exception $e) {
            $this->error('Failed to process QR scan: ' . $e->getMessage(), 500);
        }
    }
    
    // Handle event attendance QR code scan
    private function handleEventAttendanceQR($scanResult) {
        try {
            // Get event information
            require_once APP_PATH . '/Models/Event.php';
            $eventModel = new Event();
            $eventModel->setTenant($scanResult['org_id']);
            $event = $eventModel->find($scanResult['event_id']);
            
            if (!$event) {
                $this->error('Event not found', 404);
            }
            
            // Check if event is currently active
            $now = date('Y-m-d H:i:s');
            $eventStart = $event['start_datetime'];
            $eventEnd = $event['end_datetime'];
            
            // Allow check-in 30 minutes before event and check-out 1 hour after
            $checkInWindow = date('Y-m-d H:i:s', strtotime($eventStart) - 1800); // 30 min before
            $checkOutWindow = date('Y-m-d H:i:s', strtotime($eventEnd) + 3600);   // 1 hour after
            
            if ($now < $checkInWindow) {
                $this->success([
                    'type' => 'event_attendance',
                    'status' => 'too_early',
                    'event' => $event,
                    'message' => 'Event check-in will be available 30 minutes before the event starts',
                    'available_at' => $checkInWindow
                ], 'QR code scanned successfully - too early for check-in');
            } elseif ($now > $checkOutWindow) {
                $this->success([
                    'type' => 'event_attendance',
                    'status' => 'expired',
                    'event' => $event,
                    'message' => 'Event attendance window has expired',
                    'expired_at' => $checkOutWindow
                ], 'QR code scanned successfully - attendance window expired');
            } else {
                // Determine if this should be check-in or check-out
                $action = ($now <= $eventEnd) ? 'check_in' : 'check_out';
                
                $this->success([
                    'type' => 'event_attendance',
                    'status' => 'ready',
                    'action' => $action,
                    'event' => [
                        'id' => $event['id'],
                        'name' => $event['name'],
                        'description' => $event['description'],
                        'start_datetime' => $event['start_datetime'],
                        'end_datetime' => $event['end_datetime'],
                        'location' => $event['location']
                    ],
                    'organization_id' => $scanResult['org_id'],
                    'next_steps' => [
                        'endpoint' => '/attendance/' . $action,
                        'method' => 'POST',
                        'required_data' => ['event_id' => $scanResult['event_id']],
                        'requires_auth' => true
                    ],
                    'message' => "Ready for {$action}. Please authenticate if not already logged in."
                ], 'QR code scanned successfully - ready for ' . $action);
            }
            
        } catch (Exception $e) {
            $this->error('Failed to process event attendance QR: ' . $e->getMessage(), 500);
        }
    }
    
    // Handle membership registration QR code scan
    private function handleMembershipQR($scanResult) {
        try {
            // Get organization information
            require_once APP_PATH . '/Models/Organization.php';
            $orgModel = new Organization();
            $organization = $orgModel->find($scanResult['org_id']);
            
            if (!$organization) {
                $this->error('Organization not found', 404);
            }
            
            $this->success([
                'type' => 'membership_registration',
                'status' => 'ready',
                'organization' => [
                    'id' => $organization['id'],
                    'name' => $organization['name'],
                    'description' => $organization['description'],
                    'logo_url' => $organization['logo_url'],
                    'member_count' => $organization['member_count'] ?? 0
                ],
                'next_steps' => [
                    'endpoint' => '/organization-member/join',
                    'method' => 'POST', 
                    'required_data' => ['organization_id' => $scanResult['org_id']],
                    'requires_auth' => true
                ],
                'message' => 'Ready to join organization. Please authenticate if not already logged in.'
            ], 'QR code scanned successfully - ready for membership registration');
            
        } catch (Exception $e) {
            $this->error('Failed to process membership QR: ' . $e->getMessage(), 500);
        }
    }
    
    // Get QR code info (authenticated endpoint)
    public function info($params = []) {
        $this->requireAuth();
        
        try {
            $token = $params['token'] ?? null;
            
            if (!$token) {
                $this->error('QR token is required', 400);
            }
            
            $qrData = $this->qrHelper->getQRData($token);
            
            if (!$qrData) {
                $this->error('Invalid or expired QR code', 404);
            }
            
            // Remove sensitive data before returning
            unset($qrData['token']);
            
            $this->success($qrData, 'QR code information retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get QR code info: ' . $e->getMessage(), 500);
        }
    }
    
    // Admin endpoint to get QR statistics
    public function stats($params = []) {
        $this->requireRole(['admin', 'super_admin']);
        
        try {
            $stats = $this->qrHelper->getQRStats();
            
            $this->success($stats, 'QR code statistics retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get QR stats: ' . $e->getMessage(), 500);
        }
    }
    
    // Admin endpoint to clean up expired QR codes
    public function cleanup($params = []) {
        $this->requireRole(['admin', 'super_admin']);
        
        try {
            $result = $this->qrHelper->cleanupExpiredQRCodes();
            
            $this->success($result, 'QR code cleanup completed');
            
        } catch (Exception $e) {
            $this->error('Failed to cleanup QR codes: ' . $e->getMessage(), 500);
        }
    }
    
    // Simple endpoint that returns HTML page for QR scanning (for testing)
    public function scanPage($params = []) {
        $token = $params['token'] ?? 'invalid';
        
        // Simple HTML response for QR scan testing
        $html = "<!DOCTYPE html>
<html>
<head>
    <title>AceTrack - QR Scan</title>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1'>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .qr-info { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .btn:hover { background: #0056b3; }
        .error { color: #dc3545; }
        .success { color: #28a745; }
    </style>
</head>
<body>
    <h1>AceTrack QR Scanner</h1>
    <div class='qr-info'>
        <h3>QR Token: {$token}</h3>
        <p>This is a test page for QR code scanning. In a real mobile app, this would process the QR code automatically.</p>
        <button class='btn' onclick='processQR()'>Process QR Code</button>
        <div id='result'></div>
    </div>
    
    <script>
    function processQR() {
        fetch('/acetrack/backend/public/api/qr/scan/{$token}', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            const result = document.getElementById('result');
            if (data.success) {
                result.innerHTML = '<div class=\"success\"><h4>Success!</h4><pre>' + JSON.stringify(data, null, 2) + '</pre></div>';
            } else {
                result.innerHTML = '<div class=\"error\"><h4>Error:</h4>' + data.message + '</div>';
            }
        })
        .catch(error => {
            document.getElementById('result').innerHTML = '<div class=\"error\"><h4>Network Error:</h4>' + error.message + '</div>';
        });
    }
    </script>
</body>
</html>";
        
        header('Content-Type: text/html');
        echo $html;
        exit;
    }
}
?>