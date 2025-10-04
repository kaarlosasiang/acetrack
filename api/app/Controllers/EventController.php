<?php
require_once 'BaseController.php';

class EventController extends BaseController {
    
    // Get all events for organization (with pagination)
    public function index($params = []) {
        $this->requireTenantMembership();
        
        try {
            $paginationParams = $this->getPaginationParams();
            $status = $this->input('status'); // draft, published, completed, cancelled
            
            $eventModel = new Event();
            $eventModel->setTenant($this->currentTenantId);
            
            $conditions = [];
            if ($status) {
                $conditions['status'] = $status;
            }
            
            $result = $eventModel->paginate(
                $paginationParams['page'],
                $paginationParams['per_page'],
                $conditions,
                'start_datetime DESC'
            );
            
            $this->success($result, 'Events retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get events: ' . $e->getMessage(), 500);
        }
    }
    
    // Create new event (admin only)
    public function store($params = []) {
        $this->requireRole(['admin', 'sub_admin']);
        
        try {
            $input = $this->getInput();
            
            // Validation rules
            $rules = [
                'title' => 'required|max:200',
                'description' => 'max:2000',
                'start_datetime' => 'required|datetime',
                'end_datetime' => 'required|datetime',
                'location' => 'max:500',
                'max_attendees' => 'integer',
                'is_mandatory' => 'in:0,1'
            ];
            
            $validation = Validator::make($input, $rules);
            
            if (!$validation['valid']) {
                $this->validationError($validation['errors']);
            }
            
            // Validate datetime logic
            if (strtotime($input['start_datetime']) >= strtotime($input['end_datetime'])) {
                $this->error('End time must be after start time', 400);
            }
            
            if (strtotime($input['start_datetime']) <= time()) {
                $this->error('Event start time must be in the future', 400);
            }
            
            // Create event
            $eventModel = new Event();
            $eventModel->setTenant($this->currentTenantId);
            
            $eventData = [
                'organization_id' => $this->currentTenantId,
                'title' => $input['title'],
                'description' => $input['description'] ?? null,
                'start_datetime' => $input['start_datetime'],
                'end_datetime' => $input['end_datetime'],
                'location' => $input['location'] ?? null,
                'max_attendees' => $input['max_attendees'] ?? null,
                'is_mandatory' => $input['is_mandatory'] ?? 0,
                'status' => 'draft',
                'created_by' => $this->currentUser['id']
            ];
            
            $event = $eventModel->create($eventData);
            
            if (!$event) {
                $this->error('Failed to create event');
            }
            
            // Log the event creation
            $this->logAudit('event_created', 'Event', $event['id'], null, $eventData);
            
            $this->success($event, 'Event created successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to create event: ' . $e->getMessage(), 500);
        }
    }
    
    // Get specific event details
    public function show($params = []) {
        $this->requireTenantMembership();
        
        try {
            $eventId = $params['id'] ?? null;
            
            if (!$eventId) {
                $this->error('Event ID is required', 400);
            }
            
            $eventModel = new Event();
            $eventModel->setTenant($this->currentTenantId);
            $event = $eventModel->find($eventId);
            
            if (!$event) {
                $this->error('Event not found', 404);
            }
            
            // TODO: Add attendance count and other statistics
            
            $this->success($event, 'Event retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get event: ' . $e->getMessage(), 500);
        }
    }
    
    // Update event (admin only)
    public function update($params = []) {
        $this->requireRole(['admin', 'sub_admin']);
        
        try {
            $eventId = $params['id'] ?? null;
            
            if (!$eventId) {
                $this->error('Event ID is required', 400);
            }
            
            $input = $this->getInput();
            
            // Get current event
            $eventModel = new Event();
            $eventModel->setTenant($this->currentTenantId);
            $currentEvent = $eventModel->find($eventId);
            
            if (!$currentEvent) {
                $this->error('Event not found', 404);
            }
            
            // Don't allow editing completed or cancelled events
            if (in_array($currentEvent['status'], ['completed', 'cancelled'])) {
                $this->error('Cannot edit completed or cancelled events', 400);
            }
            
            // Validation rules
            $rules = [
                'title' => 'max:200',
                'description' => 'max:2000',
                'start_datetime' => 'datetime',
                'end_datetime' => 'datetime',
                'location' => 'max:500',
                'max_attendees' => 'integer',
                'is_mandatory' => 'in:0,1'
            ];
            
            $validation = Validator::make($input, $rules);
            
            if (!$validation['valid']) {
                $this->validationError($validation['errors']);
            }
            
            // Validate datetime logic if both are provided
            if (isset($input['start_datetime']) && isset($input['end_datetime'])) {
                if (strtotime($input['start_datetime']) >= strtotime($input['end_datetime'])) {
                    $this->error('End time must be after start time', 400);
                }
            }
            
            // Update event
            $updateData = array_filter([
                'title' => $input['title'] ?? null,
                'description' => $input['description'] ?? null,
                'start_datetime' => $input['start_datetime'] ?? null,
                'end_datetime' => $input['end_datetime'] ?? null,
                'location' => $input['location'] ?? null,
                'max_attendees' => $input['max_attendees'] ?? null,
                'is_mandatory' => $input['is_mandatory'] ?? null
            ], function($value) { return $value !== null; });
            
            $updatedEvent = $eventModel->update($eventId, $updateData);
            
            if (!$updatedEvent) {
                $this->error('Failed to update event');
            }
            
            // Log the event update
            $this->logAudit('event_updated', 'Event', $eventId,
                array_intersect_key($currentEvent, $updateData),
                $updateData
            );
            
            $this->success($updatedEvent, 'Event updated successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to update event: ' . $e->getMessage(), 500);
        }
    }
    
    // Delete event (admin only)
    public function destroy($params = []) {
        $this->requireRole(['admin']);
        
        try {
            $eventId = $params['id'] ?? null;
            
            if (!$eventId) {
                $this->error('Event ID is required', 400);
            }
            
            $eventModel = new Event();
            $eventModel->setTenant($this->currentTenantId);
            $event = $eventModel->find($eventId);
            
            if (!$event) {
                $this->error('Event not found', 404);
            }
            
            // Don't allow deleting published events with attendees
            if ($event['status'] === 'published') {
                // TODO: Check if event has attendees
                // For now, just prevent deletion of published events
                $this->error('Cannot delete published events. Cancel the event instead.', 400);
            }
            
            $deleted = $eventModel->delete($eventId);
            
            if (!$deleted) {
                $this->error('Failed to delete event');
            }
            
            // Log the event deletion
            $this->logAudit('event_deleted', 'Event', $eventId, $event, null);
            
            $this->success(null, 'Event deleted successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to delete event: ' . $e->getMessage(), 500);
        }
    }
    
    // Publish event (admin only)
    public function publish($params = []) {
        $this->requireRole(['admin', 'sub_admin']);
        
        try {
            $eventId = $params['id'] ?? null;
            
            if (!$eventId) {
                $this->error('Event ID is required', 400);
            }
            
            $eventModel = new Event();
            $eventModel->setTenant($this->currentTenantId);
            $event = $eventModel->find($eventId);
            
            if (!$event) {
                $this->error('Event not found', 404);
            }
            
            if ($event['status'] !== 'draft') {
                $this->error('Only draft events can be published', 400);
            }
            
            // Validate event can be published (has required fields)
            if (!$event['title'] || !$event['start_datetime'] || !$event['end_datetime']) {
                $this->error('Event must have title, start time, and end time to be published', 400);
            }
            
            $updatedEvent = $eventModel->update($eventId, [
                'status' => 'published',
                'published_at' => date('Y-m-d H:i:s')
            ]);
            
            if (!$updatedEvent) {
                $this->error('Failed to publish event');
            }
            
            // Log the event publication
            $this->logAudit('event_published', 'Event', $eventId, 
                ['status' => 'draft'], 
                ['status' => 'published', 'published_at' => date('Y-m-d H:i:s')]
            );
            
            $this->success($updatedEvent, 'Event published successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to publish event: ' . $e->getMessage(), 500);
        }
    }
    
    // Cancel event (admin only)
    public function cancel($params = []) {
        $this->requireRole(['admin', 'sub_admin']);
        
        try {
            $eventId = $params['id'] ?? null;
            
            if (!$eventId) {
                $this->error('Event ID is required', 400);
            }
            
            $eventModel = new Event();
            $eventModel->setTenant($this->currentTenantId);
            $event = $eventModel->find($eventId);
            
            if (!$event) {
                $this->error('Event not found', 404);
            }
            
            if (in_array($event['status'], ['completed', 'cancelled'])) {
                $this->error('Event is already completed or cancelled', 400);
            }
            
            $updatedEvent = $eventModel->update($eventId, [
                'status' => 'cancelled',
                'cancelled_at' => date('Y-m-d H:i:s')
            ]);
            
            if (!$updatedEvent) {
                $this->error('Failed to cancel event');
            }
            
            // Log the event cancellation
            $this->logAudit('event_cancelled', 'Event', $eventId,
                ['status' => $event['status']],
                ['status' => 'cancelled', 'cancelled_at' => date('Y-m-d H:i:s')]
            );
            
            $this->success($updatedEvent, 'Event cancelled successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to cancel event: ' . $e->getMessage(), 500);
        }
    }
    
    // Complete event (admin only)
    public function complete($params = []) {
        $this->requireRole(['admin', 'sub_admin']);
        
        try {
            $eventId = $params['id'] ?? null;
            
            if (!$eventId) {
                $this->error('Event ID is required', 400);
            }
            
            $eventModel = new Event();
            $eventModel->setTenant($this->currentTenantId);
            $event = $eventModel->find($eventId);
            
            if (!$event) {
                $this->error('Event not found', 404);
            }
            
            if ($event['status'] !== 'published') {
                $this->error('Only published events can be marked as completed', 400);
            }
            
            $updatedEvent = $eventModel->update($eventId, [
                'status' => 'completed',
                'completed_at' => date('Y-m-d H:i:s')
            ]);
            
            if (!$updatedEvent) {
                $this->error('Failed to complete event');
            }
            
            // Log the event completion
            $this->logAudit('event_completed', 'Event', $eventId,
                ['status' => 'published'],
                ['status' => 'completed', 'completed_at' => date('Y-m-d H:i:s')]
            );
            
            $this->success($updatedEvent, 'Event marked as completed successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to complete event: ' . $e->getMessage(), 500);
        }
    }
    
    // Get event attendees (admin only)
    public function attendees($params = []) {
        $this->requireRole(['admin', 'sub_admin']);
        
        try {
            $eventId = $params['id'] ?? null;
            
            if (!$eventId) {
                $this->error('Event ID is required', 400);
            }
            
            // TODO: Implement attendees list
            // This would require EventAttendance model
            
            $this->success([
                'event_id' => $eventId,
                'attendees' => [],
                'total_checked_in' => 0,
                'total_checked_out' => 0,
                'total_registered' => 0
            ], 'Event attendees retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get event attendees: ' . $e->getMessage(), 500);
        }
    }
    
    // Upload event banner (admin only)
    public function uploadBanner($params = []) {
        $this->requireRole(['admin', 'sub_admin']);
        
        try {
            $eventId = $params['id'] ?? null;
            
            if (!$eventId) {
                $this->error('Event ID is required', 400);
            }
            
            if (!isset($_FILES['banner'])) {
                $this->error('No banner file provided', 400);
            }
            
            // Verify event exists
            $eventModel = new Event();
            $eventModel->setTenant($this->currentTenantId);
            $event = $eventModel->find($eventId);
            
            if (!$event) {
                $this->error('Event not found', 404);
            }
            
            // Upload the banner
            $uploadResult = $this->uploadFile('banner', ALLOWED_IMAGE_TYPES, MAX_UPLOAD_SIZE);
            
            if (!$uploadResult) {
                $this->error('Failed to upload banner');
            }
            
            // Update event banner URL
            $updatedEvent = $eventModel->update($eventId, [
                'banner_url' => $uploadResult['url']
            ]);
            
            if (!$updatedEvent) {
                $this->error('Failed to update event banner');
            }
            
            // Log the banner upload
            $this->logAudit('event_banner_uploaded', 'Event', $eventId, null, [
                'filename' => $uploadResult['filename'],
                'url' => $uploadResult['url']
            ]);
            
            $this->success([
                'banner_url' => $uploadResult['url'],
                'upload_info' => $uploadResult
            ], 'Event banner uploaded successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to upload event banner: ' . $e->getMessage(), 500);
        }
    }
    
    // Generate QR code for event (admin only)
    public function generateQRCode($params = []) {
        $this->requireRole(['admin', 'sub_admin']);
        
        try {
            $eventId = $params['id'] ?? null;
            
            if (!$eventId) {
                $this->error('Event ID is required', 400);
            }
            
            // Verify event exists and is published
            $eventModel = new Event();
            $eventModel->setTenant($this->currentTenantId);
            $event = $eventModel->find($eventId);
            
            if (!$event) {
                $this->error('Event not found', 404);
            }
            
            if ($event['status'] !== 'published') {
                $this->error('QR codes can only be generated for published events', 400);
            }
            
            // Generate QR code using QRCodeHelper
            require_once APP_PATH . '/Helpers/QRCodeHelper.php';
            $qrHelper = new QRCodeHelper();
            
            // Set expiration to 1 hour after event end time
            $expiresAt = date('Y-m-d H:i:s', strtotime($event['end_datetime']) + 3600);
            
            $qrResult = $qrHelper->generateEventQR($eventId, $this->currentTenantId, $expiresAt);
            
            if (!$qrResult['success']) {
                $this->error('Failed to generate QR code: ' . $qrResult['error']);
            }
            
            // Log QR code generation
            $this->logAudit('event_qr_generated', 'Event', $eventId, null, [
                'qr_token' => $qrResult['qr_token'],
                'expires_at' => $qrResult['expires_at']
            ]);
            
            $this->success([
                'event_id' => $eventId,
                'qr_token' => $qrResult['qr_token'],
                'qr_url' => $qrResult['qr_url'],
                'qr_code_image' => $qrResult['qr_code_image'],
                'expires_at' => $qrResult['expires_at'],
                'event_name' => $event['name'],
                'event_datetime' => $event['start_datetime']
            ], 'QR code generated successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to generate QR code: ' . $e->getMessage(), 500);
        }
    }
    
    // Assign categories to event (admin only)
    public function assignCategories($params = []) {
        $this->requireRole(['admin', 'sub_admin']);
        
        try {
            $eventId = $params['id'] ?? null;
            $input = $this->getInput();
            
            if (!$eventId) {
                $this->error('Event ID is required', 400);
            }
            
            // TODO: Implement event categories
            // This would require EventCategory model and many-to-many relationship
            
            $this->success([
                'event_id' => $eventId,
                'categories' => $input['categories'] ?? [],
                'assigned_at' => date('Y-m-d H:i:s')
            ], 'Event categories assigned successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to assign categories: ' . $e->getMessage(), 500);
        }
    }
}
?>