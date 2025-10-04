<?php
require_once 'BaseModel.php';

class EventAttendance extends BaseModel {
    protected $table = 'event_attendance';
    protected $tenantColumn = null; // Scoped through event relationship
    protected $fillable = [
        'event_id', 'member_user_id', 'member_profile_image_url',
        'check_in_time', 'check_out_time', 'check_in_method', 'check_out_method',
        'checked_in_by_user_id', 'checked_out_by_user_id', 'notes'
    ];
    
    // Find attendance by event and user
    public function findByEventAndUser($eventId, $userId) {
        return $this->db->queryOne(
            "SELECT * FROM {$this->table} WHERE event_id = ? AND member_user_id = ?",
            [$eventId, $userId]
        );
    }
    
    // Get all attendees for an event
    public function getEventAttendees($eventId) {
        $sql = "
            SELECT ea.*, u.first_name, u.last_name, u.email, u.profile_image_url,
                   om.student_id_number, om.role as member_role
            FROM {$this->table} ea
            INNER JOIN users u ON ea.member_user_id = u.id
            LEFT JOIN organization_members om ON ea.member_user_id = om.user_id 
                AND om.organization_id = (SELECT organization_id FROM events WHERE id = ?)
            WHERE ea.event_id = ?
            ORDER BY ea.check_in_time ASC
        ";
        
        return $this->db->query($sql, [$eventId, $eventId]);
    }
    
    // Check in a user to an event
    public function checkIn($eventId, $userId, $checkedInBy = null, $method = 'qr_code', $notes = null) {
        // Check if already checked in
        $existing = $this->findByEventAndUser($eventId, $userId);
        if ($existing) {
            throw new Exception('User is already checked in to this event');
        }
        
        // Get user profile image
        $userModel = new User();
        $user = $userModel->find($userId);
        $profileImageUrl = $user ? $user['profile_image_url'] : null;
        
        return $this->create([
            'event_id' => $eventId,
            'member_user_id' => $userId,
            'member_profile_image_url' => $profileImageUrl,
            'check_in_time' => date('Y-m-d H:i:s'),
            'check_in_method' => $method,
            'checked_in_by_user_id' => $checkedInBy,
            'notes' => $notes
        ]);
    }
    
    // Check out a user from an event
    public function checkOut($eventId, $userId, $checkedOutBy = null, $method = 'qr_code', $notes = null) {
        $attendance = $this->findByEventAndUser($eventId, $userId);
        
        if (!$attendance) {
            throw new Exception('User is not checked in to this event');
        }
        
        if ($attendance['check_out_time']) {
            throw new Exception('User is already checked out from this event');
        }
        
        return $this->update($attendance['id'], [
            'check_out_time' => date('Y-m-d H:i:s'),
            'check_out_method' => $method,
            'checked_out_by_user_id' => $checkedOutBy,
            'notes' => $notes
        ]);
    }
    
    // Get attendance statistics for an event
    public function getEventStats($eventId) {
        $sql = "
            SELECT 
                COUNT(*) as total_checked_in,
                COUNT(check_out_time) as total_checked_out,
                COUNT(CASE WHEN check_out_time IS NULL THEN 1 END) as currently_present
            FROM {$this->table}
            WHERE event_id = ?
        ";
        
        return $this->db->queryOne($sql, [$eventId]);
    }
    
    // Get user's attendance history
    public function getUserAttendanceHistory($userId, $organizationId = null, $limit = 50) {
        $sql = "
            SELECT ea.*, e.title as event_title, e.start_datetime, e.end_datetime,
                   o.name as organization_name
            FROM {$this->table} ea
            INNER JOIN events e ON ea.event_id = e.id
            INNER JOIN organizations o ON e.organization_id = o.id
            WHERE ea.member_user_id = ?
        ";
        
        $params = [$userId];
        
        if ($organizationId) {
            $sql .= " AND e.organization_id = ?";
            $params[] = $organizationId;
        }
        
        $sql .= " ORDER BY ea.check_in_time DESC LIMIT ?";
        $params[] = $limit;
        
        return $this->db->query($sql, $params);
    }
    
    // Get attendance report for organization
    public function getOrganizationAttendanceReport($organizationId, $startDate = null, $endDate = null) {
        $sql = "
            SELECT 
                u.id as user_id,
                u.first_name,
                u.last_name,
                u.email,
                om.student_id_number,
                COUNT(DISTINCT ea.event_id) as events_attended,
                COUNT(DISTINCT CASE WHEN ea.check_out_time IS NOT NULL THEN ea.event_id END) as events_completed,
                COUNT(DISTINCT e.id) as total_events_in_period
            FROM users u
            INNER JOIN organization_members om ON u.id = om.user_id
            LEFT JOIN event_attendance ea ON u.id = ea.member_user_id
            LEFT JOIN events e ON ea.event_id = e.id AND e.organization_id = ?
            WHERE om.organization_id = ? AND om.status = 'active'
        ";
        
        $params = [$organizationId, $organizationId];
        
        if ($startDate && $endDate) {
            $sql .= " AND (e.start_datetime IS NULL OR e.start_datetime BETWEEN ? AND ?)";
            $params[] = $startDate;
            $params[] = $endDate;
        }
        
        $sql .= " GROUP BY u.id, om.student_id_number ORDER BY u.last_name, u.first_name";
        
        return $this->db->query($sql, $params);
    }
    
    // Check if user can check in to event (within allowed time window)
    public function canCheckIn($eventId, $userId) {
        $eventModel = new Event();
        $event = $eventModel->find($eventId);
        
        if (!$event) {
            return ['can_check_in' => false, 'reason' => 'Event not found'];
        }
        
        if ($event['status'] !== 'published') {
            return ['can_check_in' => false, 'reason' => 'Event is not published'];
        }
        
        // Check if already checked in
        $attendance = $this->findByEventAndUser($eventId, $userId);
        if ($attendance) {
            return ['can_check_in' => false, 'reason' => 'Already checked in'];
        }
        
        $now = new DateTime();
        $eventStart = new DateTime($event['start_datetime']);
        $allowedStart = clone $eventStart;
        $allowedStart->modify("-{$event['checkin_early_minutes']} minutes");
        
        if ($now < $allowedStart) {
            return ['can_check_in' => false, 'reason' => 'Check-in not yet available'];
        }
        
        // Allow check-in during event and some time after
        $eventEnd = $event['end_datetime'] ? new DateTime($event['end_datetime']) : clone $eventStart;
        $allowedEnd = clone $eventEnd;
        $allowedEnd->modify('+30 minutes'); // Default 30 minutes after event end
        
        if ($now > $allowedEnd) {
            return ['can_check_in' => false, 'reason' => 'Check-in period has ended'];
        }
        
        return ['can_check_in' => true, 'reason' => null];
    }
    
    // Check if user can check out from event
    public function canCheckOut($eventId, $userId) {
        $attendance = $this->findByEventAndUser($eventId, $userId);
        
        if (!$attendance) {
            return ['can_check_out' => false, 'reason' => 'Not checked in'];
        }
        
        if ($attendance['check_out_time']) {
            return ['can_check_out' => false, 'reason' => 'Already checked out'];
        }
        
        $eventModel = new Event();
        $event = $eventModel->find($eventId);
        
        if (!$event) {
            return ['can_check_out' => false, 'reason' => 'Event not found'];
        }
        
        // Allow checkout during event and extended time after
        $now = new DateTime();
        $eventEnd = $event['end_datetime'] ? new DateTime($event['end_datetime']) : new DateTime($event['start_datetime']);
        $allowedEnd = clone $eventEnd;
        $allowedEnd->modify("+{$event['checkout_late_minutes']} minutes");
        
        if ($now > $allowedEnd) {
            return ['can_check_out' => false, 'reason' => 'Check-out period has ended'];
        }
        
        return ['can_check_out' => true, 'reason' => null];
    }
}
?>