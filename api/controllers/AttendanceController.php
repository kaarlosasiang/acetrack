<?php
require_once 'models/Attendance.php';

class AttendanceController extends Controller {
    private $attendanceModel;
    
    public function __construct() {
        parent::__construct();
        $this->attendanceModel = new Attendance();
    }
    
    public function index($params = []) {
        try {
            $organizationId = $this->getCurrentOrganization();
            $pagination = $this->getPaginationParams();
            $queryParams = $this->getQueryParams();
            
            $startDate = $queryParams['start_date'] ?? null;
            $endDate = $queryParams['end_date'] ?? null;
            $departmentId = $queryParams['department_id'] ?? null;
            
            $attendance = $this->attendanceModel->getAttendanceReport(
                $organizationId, 
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
    
    // Mark attendance for a student
    public function markAttendance($params = []) {
        try {
            $userId = $params['user_id'] ?? null;
            $organizationId = $this->getCurrentOrganization();
            $input = $this->getInput();
            
            // Validate required fields
            $this->validateRequired($input, ['status']);
            
            if (!$userId) {
                $this->errorResponse('User ID required', 400);
            }
            
            $attendanceData = [
                'date' => $input['date'] ?? date('Y-m-d'),
                'status' => $input['status'], // present, absent, late, excused
                'attendance_type' => $input['attendance_type'] ?? 'regular',
                'section_id' => $input['section_id'] ?? null,
                'time_in' => $input['time_in'] ?? null,
                'time_out' => $input['time_out'] ?? null,
                'notes' => $input['notes'] ?? null,
                'location' => $input['location'] ?? null,
                'marked_by' => $this->getCurrentUser()['id']
            ];
            
            $attendance = $this->attendanceModel->markAttendance($userId, $organizationId, $attendanceData);
            
            $this->logActivity('attendance_marked', [
                'attendance_id' => $attendance['id'],
                'user_id' => $userId,
                'status' => $input['status'],
                'date' => $attendanceData['date']
            ]);
            
            $this->successResponse($attendance, 'Attendance marked successfully', 201);
            
        } catch (Exception $e) {
            $this->errorResponse('Failed to mark attendance: ' . $e->getMessage(), 400);
        }
    }
    
    // Bulk mark attendance for multiple students
    public function bulkMarkAttendance($params = []) {
        try {
            $organizationId = $this->getCurrentOrganization();
            $input = $this->getInput();
            
            // Validate required fields
            $this->validateRequired($input, ['students', 'date', 'attendance_type']);
            
            $date = $input['date'];
            $attendanceType = $input['attendance_type'];
            $sectionId = $input['section_id'] ?? null;
            $markedBy = $this->getCurrentUser()['id'];
            
            $results = [];
            $errors = [];
            
            foreach ($input['students'] as $student) {
                try {
                    $attendanceData = [
                        'date' => $date,
                        'status' => $student['status'],
                        'attendance_type' => $attendanceType,
                        'section_id' => $sectionId,
                        'time_in' => $student['time_in'] ?? null,
                        'time_out' => $student['time_out'] ?? null,
                        'notes' => $student['notes'] ?? null,
                        'location' => $input['location'] ?? null,
                        'marked_by' => $markedBy
                    ];
                    
                    $attendance = $this->attendanceModel->markAttendance(
                        $student['user_id'], 
                        $organizationId, 
                        $attendanceData
                    );
                    
                    $results[] = [
                        'user_id' => $student['user_id'],
                        'attendance' => $attendance,
                        'success' => true
                    ];
                    
                } catch (Exception $e) {
                    $errors[] = [
                        'user_id' => $student['user_id'],
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            $this->logActivity('bulk_attendance_marked', [
                'date' => $date,
                'attendance_type' => $attendanceType,
                'total_students' => count($input['students']),
                'successful' => count($results),
                'failed' => count($errors)
            ]);
            
            $this->successResponse([
                'results' => $results,
                'errors' => $errors,
                'summary' => [
                    'total' => count($input['students']),
                    'successful' => count($results),
                    'failed' => count($errors)
                ]
            ], 'Bulk attendance marking completed');
            
        } catch (Exception $e) {
            $this->errorResponse('Failed to mark bulk attendance: ' . $e->getMessage(), 400);
        }
    }
    
    public function myAttendance($params = []) {
        try {
            $user = $this->getCurrentUser();
            $organizationId = $this->getCurrentOrganization();
            $queryParams = $this->getQueryParams();
            
            $startDate = $queryParams['start_date'] ?? null;
            $endDate = $queryParams['end_date'] ?? null;
            
            $attendance = $this->attendanceModel->getUserAttendance(
                $user['id'], 
                $organizationId, 
                $startDate, 
                $endDate
            );
            
            // Get today's status
            $todayStatus = $this->attendanceModel->getTodayStatus($user['id'], $organizationId);
            
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
            
            $organizationId = $this->getCurrentOrganization();
            $queryParams = $this->getQueryParams();
            
            $startDate = $queryParams['start_date'] ?? null;
            $endDate = $queryParams['end_date'] ?? null;
            
            $attendance = $this->attendanceModel->getUserAttendance(
                $userId, 
                $organizationId, 
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
            $organizationId = $this->getCurrentOrganization();
            $queryParams = $this->getQueryParams();
            
            $startDate = $queryParams['start_date'] ?? null;
            $endDate = $queryParams['end_date'] ?? null;
            $departmentId = $queryParams['department_id'] ?? null;
            $format = $queryParams['format'] ?? 'json'; // json, csv
            
            $attendance = $this->attendanceModel->getAttendanceReport(
                $organizationId, 
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
            $organizationId = $this->getCurrentOrganization();
            
            $status = $this->attendanceModel->getTodayStatus($user['id'], $organizationId);
            
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

