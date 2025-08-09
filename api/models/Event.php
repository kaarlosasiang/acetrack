<?php
class Event extends Model {
    protected $table = 'events';
    protected $fillable = [
        'organization_id', 'title', 'description', 'about', 'location', 
        'start_datetime', 'end_datetime', 'max_attendees', 'created_by',
        'status', 'banner', 'speakers', 'topics', 'attendance_required',
        'check_in_window_minutes', 'check_out_window_minutes'
    ];
    
    public function create($data, $organizationId = null) {
        if (isset($data['speakers']) && is_array($data['speakers'])) {
            $data['speakers'] = json_encode($data['speakers']);
        }
        
        if (isset($data['topics']) && is_array($data['topics'])) {
            $data['topics'] = json_encode($data['topics']);
        }
        
        return parent::create($data, $organizationId);
    }
    
    public function update($id, $data, $organizationId = null) {
        if (isset($data['speakers']) && is_array($data['speakers'])) {
            $data['speakers'] = json_encode($data['speakers']);
        }
        
        if (isset($data['topics']) && is_array($data['topics'])) {
            $data['topics'] = json_encode($data['topics']);
        }
        
        return parent::update($id, $data, $organizationId);
    }
    
    protected function formatOutput($data) {
        $data = parent::formatOutput($data);
        
        if (isset($data['speakers']) && is_string($data['speakers'])) {
            $data['speakers'] = json_decode($data['speakers'], true) ?: [];
        }
        
        if (isset($data['topics']) && is_string($data['topics'])) {
            $data['topics'] = json_decode($data['topics'], true) ?: [];
        }
        
        return $data;
    }
    
    public function getUpcoming($organizationId, $limit = 10) {
        $sql = "SELECT * FROM events 
                WHERE organization_id = :organization_id 
                AND start_datetime > NOW() 
                AND status IN ('published', 'ongoing')
                ORDER BY start_datetime ASC
                LIMIT :limit";
        
        $events = $this->db->fetchAll($sql, [
            'organization_id' => $organizationId,
            'limit' => $limit
        ]);
        
        return array_map([$this, 'formatOutput'], $events);
    }
    
    public function isCheckInOpen($eventId) {
        $event = $this->find($eventId);
        if (!$event) return false;
        
        $now = new DateTime();
        $startTime = new DateTime($event['start_datetime']);
        $checkInStart = clone $startTime;
        $checkInStart->modify('-' . ($event['check_in_window_minutes'] ?? 30) . ' minutes');
        
        return $now >= $checkInStart && $now <= $startTime;
    }
    
    public function isCheckOutOpen($eventId) {
        $event = $this->find($eventId);
        if (!$event) return false;
        
        $now = new DateTime();
        $endTime = new DateTime($event['end_datetime']);
        $checkOutEnd = clone $endTime;
        $checkOutEnd->modify('+' . ($event['check_out_window_minutes'] ?? 60) . ' minutes');
        
        return $now >= $endTime && $now <= $checkOutEnd;
    }
    
    public function getAttendanceStats($eventId) {
        $sql = "SELECT 
                    COUNT(*) as total_students,
                    SUM(CASE WHEN a.status = 'checked_out' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN a.status = 'checked_in' THEN 1 ELSE 0 END) as checked_in_only,
                    AVG(a.duration_minutes) as avg_duration
                FROM attendance a
                WHERE a.event_id = :event_id";
        
        return $this->db->fetch($sql, ['event_id' => $eventId]);
    }
}

