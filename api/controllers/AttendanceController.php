<?php
class AttendanceController extends Controller {
    private $attendanceModel;
    
    public function __construct() {
        parent::__construct();
        $this->attendanceModel = new Attendance();
    }
    
    public function index($params = []) {
        try {
            $tenantId = $this->getCurrentTenant();
            $pagination = $this->getPaginationParams();
            $queryParams = $this->getQueryParams();
            
            $startDate = $queryParams['start_date'] ?? null;
            $endDate = $queryParams['end_date'] ?? null;
            $departmentId = $queryParams['department_id'] ?? null;
            
            $attendance = $this->attendanceModel->getAttendanceReport(
                $tenantId, 
                $startDate, 
                $endDate, 
                $departmentId
            );
            
            // Apply pagination
            $total = count($attendance);
            $paginatedData = array_slice($attendance, $pagination['offset'], $pagination['limit']);
            
            $this->paginatedResponse($paginatedData, $total, $pagination['page'], $pagination['limit']);
            
        } catch (Exception $e) {
            $this->errorResponse('Failed to fetch attendance: ' . $e->getMessage(), 500);
        }
    }
    
    public function checkIn($params = []) {
        try {
            $user = $this->getCurrentUser();
            $tenantId = $this->getCurrentTenant();
            $input = $this->getInput();
            
            $location = $input['location'] ?? null;
            $notes = $input['notes'] ?? null;
            
            $attendance = $this->attendanceModel->checkIn($user['id'], $tenantId, $location, $notes);
            
            $this->logActivity('check_in', [
                'attendance_id' => $attendance['id'],
                'location' => $location
            ]);
            
            $this->successResponse($attendance, 'Checked in successfully', 201);
            
        } catch (Exception $e) {
            $this->errorResponse('Check-in failed: ' . $e->getMessage(), 400);
        }
    }
    
    public function checkOut($params = []) {
        try {
            $user = $this->getCurrentUser();
            $tenantId = $this->getCurrentTenant();
            $input = $this->getInput();
            
            $notes = $input['notes'] ?? null;
            
            $attendance = $this->attendanceModel->checkOut($user['id'], $tenantId, $notes);
            
            $this->logActivity('check_out', [
                'attendance_id' => $attendance['id'],
                'total_hours' => $attendance['total_hours']
            ]);
            
            $this->successResponse($attendance, 'Checked out successfully');
            
        } catch (Exception $e) {
            $this->errorResponse('Check-out failed: ' . $e->getMessage(), 400);
        }
    }
    
    public function startBreak($params = []) {
        try {
            $user = $this->getCurrentUser();
            $tenantId = $this->getCurrentTenant();
            
            $attendance = $this->attendanceModel->startBreak($user['id'], $tenantId);
            
            $this->logActivity('break_start', ['attendance_id' => $attendance['id']]);
            
            $this->successResponse($attendance, 'Break started successfully');
            
        } catch (Exception $e) {
            $this->errorResponse('Failed to start break: ' . $e->getMessage(), 400);
        }
    }
    
    public function endBreak($params = []) {
        try {
            $user = $this->getCurrentUser();
            $tenantId = $this->getCurrentTenant();
            
            $attendance = $this->attendanceModel->endBreak($user['id'], $tenantId);
            
            $this->logActivity('break_end', ['attendance_id' => $attendance['id']]);
            
            $this->successResponse($attendance, 'Break ended successfully');
            
        } catch (Exception $e) {
            $this->errorResponse('Failed to end break: ' . $e->getMessage(), 400);
        }
    }
    
    public function myAttendance($params = []) {
        try {
            $user = $this->getCurrentUser();
            $tenantId = $this->getCurrentTenant();
            $queryParams = $this->getQueryParams();
            
            $startDate = $queryParams['start_date'] ?? null;
            $endDate = $queryParams['end_date'] ?? null;
            
            $attendance = $this->attendanceModel->getUserAttendance(
                $user['id'], 
                $tenantId, 
                $startDate, 
                $endDate
            );
            
            // Get today's status
            $todayStatus = $this->attendanceModel->getTodayStatus($user['id'], $tenantId);
            
            $this->successResponse([
                'attendance' => $attendance,
                'today_status' => $todayStatus
            ]);
            
        } catch (Exception $e) {
            $this->errorResponse('Failed to fetch attendance: ' . $e->getMessage(), 500);
        }
    }
    
    public function userAttendance($params = []) {
        try {
            $userId = $params['id'] ?? null;
            if (!$userId) {
                $this->errorResponse('User ID required', 400);
            }
            
            $tenantId = $this->getCurrentTenant();
            $queryParams = $this->getQueryParams();
            
            $startDate = $queryParams['start_date'] ?? null;
            $endDate = $queryParams['end_date'] ?? null;
            
            $attendance = $this->attendanceModel->getUserAttendance(
                $userId, 
                $tenantId, 
                $startDate, 
                $endDate
            );
            
            $this->successResponse($attendance);
            
        } catch (Exception $e) {
            $this->errorResponse('Failed to fetch user attendance: ' . $e->getMessage(), 500);
        }
    }
    
    public function report($params = []) {
        try {
            $tenantId = $this->getCurrentTenant();
            $queryParams = $this->getQueryParams();
            
            $startDate = $queryParams['start_date'] ?? null;
            $endDate = $queryParams['end_date'] ?? null;
            $departmentId = $queryParams['department_id'] ?? null;
            $format = $queryParams['format'] ?? 'json'; // json, csv
            
            $attendance = $this->attendanceModel->getAttendanceReport(
                $tenantId, 
                $startDate, 
                $endDate, 
                $departmentId
            );
            
            if ($format === 'csv') {
                $this->exportToCsv($attendance, 'attendance_report.csv');
            } else {
                // Calculate summary statistics
                $summary = $this->calculateAttendanceSummary($attendance);
                
                $this->successResponse([
                    'attendance' => $attendance,
                    'summary' => $summary,
                    'filters' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'department_id' => $departmentId
                    ]
                ]);
            }
            
        } catch (Exception $e) {
            $this->errorResponse('Failed to generate report: ' . $e->getMessage(), 500);
        }
    }
    
    public function getTodayStatus($params = []) {
        try {
            $user = $this->getCurrentUser();
            $tenantId = $this->getCurrentTenant();
            
            $status = $this->attendanceModel->getTodayStatus($user['id'], $tenantId);
            
            $this->successResponse([
                'status' => $status,
                'can_check_in' => !$status,
                'can_check_out' => $status && !$status['check_out'],
                'can_start_break' => $status && !$status['check_out'] && $status['status'] === 'active',
                'can_end_break' => $status && !$status['check_out'] && $status['status'] === 'on_break'
            ]);
            
        } catch (Exception $e) {
            $this->errorResponse('Failed to get today status: ' . $e->getMessage(), 500);
        }
    }
    
    private function calculateAttendanceSummary($attendance) {
        $totalEmployees = count(array_unique(array_column($attendance, 'user_id')));
        $totalHours = array_sum(array_column($attendance, 'total_hours'));
        $averageHours = $totalEmployees > 0 ? round($totalHours / $totalEmployees, 2) : 0;
        
        $statusCounts = array_count_values(array_column($attendance, 'status'));
        
        return [
            'total_employees' => $totalEmployees,
            'total_records' => count($attendance),
            'total_hours' => round($totalHours, 2),
            'average_hours_per_employee' => $averageHours,
            'status_breakdown' => $statusCounts
        ];
    }
    
    private function exportToCsv($data, $filename) {
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        
        $output = fopen('php://output', 'w');
        
        if (!empty($data)) {
            // Write headers
            fputcsv($output, array_keys($data[0]));
            
            // Write data
            foreach ($data as $row) {
                fputcsv($output, $row);
            }
        }
        
        fclose($output);
        exit;
    }
}

