<?php
class EventController extends Controller {
    private $eventModel;
    private $eventTypeModel;
    
    public function __construct() {
        parent::__construct();
        $this->eventModel = new Event();
        $this->eventTypeModel = new EventType();
    }
    
    public function index($params = []) {
        try {
            $organizationId = $this->getCurrentTenant();
            $pagination = $this->getPaginationParams();
            
            $events = $this->eventModel->getAllWithDetails($organizationId, $pagination['limit'], $pagination['offset']);
            $total = count($events);
            $totalPages = ceil($total / $pagination['limit']);
            
            $this->jsonResponse([
                'success' => true,
                'data' => $events,
                'pagination' => [
                    'total' => $total,
                    'pages' => $totalPages,
                    'limit' => $pagination['limit'],
                    'page' => $pagination['page'],
                ]
            ]);
        } catch (Exception $e) {
            $this->errorResponse('Error fetching events: ' . $e->getMessage(), 500);
        }
    }
    
    public function create($params = []) {
        $input = $this->getInput();
        $this->validateRequired($input, [
            'event_type_id', 'title', 'start_datetime', 'end_datetime', 'created_by'
        ]);
        
        try {
            $organizationId = $this->getCurrentTenant();
            $input['organization_id'] = $organizationId;
            $input['status'] = 'draft';  // Default status set to draft
            
            // Generate unique attendance code
            $event = new Event();
            $input['attendance_code'] = $event->generateAttendanceCode();
            $input['qr_code_data'] = $event->generateQRCode($input['attendance_code']);
            
            $newEvent = $this->eventModel->create($input, $organizationId);
            
            $this->successResponse($newEvent, 'Event created successfully', 201);
        } catch (Exception $e) {
            $this->errorResponse('Failed to create event: ' . $e->getMessage(), 400);
        }
    }
    
    public function show($params = []) {
        $eventId = $params['id'] ?? null;
        if (!$eventId) {
            $this->errorResponse('Event ID required', 400);
        }
        
        try {
            $organizationId = $this->getCurrentTenant();
            $event = $this->eventModel->getWithEventType($eventId, $organizationId);
            if (!$event) {
                $this->errorResponse('Event not found', 404);
            }
            
            $this->successResponse($event);
        } catch (Exception $e) {
            $this->errorResponse('Error fetching event: ' . $e->getMessage(), 500);
        }
    }
    
    public function update($params = []) {
        $eventId = $params['id'] ?? null;
        if (!$eventId) {
            $this->errorResponse('Event ID required', 400);
        }
        
        try {
            $input = $this->getInput();
            $organizationId = $this->getCurrentTenant();
            
            $updatedEvent = $this->eventModel->update($eventId, $input, $organizationId);
            if (!$updatedEvent) {
                $this->errorResponse('Event not found', 404);
            }
            
            $this->successResponse($updatedEvent, 'Event updated successfully');
        } catch (Exception $e) {
            $this->errorResponse('Failed to update event: ' . $e->getMessage(), 400);
        }
    }
    
    public function destroy($params = []) {
        $eventId = $params['id'] ?? null;
        if (!$eventId) {
            $this->errorResponse('Event ID required', 400);
        }
        
        try {
            $organizationId = $this->getCurrentTenant();
            $deleted = $this->eventModel->delete($eventId, $organizationId);
            if (!$deleted) {
                $this->errorResponse('Event not found', 404);
            }
            
            $this->successResponse(null, 'Event deleted successfully');
        } catch (Exception $e) {
            $this->errorResponse('Failed to delete event: ' . $e->getMessage(), 400);
        }
    }
    
    public function types($params = []) {
        try {
            $organizationId = $this->getCurrentTenant();
            $types = $this->eventTypeModel->getWithEventCount($organizationId);
            
            $this->successResponse($types);
        } catch (Exception $e) {
            $this->errorResponse('Failed to fetch event types: ' . $e->getMessage(), 500);
        }
    }
}

