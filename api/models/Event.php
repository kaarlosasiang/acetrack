<?php
class Event extends Model {
    protected $table = 'events';
    protected $fillable = [
        'organization_id', 'event_type_id', 'title', 'description', 'location',
        'start_datetime', 'end_datetime', 'max_attendees', 'registration_required',
        'registration_deadline', 'created_by', 'status', 'attendance_code',
        'qr_code_data', 'instructions'
    ];
    
    public function getWithEventType($id, $organizationId = null) {
        $sql = "SELECT e.*, et.name as event_type_name, et.color as event_type_color,
                       u.first_name as creator_first_name, u.last_name as creator_last_name
                FROM events e 
                INNER JOIN event_types et ON e.event_type_id = et.id
                INNER JOIN users u ON e.created_by = u.id
                WHERE e.id = :id";
        
        $params = ['id' => $id];
        
        if ($organizationId !== null) {
            $sql .= " AND e.organization_id = :organization_id";
            $params['organization_id'] = $organizationId;
        }
        
        return $this->db->fetch($sql, $params);
    }
    
    public function getAllWithDetails($organizationId, $limit = null, $offset = null) {
        $sql = "SELECT e.*, et.name as event_type_name, et.color as event_type_color,
                       u.first_name as creator_first_name, u.last_name as creator_last_name,
                       (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.status = 'registered') as registered_count
                FROM events e 
                INNER JOIN event_types et ON e.event_type_id = et.id
                INNER JOIN users u ON e.created_by = u.id
                WHERE e.organization_id = :organization_id
                ORDER BY e.start_datetime DESC";
        
        $params = ['organization_id' => $organizationId];
        
        if ($limit !== null) {
            $sql .= " LIMIT :limit";
            $params['limit'] = $limit;
            
            if ($offset !== null) {
                $sql .= " OFFSET :offset";
                $params['offset'] = $offset;
            }
        }
        
return $this->db->fetchAll($sql, $params);
    }
    
    public function getUpcomingEvents($organizationId, $limit = 10) {
        $sql = "SELECT e.*, et.name as event_type_name, et.color as event_type_color
                FROM events e 
                INNER JOIN event_types et ON e.event_type_id = et.id
                WHERE e.organization_id = :organization_id 
                AND e.start_datetime > NOW()
                AND e.status IN ('published', 'ongoing')
                ORDER BY e.start_datetime ASC
                LIMIT :limit";
        
        return $this->db->fetchAll($sql, [
            'organization_id' => $organizationId,
            'limit' => $limit
        ]);
    }
    
    public function generateAttendanceCode() {
        return strtoupper(substr(md5(uniqid(rand(), true)), 0, 6));
    }
    
    public function generateQRCode($eventId) {
        // Simple QR code data - in production, you might want to use a proper QR library
        return json_encode([
            'event_id' => $eventId,
            'timestamp' => time(),
            'type' => 'attendance'
        ]);
    }
    
    public function getEventAttendance($eventId, $organizationId) {
        $sql = "SELECT a.*, u.first_name, u.last_name, u.student_id, u.section_id,
                       s.section_name, s.year_level, p.name as program_name
                FROM attendance a
                INNER JOIN users u ON a.user_id = u.id
                LEFT JOIN sections s ON u.section_id = s.id
                LEFT JOIN programs p ON s.program_id = p.id
                WHERE a.organization_id = :organization_id
                AND a.attendance_type = 'event'
                AND a.notes LIKE :event_pattern
                ORDER BY a.created_at DESC";
        
        return $this->db->fetchAll($sql, [
            'organization_id' => $organizationId,
            'event_pattern' => "%event_id:$eventId%"
        ]);
    }
    
    public function getEventRegistrations($eventId, $organizationId) {
        $sql = "SELECT er.*, u.first_name, u.last_name, u.student_id, u.email,
                       s.section_name, s.year_level, p.name as program_name
                FROM event_registrations er
                INNER JOIN users u ON er.user_id = u.id
                LEFT JOIN sections s ON u.section_id = s.id
                LEFT JOIN programs p ON s.program_id = p.id
                INNER JOIN events e ON er.event_id = e.id
                WHERE er.event_id = :event_id
                AND e.organization_id = :organization_id
                ORDER BY er.registration_date DESC";
        
        return $this->db->fetchAll($sql, [
            'event_id' => $eventId,
            'organization_id' => $organizationId
        ]);
    }
    
    public function registerForEvent($eventId, $userId, $organizationId) {
        // Check if event exists and allows registration
        $event = $this->getWithEventType($eventId, $organizationId);
        if (!$event) {
            throw new Exception('Event not found');
        }
        
        if (!$event['registration_required']) {
            throw new Exception('This event does not require registration');
        }
        
        if ($event['registration_deadline'] && strtotime($event['registration_deadline']) < time()) {
            throw new Exception('Registration deadline has passed');
        }
        
        // Check if already registered
        $existing = $this->db->fetch(
            "SELECT * FROM event_registrations WHERE event_id = :event_id AND user_id = :user_id",
            ['event_id' => $eventId, 'user_id' => $userId]
        );
        
        if ($existing) {
            throw new Exception('Already registered for this event');
        }
        
        // Check capacity
        if ($event['max_attendees']) {
            $registeredCount = $this->db->fetch(
                "SELECT COUNT(*) as count FROM event_registrations 
                 WHERE event_id = :event_id AND status = 'registered'",
                ['event_id' => $eventId]
            )['count'];
            
            if ($registeredCount >= $event['max_attendees']) {
                // Add to waitlist
                return $this->db->insert('event_registrations', [
                    'event_id' => $eventId,
                    'user_id' => $userId,
                    'status' => 'waitlisted'
                ]);
            }
        }
        
        return $this->db->insert('event_registrations', [
            'event_id' => $eventId,
            'user_id' => $userId,
            'status' => 'registered'
        ]);
    }
    
    public function markEventAttendance($eventId, $userId, $organizationId, $markedBy = null, $notes = null) {
        // Verify event exists
        $event = $this->find($eventId, $organizationId);
        if (!$event) {
            throw new Exception('Event not found');
        }
        
        $eventDate = date('Y-m-d', strtotime($event['start_datetime']));
        
        // Check if attendance already marked
        $existing = $this->db->fetch(
            "SELECT * FROM attendance 
             WHERE user_id = :user_id AND organization_id = :organization_id 
             AND date = :date AND attendance_type = 'event'
             AND notes LIKE :event_pattern",
            [
                'user_id' => $userId,
                'organization_id' => $organizationId,
                'date' => $eventDate,
                'event_pattern' => "%event_id:$eventId%"
            ]
        );
        
        if ($existing) {
            throw new Exception('Attendance already marked for this event');
        }
        
        // Mark attendance
        $attendanceNotes = "Event: " . $event['title'] . " (event_id:$eventId)";
        if ($notes) {
            $attendanceNotes .= " - " . $notes;
        }
        
        return $this->db->insert('attendance', [
            'user_id' => $userId,
            'organization_id' => $organizationId,
            'date' => $eventDate,
            'time_in' => date('H:i:s', strtotime($event['start_datetime'])),
            'status' => 'present',
            'attendance_type' => 'event',
            'notes' => $attendanceNotes,
            'location' => $event['location'],
            'marked_by' => $markedBy
        ]);
    }
}

