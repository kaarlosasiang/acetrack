<?php
class ScanLog extends Model {
    protected $table = 'scan_logs';
    protected $fillable = [
        'organization_id', 'scanned_by', 'student_id', 'event_id', 'qr_code_data',
        'qr_type', 'scan_result', 'scan_action', 'ip_address', 'user_agent', 'device_info'
    ];
    
    public function logScanAttempt($organizationId, $scannedBy, $qrData, $scanResult, $scanAction, $metadata = []) {
        return $this->create([
            'organization_id' => $organizationId,
            'scanned_by' => $scannedBy,
            'student_id' => $metadata['student_id'] ?? null,
            'event_id' => $metadata['event_id'] ?? null,
            'qr_code_data' => $qrData,
            'qr_type' => $metadata['qr_type'] ?? 'static',
            'scan_result' => $scanResult,
            'scan_action' => $scanAction,
            'ip_address' => $metadata['ip_address'] ?? null,
            'user_agent' => $metadata['user_agent'] ?? null,
            'device_info' => $metadata['device_info'] ?? null
        ]);
    }
    
    public function checkRateLimit($scannedBy, $timeWindow = 60, $maxAttempts = 10) {
        $cutoff = date('Y-m-d H:i:s', time() - $timeWindow);
        
        $count = $this->db->fetch(
            "SELECT COUNT(*) as count FROM scan_logs 
             WHERE scanned_by = :scanned_by AND scan_timestamp >= :cutoff",
            ['scanned_by' => $scannedBy, 'cutoff' => $cutoff]
        )['count'] ?? 0;
        
        return $count < $maxAttempts;
    }
    
    public function getSecurityReport($organizationId, $startDate = null, $endDate = null) {
        $sql = "SELECT sl.*, 
                       u1.first_name as scanner_first_name, u1.last_name as scanner_last_name,
                       u2.first_name as student_first_name, u2.last_name as student_last_name,
                       e.title as event_title
                FROM scan_logs sl
                LEFT JOIN users u1 ON sl.scanned_by = u1.id
                LEFT JOIN users u2 ON sl.student_id = u2.id
                LEFT JOIN events e ON sl.event_id = e.id
                WHERE sl.organization_id = :organization_id";
        
        $params = ['organization_id' => $organizationId];
        
        if ($startDate) {
            $sql .= " AND DATE(sl.scan_timestamp) >= :start_date";
            $params['start_date'] = $startDate;
        }
        
        if ($endDate) {
            $sql .= " AND DATE(sl.scan_timestamp) <= :end_date";
            $params['end_date'] = $endDate;
        }
        
        $sql .= " ORDER BY sl.scan_timestamp DESC";
        
        return $this->db->fetchAll($sql, $params);
    }
}
