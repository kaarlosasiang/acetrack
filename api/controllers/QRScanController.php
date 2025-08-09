<?php
class QRScanController extends Controller {
    private $attendanceModel;
    private $eventModel;
    private $userModel;
    private $scanLogModel;
    
    public function __construct() {
        parent::__construct();
        $this->attendanceModel = new Attendance();
        $this->eventModel = new Event();
        $this->userModel = new User();
        $this->scanLogModel = new ScanLog();
    }
    
    /**
     * Scan QR code for attendance (check-in or check-out)
     */
    public function scanQR($params = []) {
        $input = $this->getInput();
        $this->validateRequired($input, ['qr_code_data', 'event_id', 'action']);
        
        $organizationId = $this->getCurrentUser()['organization_id'];
        $scannedBy = $this->getCurrentUser()['id'];
        
        try {
            // Rate limiting check
            if (!$this->scanLogModel->checkRateLimit($scannedBy)) {
                $this->logScanAttempt($organizationId, $scannedBy, $input['qr_code_data'], 'rate_limited', $input['action']);
                $this->errorResponse('Rate limit exceeded. Please try again later.', 429);
            }
            
            // Validate event
            $event = $this->eventModel->find($input['event_id'], $organizationId);
            if (!$event) {
                $this->logScanAttempt($organizationId, $scannedBy, $input['qr_code_data'], 'event_not_active', $input['action']);
                $this->errorResponse('Event not found', 404);
            }
            
            // Check if event is active for attendance
            if (!$this->isEventActiveForAttendance($event, $input['action'])) {
                $this->logScanAttempt($organizationId, $scannedBy, $input['qr_code_data'], 'event_not_active', $input['action'], ['event_id' => $input['event_id']]);
                $this->errorResponse('Event is not currently active for ' . $input['action'], 400);
            }
            
            // Process QR code
            $student = $this->processQRCode($input['qr_code_data']);
            if (!$student) {
                $this->logScanAttempt($organizationId, $scannedBy, $input['qr_code_data'], 'student_not_found', $input['action'], ['event_id' => $input['event_id']]);
                $this->errorResponse('Invalid QR code or student not found', 400);
            }
            
            // Check if student belongs to same organization
            if ($student['organization_id'] != $organizationId) {
                $this->logScanAttempt($organizationId, $scannedBy, $input['qr_code_data'], 'permission_denied', $input['action'], ['student_id' => $student['id'], 'event_id' => $input['event_id']]);
                $this->errorResponse('Student does not belong to this organization', 403);
            }
            
            // Check if student is approved
            if ($student['status'] !== 'active') {
                $this->logScanAttempt($organizationId, $scannedBy, $input['qr_code_data'], 'student_not_approved', $input['action'], ['student_id' => $student['id'], 'event_id' => $input['event_id']]);
                $this->errorResponse('Student registration is not approved', 403);
            }
            
            $metadata = [
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'device_info' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                'notes' => $input['notes'] ?? null
            ];
            
            // Process attendance based on action
            if ($input['action'] === 'check_in') {
                $result = $this->processCheckIn($student['id'], $input['event_id'], $organizationId, $scannedBy, $metadata);
            } else {
                $result = $this->processCheckOut($student['id'], $input['event_id'], $scannedBy, $metadata);
            }
            
            // Log successful scan
            $this->logScanAttempt($organizationId, $scannedBy, $input['qr_code_data'], 'success', $input['action'], ['student_id' => $student['id'], 'event_id' => $input['event_id']]);
            
            $this->successResponse([
                'student' => [
                    'id' => $student['id'],
                    'name' => $student['first_name'] . ' ' . $student['last_name'],
                    'student_id' => $student['student_id'],
                    'course' => $student['course'],
                    'year_level' => $student['year_level']
                ],
                'attendance' => $result,
                'action' => $input['action'],
                'timestamp' => date('Y-m-d H:i:s')
            ], ucfirst($input['action']) . ' successful');
            
        } catch (Exception $e) {
            $scanResult = $this->determineScanResult($e->getMessage());
            $this->logScanAttempt($organizationId, $scannedBy, $input['qr_code_data'], $scanResult, $input['action'], ['event_id' => $input['event_id']]);
            $this->errorResponse($e->getMessage(), 400);
        }
    }
    
    /**
     * Generate dynamic QR code for a student (JWT-based)
     */
    public function generateDynamicQR($params = []) {
        $user = $this->getCurrentUser();
        
        if ($user['user_type'] !== 'student') {
            $this->errorResponse('Only students can generate QR codes', 403);
        }
        
        try {
            $payload = [
                'student_id' => $user['id'],
                'organization_id' => $user['organization_id'],
                'type' => 'dynamic',
                'generated_at' => time(),
                'expires_at' => time() + 60 // 60 seconds expiry
            ];
            
            $qrToken = $this->auth->generateToken($payload, 60); // 1 minute expiry
            
            // Update user's last QR generation time
            $this->userModel->update($user['id'], [
                'qr_last_generated' => date('Y-m-d H:i:s')
            ], $user['organization_id']);
            
            $this->successResponse([
                'qr_token' => $qrToken,
                'expires_at' => date('Y-m-d H:i:s', $payload['expires_at']),
                'student_info' => [
                    'name' => $user['first_name'] . ' ' . $user['last_name'],
                    'student_id' => $user['student_id'],
                    'course' => $user['course'],
                    'year_level' => $user['year_level']
                ]
            ], 'Dynamic QR code generated');
            
        } catch (Exception $e) {
            $this->errorResponse('Failed to generate QR code: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get student's QR code (static)
     */
    public function getMyQR($params = []) {
        $user = $this->getCurrentUser();
        
        if ($user['user_type'] !== 'student') {
            $this->errorResponse('Only students have QR codes', 403);
        }
        
        $student = $this->userModel->find($user['id'], $user['organization_id']);
        
        $this->successResponse([
            'qr_code_static' => $student['qr_code_static'],
            'student_info' => [
                'name' => $student['first_name'] . ' ' . $student['last_name'],
                'student_id' => $student['student_id'],
                'course' => $student['course'],
                'year_level' => $student['year_level']
            ]
        ]);
    }
    
    private function processQRCode($qrData) {
        // Try static QR code first
        $student = $this->userModel->findByQrCode($qrData);
        if ($student) {
            return $student;
        }
        
        // Try dynamic QR code (JWT)
        try {
            $payload = $this->auth->validateToken($qrData);
            if ($payload && isset($payload['student_id']) && $payload['type'] === 'dynamic') {
                return $this->userModel->find($payload['student_id']);
            }
        } catch (Exception $e) {
            // Invalid or expired dynamic QR
        }
        
        return null;
    }
    
    private function isEventActiveForAttendance($event, $action) {
        if ($action === 'check_in') {
            return $this->eventModel->isCheckInOpen($event['id']);
        } else {
            return $this->eventModel->isCheckOutOpen($event['id']);
        }
    }
    
    private function processCheckIn($studentId, $eventId, $organizationId, $scannedBy, $metadata) {
        return $this->attendanceModel->checkIn($studentId, $eventId, $organizationId, $scannedBy, $metadata);
    }
    
    private function processCheckOut($studentId, $eventId, $scannedBy, $metadata) {
        return $this->attendanceModel->checkOut($studentId, $eventId, $scannedBy, $metadata);
    }
    
    private function logScanAttempt($organizationId, $scannedBy, $qrData, $scanResult, $scanAction, $metadata = []) {
        $this->scanLogModel->logScanAttempt($organizationId, $scannedBy, $qrData, $scanResult, $scanAction, $metadata);
    }
    
    private function determineScanResult($errorMessage) {
        if (strpos($errorMessage, 'already checked') !== false) {
            return strpos($errorMessage, 'checked in') !== false ? 'already_checked_in' : 'already_checked_out';
        } elseif (strpos($errorMessage, 'not found') !== false) {
            return 'student_not_found';
        } elseif (strpos($errorMessage, 'expired') !== false) {
            return 'expired_qr';
        } elseif (strpos($errorMessage, 'permission') !== false) {
            return 'permission_denied';
        } else {
            return 'invalid_qr';
        }
    }
}
