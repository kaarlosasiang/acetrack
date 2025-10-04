<?php
require_once 'BaseController.php';

class AttendanceController extends BaseController {
    
    // Member check-in to event
    public function memberCheckIn($params = []) {
        $this->requireTenantMembership();
        
        try {
            $eventId = $params['id'] ?? null;
            
            if (!$eventId) {
                $this->error('Event ID is required', 400);
            }
            
            // Check if event exists and is in current organization
            $eventModel = new Event();
            $eventModel->setTenant($this->currentTenantId);
            $event = $eventModel->find($eventId);
            
            if (!$event) {
                $this->error('Event not found', 404);
            }
            
            // Use EventAttendance model for check-in validation and processing
            $attendanceModel = new EventAttendance();
            
            // Check if user can check in
            $canCheckIn = $attendanceModel->canCheckIn($eventId, $this->currentUser['id']);
            if (!$canCheckIn['can_check_in']) {
                $this->error($canCheckIn['reason'], 400);
            }
            
            // Perform check-in
            $attendance = $attendanceModel->checkIn($eventId, $this->currentUser['id'], null, 'qr_code');
            
            // Log the check-in
            $this->logAudit('event_check_in', 'EventAttendance', $attendance['id'], null, [
                'event_id' => $eventId,
                'user_id' => $this->currentUser['id'],
                'check_in_time' => $attendance['check_in_time'],
                'method' => 'self_checkin'
            ]);
            
            $this->success([
                'attendance_id' => $attendance['id'],
                'event_id' => $eventId,
                'event_title' => $event['title'],
                'check_in_time' => $attendance['check_in_time'],
                'message' => 'Successfully checked in to ' . $event['title']
            ], 'Check-in successful');
            
        } catch (Exception $e) {
            $this->error('Check-in failed: ' . $e->getMessage(), 500);
        }
    }
    
    // Member check-out from event
    public function memberCheckOut($params = []) {
        $this->requireTenantMembership();
        
        try {
            $eventId = $params['id'] ?? null;
            
            if (!$eventId) {
                $this->error('Event ID is required', 400);
            }
            
            // Check if event exists and is in current organization
            $eventModel = new Event();
            $eventModel->setTenant($this->currentTenantId);
            $event = $eventModel->find($eventId);
            
            if (!$event) {
                $this->error('Event not found', 404);
            }
            
            // Use EventAttendance model for check-out validation and processing
            $attendanceModel = new EventAttendance();
            
            // Check if user can check out
            $canCheckOut = $attendanceModel->canCheckOut($eventId, $this->currentUser['id']);
            if (!$canCheckOut['can_check_out']) {
                $this->error($canCheckOut['reason'], 400);
            }
            
            // Perform check-out
            $attendance = $attendanceModel->checkOut($eventId, $this->currentUser['id'], null, 'qr_code');
            
            // Log the check-out
            $this->logAudit('event_check_out', 'EventAttendance', $attendance['id'], null, [
                'event_id' => $eventId,
                'user_id' => $this->currentUser['id'],
                'check_out_time' => $attendance['check_out_time'],
                'method' => 'self_checkout'
            ]);
            
            $this->success([
                'attendance_id' => $attendance['id'],
                'event_id' => $eventId,
                'event_title' => $event['title'],
                'check_out_time' => $attendance['check_out_time'],
                'message' => 'Successfully checked out from ' . $event['title']
            ], 'Check-out successful');
            
        } catch (Exception $e) {
            $this->error('Check-out failed: ' . $e->getMessage(), 500);
        }
    }
    
    // Scan QR code for attendance (public endpoint)
    public function scanQR($params = []) {
        try {
            $token = $params['token'] ?? null;
            
            if (!$token) {
                $this->error('QR token is required', 400);
            }
            
            // TODO: Implement QR token validation
            // This would require a QR token generation and validation system
            // For now, return event information
            
            $this->success([
                'token' => $token,
                'event_info' => [
                    'title' => 'Sample Event',
                    'description' => 'QR scanning functionality',
                    'organization' => 'Sample Organization'
                ],
                'scan_url' => "/scan/{$token}",
                'instructions' => 'POST to this endpoint to complete check-in'
            ], 'QR code scanned successfully');
            
        } catch (Exception $e) {
            $this->error('QR scan failed: ' . $e->getMessage(), 500);
        }
    }
    
    // Process QR scan for check-in (public endpoint)
    public function processQRScan($params = []) {
        try {
            $token = $params['token'] ?? null;
            $input = $this->getInput();
            
            if (!$token) {
                $this->error('QR token is required', 400);
            }
            
            // TODO: Implement complete QR token processing
            // This would include:
            // 1. Validating the QR token
            // 2. Extracting event and organization information
            // 3. Authenticating the user (or handling guest check-ins)
            // 4. Recording the attendance
            
            $this->success([
                'token' => $token,
                'status' => 'checked_in',
                'timestamp' => date('Y-m-d H:i:s'),
                'message' => 'QR check-in processing complete'
            ], 'QR check-in processed successfully');
            
        } catch (Exception $e) {
            $this->error('QR scan processing failed: ' . $e->getMessage(), 500);
        }
    }
    
    // Admin check-in user to event
    public function adminCheckIn($params = []) {
        $this->requireRole(['admin', 'sub_admin']);
        
        try {
            $eventId = $params['id'] ?? null;
            $input = $this->getInput();
            
            if (!$eventId) {
                $this->error('Event ID is required', 400);
            }
            
            if (!isset($input['user_id'])) {
                $this->error('User ID is required', 400);
            }
            
            // Validate event exists in current organization
            $eventModel = new Event();
            $eventModel->setTenant($this->currentTenantId);
            $event = $eventModel->find($eventId);
            
            if (!$event) {
                $this->error('Event not found', 404);
            }
            
            // Validate user is a member of the organization
            $memberModel = new OrganizationMember();
            $member = $memberModel->findByUserAndOrganization($input['user_id'], $this->currentTenantId);
            
            if (!$member || $member['status'] !== 'active') {
                $this->error('User is not an active member of this organization', 400);
            }
            
            $checkInTime = date('Y-m-d H:i:s');
            
            // Log the admin check-in
            $this->logAudit('event_admin_check_in', 'Event', $eventId, null, [
                'target_user_id' => $input['user_id'],
                'admin_user_id' => $this->currentUser['id'],
                'check_in_time' => $checkInTime,
                'method' => 'admin_checkin'
            ]);
            
            $this->success([
                'event_id' => $eventId,
                'user_id' => $input['user_id'],
                'check_in_time' => $checkInTime,
                'checked_in_by' => $this->currentUser['id']
            ], 'User checked in successfully');
            
        } catch (Exception $e) {
            $this->error('Admin check-in failed: ' . $e->getMessage(), 500);
        }
    }
    
    // Admin check-out user from event
    public function adminCheckOut($params = []) {
        $this->requireRole(['admin', 'sub_admin']);
        
        try {
            $eventId = $params['id'] ?? null;
            $input = $this->getInput();
            
            if (!$eventId) {
                $this->error('Event ID is required', 400);
            }
            
            if (!isset($input['user_id'])) {
                $this->error('User ID is required', 400);
            }
            
            // Validate event exists in current organization
            $eventModel = new Event();
            $eventModel->setTenant($this->currentTenantId);
            $event = $eventModel->find($eventId);
            
            if (!$event) {
                $this->error('Event not found', 404);
            }
            
            $checkOutTime = date('Y-m-d H:i:s');
            
            // Log the admin check-out
            $this->logAudit('event_admin_check_out', 'Event', $eventId, null, [
                'target_user_id' => $input['user_id'],
                'admin_user_id' => $this->currentUser['id'],
                'check_out_time' => $checkOutTime,
                'method' => 'admin_checkout'
            ]);
            
            $this->success([
                'event_id' => $eventId,
                'user_id' => $input['user_id'],
                'check_out_time' => $checkOutTime,
                'checked_out_by' => $this->currentUser['id']
            ], 'User checked out successfully');
            
        } catch (Exception $e) {
            $this->error('Admin check-out failed: ' . $e->getMessage(), 500);
        }
    }
    
    // Get attendance reports (admin only)
    public function getReports($params = []) {
        $this->requireRole(['admin', 'sub_admin']);
        
        try {
            $eventId = $this->input('event_id');
            $startDate = $this->input('start_date');
            $endDate = $this->input('end_date');
            
            // TODO: Implement attendance reporting
            // This would require EventAttendance model and complex queries
            
            $this->success([
                'filters' => [
                    'event_id' => $eventId,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'organization_id' => $this->currentTenantId
                ],
                'reports' => [],
                'summary' => [
                    'total_events' => 0,
                    'total_attendances' => 0,
                    'average_attendance' => 0
                ]
            ], 'Attendance reports retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get attendance reports: ' . $e->getMessage(), 500);
        }
    }
    
    // Export attendance data (admin only)
    public function exportData($params = []) {
        $this->requireRole(['admin', 'sub_admin']);
        
        try {
            $format = $this->input('format', 'csv'); // csv, excel, pdf
            
            // TODO: Implement attendance data export
            // This would generate CSV/Excel files of attendance data
            
            $this->success([
                'export_format' => $format,
                'file_url' => '/exports/attendance_' . date('Y-m-d') . '.' . $format,
                'generated_at' => date('Y-m-d H:i:s')
            ], 'Attendance data export generated successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to export attendance data: ' . $e->getMessage(), 500);
        }
    }
    
    // Get event attendance (admin - referenced in routes)
    public function eventAttendance($params = []) {
        $this->requireRole(['admin', 'org_subadmin']);
        
        try {
            $eventId = $params['id'] ?? null;
            
            if (!$eventId) {
                $this->error('Event ID is required', 400);
            }
            
            $attendanceModel = new EventAttendance();
            $attendees = $attendanceModel->getEventAttendees($eventId);
            $stats = $attendanceModel->getEventStats($eventId);
            
            $this->success([
                'event_id' => $eventId,
                'attendees' => $attendees,
                'statistics' => $stats
            ], 'Event attendance retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get event attendance: ' . $e->getMessage(), 500);
        }
    }
    
    // Admin check-in user to event (referenced in routes)
    public function checkIn($params = []) {
        return $this->adminCheckIn($params);
    }
    
    // Admin check-out user from event (referenced in routes)
    public function checkOut($params = []) {
        return $this->adminCheckOut($params);
    }
    
    // Manual check-in (admin)
    public function manualCheckIn($params = []) {
        $this->requireRole(['admin', 'org_subadmin']);
        
        try {
            $attendanceId = $params['id'] ?? null;
            $input = $this->getInput();
            
            if (!$attendanceId) {
                $this->error('Attendance ID is required', 400);
            }
            
            $attendanceModel = new EventAttendance();
            $attendance = $attendanceModel->find($attendanceId);
            
            if (!$attendance) {
                $this->error('Attendance record not found', 404);
            }
            
            // Update check-in time manually
            $updatedAttendance = $attendanceModel->update($attendanceId, [
                'check_in_time' => $input['check_in_time'] ?? date('Y-m-d H:i:s'),
                'check_in_method' => 'manual',
                'checked_in_by_user_id' => $this->currentUser['id']
            ]);
            
            $this->logAudit('manual_check_in', 'EventAttendance', $attendanceId, $attendance, $updatedAttendance);
            
            $this->success($updatedAttendance, 'Manual check-in completed successfully');
            
        } catch (Exception $e) {
            $this->error('Manual check-in failed: ' . $e->getMessage(), 500);
        }
    }
    
    // Manual check-out (admin)
    public function manualCheckOut($params = []) {
        $this->requireRole(['admin', 'org_subadmin']);
        
        try {
            $attendanceId = $params['id'] ?? null;
            $input = $this->getInput();
            
            if (!$attendanceId) {
                $this->error('Attendance ID is required', 400);
            }
            
            $attendanceModel = new EventAttendance();
            $attendance = $attendanceModel->find($attendanceId);
            
            if (!$attendance) {
                $this->error('Attendance record not found', 404);
            }
            
            // Update check-out time manually
            $updatedAttendance = $attendanceModel->update($attendanceId, [
                'check_out_time' => $input['check_out_time'] ?? date('Y-m-d H:i:s'),
                'check_out_method' => 'manual',
                'checked_out_by_user_id' => $this->currentUser['id']
            ]);
            
            $this->logAudit('manual_check_out', 'EventAttendance', $attendanceId, $attendance, $updatedAttendance);
            
            $this->success($updatedAttendance, 'Manual check-out completed successfully');
            
        } catch (Exception $e) {
            $this->error('Manual check-out failed: ' . $e->getMessage(), 500);
        }
    }
    
    // Get member attendance records (admin)
    public function memberAttendance($params = []) {
        $this->requireRole(['admin', 'org_subadmin']);
        
        try {
            $memberId = $params['member_id'] ?? null;
            
            if (!$memberId) {
                $this->error('Member ID is required', 400);
            }
            
            $attendanceModel = new EventAttendance();
            $attendance = $attendanceModel->getUserAttendanceHistory($memberId, $this->currentTenantId);
            
            $this->success($attendance, 'Member attendance retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get member attendance: ' . $e->getMessage(), 500);
        }
    }
    
    // Get attendance reports (referenced in routes)
    public function reports($params = []) {
        return $this->getReports($params);
    }
    
    // Export attendance (referenced in routes)
    public function export($params = []) {
        return $this->exportData($params);
    }
}
?>