<?php
require_once 'BaseModel.php';

class Event extends BaseModel {
    protected $table = 'events';
    protected $softDeletes = true;
    protected $fillable = [
        'organization_id', 'title', 'description', 'location', 'banner_url',
        'start_datetime', 'end_datetime', 'checkin_early_minutes', 'checkout_late_minutes',
        'max_capacity', 'status', 'is_mandatory', 'created_by_user_id'
    ];
    
    // Create event with tenant context
    public function createEvent($data, $tenantId, $createdBy) {
        $data['organization_id'] = $tenantId;
        $data['created_by_user_id'] = $createdBy;
        
        return $this->setTenant($tenantId)->create($data);
    }
    
    // Get event with attendance count
    public function getWithAttendanceCount($id, $tenantId = null) {
        $sql = "
            SELECT e.*, u.first_name as created_by_first_name, u.last_name as created_by_last_name,
                   COUNT(ea.id) as attendance_count
            FROM events e
            LEFT JOIN users u ON e.created_by_user_id = u.id
            LEFT JOIN event_attendance ea ON e.id = ea.event_id
            WHERE e.id = ? AND e.deleted_at IS NULL
        ";
        
        $params = [$id];
        
        if ($tenantId) {
            $sql .= " AND e.organization_id = ?";
            $params[] = $tenantId;
        }
        
        $sql .= " GROUP BY e.id";
        
        return $this->db->queryOne($sql, $params);
    }
    
    // Get upcoming events
    public function getUpcomingEvents($tenantId, $limit = 10) {
        $sql = "
            SELECT e.*, COUNT(ea.id) as attendance_count
            FROM events e
            LEFT JOIN event_attendance ea ON e.id = ea.event_id
            WHERE e.organization_id = ? 
                AND e.start_datetime > NOW() 
                AND e.status = 'published'
                AND e.deleted_at IS NULL
            GROUP BY e.id
            ORDER BY e.start_datetime ASC
            LIMIT {$limit}
        ";
        
        return $this->db->query($sql, [$tenantId]);
    }
    
    // Get past events
    public function getPastEvents($tenantId, $limit = 20) {
        $sql = "
            SELECT e.*, COUNT(ea.id) as attendance_count
            FROM events e
            LEFT JOIN event_attendance ea ON e.id = ea.event_id
            WHERE e.organization_id = ? 
                AND e.start_datetime < NOW()
                AND e.deleted_at IS NULL
            GROUP BY e.id
            ORDER BY e.start_datetime DESC
            LIMIT {$limit}
        ";
        
        return $this->db->query($sql, [$tenantId]);
    }
    
    // Publish event
    public function publish($id, $tenantId) {
        return $this->setTenant($tenantId)->update($id, ['status' => 'published']);
    }
    
    // Cancel event
    public function cancel($id, $tenantId) {
        return $this->setTenant($tenantId)->update($id, ['status' => 'cancelled']);
    }
    
    // Complete event
    public function complete($id, $tenantId) {
        return $this->setTenant($tenantId)->update($id, ['status' => 'completed']);
    }
    
    // Get event attendees
    public function getAttendees($id, $tenantId) {
        $sql = "
            SELECT u.id, u.first_name, u.last_name, u.email, u.profile_image_url,
                   om.student_id_number, om.role,
                   ea.check_in_time, ea.check_out_time, ea.check_in_method, ea.check_out_method,
                   ea.notes as attendance_notes
            FROM event_attendance ea
            INNER JOIN users u ON ea.member_user_id = u.id
            INNER JOIN organization_members om ON u.id = om.user_id AND om.organization_id = ?
            WHERE ea.event_id = ?
            ORDER BY ea.check_in_time DESC
        ";
        
        return $this->db->query($sql, [$tenantId, $id]);
    }
    
    // Check if user can check in to event
    public function canUserCheckIn($eventId, $userId, $tenantId) {
        $event = $this->setTenant($tenantId)->find($eventId);
        
        if (!$event || $event['status'] !== 'published') {
            return ['can_checkin' => false, 'reason' => 'Event not available'];
        }
        
        $now = new DateTime();
        $eventStart = new DateTime($event['start_datetime']);
        $earlyCheckIn = clone $eventStart;
        $earlyCheckIn->modify("-{$event['checkin_early_minutes']} minutes");
        
        if ($now < $earlyCheckIn) {
            return ['can_checkin' => false, 'reason' => 'Check-in not yet available'];
        }
        
        // Check if already checked in
        $existingAttendance = $this->getUserAttendance($eventId, $userId);
        if ($existingAttendance) {
            return ['can_checkin' => false, 'reason' => 'Already checked in'];
        }
        
        return ['can_checkin' => true, 'event' => $event];
    }
    
    // Check if user can check out of event
    public function canUserCheckOut($eventId, $userId, $tenantId) {
        $event = $this->setTenant($tenantId)->find($eventId);
        
        if (!$event) {
            return ['can_checkout' => false, 'reason' => 'Event not found'];
        }
        
        $attendance = $this->getUserAttendance($eventId, $userId);
        if (!$attendance) {
            return ['can_checkout' => false, 'reason' => 'Not checked in'];
        }
        
        if ($attendance['check_out_time']) {
            return ['can_checkout' => false, 'reason' => 'Already checked out'];
        }
        
        $now = new DateTime();
        $eventEnd = $event['end_datetime'] ? new DateTime($event['end_datetime']) : new DateTime($event['start_datetime']);
        $lateCheckOut = clone $eventEnd;
        $lateCheckOut->modify("+{$event['checkout_late_minutes']} minutes");
        
        if ($now > $lateCheckOut) {
            return ['can_checkout' => false, 'reason' => 'Check-out period has expired'];
        }
        
        return ['can_checkout' => true, 'event' => $event, 'attendance' => $attendance];
    }
    
    // Get user's attendance for specific event
    public function getUserAttendance($eventId, $userId) {
        $sql = "SELECT * FROM event_attendance WHERE event_id = ? AND member_user_id = ?";
        return $this->db->queryOne($sql, [$eventId, $userId]);
    }
    
    // Generate QR code token for event
    public function generateQRToken($eventId, $tenantId) {
        $event = $this->setTenant($tenantId)->find($eventId);
        
        if (!$event || $event['status'] !== 'published') {
            return false;
        }
        
        // Create a secure token that includes event ID and expiration
        $payload = [
            'event_id' => $eventId,
            'organization_id' => $tenantId,
            'type' => 'event_qr',
            'expires_at' => time() + 3600 // 1 hour expiration
        ];
        
        return base64_encode(json_encode($payload));
    }
    
    // Validate QR code token
    public function validateQRToken($token) {
        try {
            $payload = json_decode(base64_decode($token), true);
            
            if (!$payload || !isset($payload['event_id']) || $payload['type'] !== 'event_qr') {
                return false;
            }
            
            if (time() > $payload['expires_at']) {
                return false;
            }
            
            return [
                'event_id' => $payload['event_id'],
                'organization_id' => $payload['organization_id']
            ];
        } catch (Exception $e) {
            return false;
        }
    }
    
    // Search events
    public function searchEvents($tenantId, $query, $status = null, $limit = 50) {
        $searchTerm = "%{$query}%";
        
        $sql = "
            SELECT e.*, COUNT(ea.id) as attendance_count
            FROM events e
            LEFT JOIN event_attendance ea ON e.id = ea.event_id
            WHERE e.organization_id = ? 
                AND (e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)
                AND e.deleted_at IS NULL
        ";
        
        $params = [$tenantId, $searchTerm, $searchTerm, $searchTerm];
        
        if ($status) {
            $sql .= " AND e.status = ?";
            $params[] = $status;
        }
        
        $sql .= " GROUP BY e.id ORDER BY e.start_datetime DESC LIMIT {$limit}";
        
        return $this->db->query($sql, $params);
    }
    
    // Get events by date range
    public function getEventsByDateRange($tenantId, $startDate, $endDate, $status = null) {
        $sql = "
            SELECT e.*, COUNT(ea.id) as attendance_count
            FROM events e
            LEFT JOIN event_attendance ea ON e.id = ea.event_id
            WHERE e.organization_id = ? 
                AND e.start_datetime BETWEEN ? AND ?
                AND e.deleted_at IS NULL
        ";
        
        $params = [$tenantId, $startDate, $endDate];
        
        if ($status) {
            $sql .= " AND e.status = ?";
            $params[] = $status;
        }
        
        $sql .= " GROUP BY e.id ORDER BY e.start_datetime ASC";
        
        return $this->db->query($sql, $params);
    }
    
    // Get event statistics
    public function getEventStatistics($tenantId, $eventId = null) {
        $sql = "
            SELECT 
                COUNT(DISTINCT e.id) as total_events,
                COUNT(DISTINCT CASE WHEN e.status = 'draft' THEN e.id END) as draft_events,
                COUNT(DISTINCT CASE WHEN e.status = 'published' THEN e.id END) as published_events,
                COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) as completed_events,
                COUNT(DISTINCT CASE WHEN e.status = 'cancelled' THEN e.id END) as cancelled_events,
                COUNT(DISTINCT ea.id) as total_attendances,
                COALESCE(AVG(attendance_counts.count), 0) as avg_attendance_per_event
            FROM events e
            LEFT JOIN event_attendance ea ON e.id = ea.event_id
            LEFT JOIN (
                SELECT event_id, COUNT(*) as count 
                FROM event_attendance 
                GROUP BY event_id
            ) attendance_counts ON e.id = attendance_counts.event_id
            WHERE e.organization_id = ? AND e.deleted_at IS NULL
        ";
        
        $params = [$tenantId];
        
        if ($eventId) {
            $sql .= " AND e.id = ?";
            $params[] = $eventId;
        }
        
        return $this->db->queryOne($sql, $params);
    }
}
?>