<?php
class Notification extends Model {
    protected $table = 'notifications';
    protected $fillable = [
        'organization_id', 'user_id', 'type', 'title', 'message', 'data',
        'is_read', 'read_at', 'sent_via', 'sent_at'
    ];
    
    public function createNotification($organizationId, $type, $title, $message, $userId = null, $data = null) {
        return $this->create([
            'organization_id' => $organizationId,
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data ? json_encode($data) : null,
            'sent_via' => 'in_app'
        ]);
    }
    
    public function markAsRead($notificationId, $userId) {
        return $this->db->query(
            "UPDATE notifications 
             SET is_read = TRUE, read_at = NOW() 
             WHERE id = :id AND user_id = :user_id",
            ['id' => $notificationId, 'user_id' => $userId]
        );
    }
    
    public function getUserNotifications($userId, $limit = 20, $unreadOnly = false) {
        $sql = "SELECT * FROM notifications WHERE user_id = :user_id";
        $params = ['user_id' => $userId];
        
        if ($unreadOnly) {
            $sql .= " AND is_read = FALSE";
        }
        
        $sql .= " ORDER BY created_at DESC LIMIT :limit";
        $params['limit'] = $limit;
        
        $notifications = $this->db->fetchAll($sql, $params);
        
        // Decode JSON data
        foreach ($notifications as &$notification) {
            if ($notification['data']) {
                $notification['data'] = json_decode($notification['data'], true);
            }
        }
        
        return $notifications;
    }
    
    public function getOrganizationNotifications($organizationId, $limit = 20) {
        $sql = "SELECT * FROM notifications 
                WHERE organization_id = :organization_id AND user_id IS NULL
                ORDER BY created_at DESC LIMIT :limit";
        
        $notifications = $this->db->fetchAll($sql, [
            'organization_id' => $organizationId,
            'limit' => $limit
        ]);
        
        // Decode JSON data
        foreach ($notifications as &$notification) {
            if ($notification['data']) {
                $notification['data'] = json_decode($notification['data'], true);
            }
        }
        
        return $notifications;
    }
    
    public function notifyStudentApproval($studentId, $organizationId) {
        return $this->createNotification(
            $organizationId,
            'registration_approval',
            'Registration Approved',
            'Your registration has been approved. You can now attend events and update your profile.',
            $studentId
        );
    }
    
    public function notifyEventAlert($organizationId, $eventId, $eventTitle, $userId = null) {
        $message = "New event: {$eventTitle}. Don't miss out!";
        
        return $this->createNotification(
            $organizationId,
            'event_alert',
            'New Event Available',
            $message,
            $userId,
            ['event_id' => $eventId]
        );
    }
    
    public function notifySubscriptionExpiry($organizationId, $expiryDate) {
        $message = "Your organization subscription will expire on {$expiryDate}. Please renew to continue using the system.";
        
        return $this->createNotification(
            $organizationId,
            'subscription_expiry',
            'Subscription Expiring Soon',
            $message
        );
    }
}
