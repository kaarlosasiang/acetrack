<?php
class Attendance extends Model {
    protected $table = 'attendance';
    protected $fillable = [
        'user_id', 'tenant_id', 'check_in', 'check_out', 'break_start', 
 'break_end', 'total_hours', 'status', 'notes', 'location', 'ip_address'
    ];
    
    public function checkIn($userId, $tenantId, $location = null, $notes = null) {
        // Check if user already checked in today
        $today = date('Y-m-d');
        $existing = $this->db->fetch(
            "SELECT * FROM attendance 
             WHERE user_id = :user_id AND tenant_id = :tenant_id 
             AND DATE(check_in) = :date AND check_out IS NULL",
            [
                'user_id' => $userId,
                'tenant_id' => $tenantId,
                'date' => $today
            ]
        );
        
        if ($existing) {
            throw new Exception('Already checked in today');
        }
        
        return $this->create([
            'user_id' => $userId,
            'check_in' => date('Y-m-d H:i:s'),
            'status' => 'active',
            'location' => $location,
            'notes' => $notes,
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null
        ], $tenantId);
    }
    
    public function checkOut($userId, $tenantId, $notes = null) {
        // Find today's check-in record
        $today = date('Y-m-d');
        $attendance = $this->db->fetch(
            "SELECT * FROM attendance 
             WHERE user_id = :user_id AND tenant_id = :tenant_id 
             AND DATE(check_in) = :date AND check_out IS NULL",
            [
                'user_id' => $userId,
                'tenant_id' => $tenantId,
                'date' => $today
            ]
        );
        
        if (!$attendance) {
            throw new Exception('No active check-in found for today');
        }
        
        $checkOut = date('Y-m-d H:i:s');
        $checkIn = new DateTime($attendance['check_in']);
        $checkOutTime = new DateTime($checkOut);
        
        // Calculate total hours (excluding break time if any)
        $totalMinutes = $checkOutTime->diff($checkIn)->format('%h') * 60 + $checkOutTime->diff($checkIn)->format('%i');
        
        if ($attendance['break_start'] && $attendance['break_end']) {
            $breakStart = new DateTime($attendance['break_start']);
            $breakEnd = new DateTime($attendance['break_end']);
            $breakMinutes = $breakEnd->diff($breakStart)->format('%h') * 60 + $breakEnd->diff($breakStart)->format('%i');
            $totalMinutes -= $breakMinutes;
        }
        
        $totalHours = round($totalMinutes / 60, 2);
        
        return $this->update($attendance['id'], [
            'check_out' => $checkOut,
            'total_hours' => $totalHours,
            'status' => 'completed',
            'notes' => $notes ? ($attendance['notes'] ? $attendance['notes'] . '; ' . $notes : $notes) : $attendance['notes']
        ], $tenantId);
    }
    
    public function startBreak($userId, $tenantId) {
        $today = date('Y-m-d');
        $attendance = $this->db->fetch(
            "SELECT * FROM attendance 
             WHERE user_id = :user_id AND tenant_id = :tenant_id 
             AND DATE(check_in) = :date AND check_out IS NULL",
            [
                'user_id' => $userId,
                'tenant_id' => $tenantId,
                'date' => $today
            ]
        );
        
        if (!$attendance) {
            throw new Exception('No active check-in found for today');
        }
        
        if ($attendance['break_start']) {
            throw new Exception('Break already started');
        }
        
        return $this->update($attendance['id'], [
            'break_start' => date('Y-m-d H:i:s'),
            'status' => 'on_break'
        ], $tenantId);
    }
    
    public function endBreak($userId, $tenantId) {
        $today = date('Y-m-d');
        $attendance = $this->db->fetch(
            "SELECT * FROM attendance 
             WHERE user_id = :user_id AND tenant_id = :tenant_id 
             AND DATE(check_in) = :date AND check_out IS NULL",
            [
                'user_id' => $userId,
                'tenant_id' => $tenantId,
                'date' => $today
            ]
        );
        
        if (!$attendance) {
            throw new Exception('No active check-in found for today');
        }
        
        if (!$attendance['break_start']) {
            throw new Exception('Break not started');
        }
        
        if ($attendance['break_end']) {
            throw new Exception('Break already ended');
        }
        
        return $this->update($attendance['id'], [
            'break_end' => date('Y-m-d H:i:s'),
            'status' => 'active'
        ], $tenantId);
    }
    
    public function getUserAttendance($userId, $tenantId, $startDate = null, $endDate = null) {
        $sql = "SELECT a.*, u.first_name, u.last_name, u.employee_id 
                FROM attendance a 
                INNER JOIN users u ON a.user_id = u.id 
                WHERE a.user_id = :user_id AND a.tenant_id = :tenant_id";
        
        $params = [
            'user_id' => $userId,
            'tenant_id' => $tenantId
        ];
        
        if ($startDate) {
            $sql .= " AND DATE(a.check_in) >= :start_date";
            $params['start_date'] = $startDate;
        }
        
        if ($endDate) {
            $sql .= " AND DATE(a.check_in) <= :end_date";
            $params['end_date'] = $endDate;
        }
        
        $sql .= " ORDER BY a.check_in DESC";
        
        return $this->db->fetchAll($sql, $params);
    }
    
    public function getAttendanceReport($tenantId, $startDate = null, $endDate = null, $departmentId = null) {
        $sql = "SELECT a.*, u.first_name, u.last_name, u.employee_id, u.department_id, d.name as department_name
FROM attendance a
                INNER JOIN users u ON a.user_id = u.id 
                LEFT JOIN departments d ON u.department_id = d.id
                WHERE a.tenant_id = :tenant_id";
        
        $params = ['tenant_id' => $tenantId];
        
        if ($startDate) {
            $sql .= " AND DATE(a.check_in) >= :start_date";
            $params['start_date'] = $startDate;
        }
        
        if ($endDate) {
            $sql .= " AND DATE(a.check_in) <= :end_date";
            $params['end_date'] = $endDate;
        }
        
        if ($departmentId) {
            $sql .= " AND u.department_id = :department_id";
            $params['department_id'] = $departmentId;
        }
        
        $sql .= " ORDER BY a.check_in DESC";
        
        return $this->db->fetchAll($sql, $params);
    }
    
    public function getTodayStatus($userId, $tenantId) {
        $today = date('Y-m-d');
        return $this->db->fetch(
            "SELECT * FROM attendance 
             WHERE user_id = :user_id AND tenant_id = :tenant_id 
             AND DATE(check_in) = :date 
             ORDER BY check_in DESC LIMIT 1",
            [
                'user_id' => $userId,
                'tenant_id' => $tenantId,
                'date' => $today
            ]
        );
    }
}

