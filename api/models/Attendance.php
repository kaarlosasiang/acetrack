<?php
class Attendance extends Model {
    protected $table = 'attendance';
    protected $fillable = [
        'student_id', 'event_id', 'organization_id', 'check_in_time', 'check_out_time',
        'scanned_by', 'status', 'duration_minutes', 'notes', 'ip_address', 'device_info'
    ];
    
    public function checkIn($studentId, $eventId, $organizationId, $scannedBy, $metadata = []) {
        // Check if already checked in
        $existing = $this->findBy([
            'student_id' => $studentId,
            'event_id' => $eventId
        ]);
        
        if ($existing && $existing['status'] !== 'absent') {
            throw new Exception('Student already checked in for this event');
        }
        
        $data = [
            'student_id' => $studentId,
            'event_id' => $eventId,
            'organization_id' => $organizationId,
            'check_in_time' => date('Y-m-d H:i:s'),
            'scanned_by' => $scannedBy,
            'status' => 'checked_in',
            'ip_address' => $metadata['ip_address'] ?? null,
            'device_info' => $metadata['device_info'] ?? null,
            'notes' => $metadata['notes'] ?? null
        ];
        
        if ($existing) {
            return $this->update($existing['id'], $data);
        } else {
            return $this->create($data);
        }
    }
    
    public function checkOut($studentId, $eventId, $scannedBy, $metadata = []) {
        $attendance = $this->findBy([
            'student_id' => $studentId,
            'event_id' => $eventId
        ]);
        
        if (!$attendance) {
            throw new Exception('No check-in record found for this student and event');
        }
        
        if ($attendance['status'] === 'checked_out') {
            throw new Exception('Student already checked out');
        }
        
        return $this->update($attendance['id'], [
            'check_out_time' => date('Y-m-d H:i:s'),
            'status' => 'checked_out',
            'scanned_by' => $scannedBy,
            'ip_address' => $metadata['ip_address'] ?? $attendance['ip_address'],
            'device_info' => $metadata['device_info'] ?? $attendance['device_info'],
            'notes' => $metadata['notes'] ?? $attendance['notes']
        ]);
    }
    
    
    public function getStudentAttendanceHistory($studentId, $organizationId) {
        $sql = "SELECT a.*, e.title as event_title, e.start_datetime, e.end_datetime
                FROM attendance a
                JOIN events e ON a.event_id = e.id
                WHERE a.student_id = :student_id AND a.organization_id = :organization_id
                ORDER BY e.start_datetime DESC";
        
        return $this->db->fetchAll($sql, [
            'student_id' => $studentId,
            'organization_id' => $organizationId
        ]);
    }
    
    public function getEventAttendance($eventId, $organizationId) {
        $sql = "SELECT a.*, u.first_name, u.last_name, u.student_id, u.course, u.year_level
                FROM attendance a
                JOIN users u ON a.student_id = u.id
                WHERE a.event_id = :event_id AND a.organization_id = :organization_id
                ORDER BY a.check_in_time DESC";
        
        return $this->db->fetchAll($sql, [
            'event_id' => $eventId,
            'organization_id' => $organizationId
        ]);
    }
}

