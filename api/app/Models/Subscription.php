<?php
require_once 'BaseModel.php';

class Subscription extends BaseModel {
    protected $table = 'subscriptions';
    protected $tenantColumn = null; // Not tenant-scoped as it's managed by super admin
    protected $fillable = [
        'organization_id', 'start_date', 'end_date', 'status',
        'receipt_reference', 'receipt_image_url', 'amount',
        'verified_by_user_id', 'verified_at', 'notes'
    ];
    
    // Get subscription for organization
    public function getOrganizationSubscription($organizationId) {
        return $this->db->queryOne(
            "SELECT * FROM {$this->table} WHERE organization_id = ? ORDER BY end_date DESC LIMIT 1",
            [$organizationId]
        );
    }
    
    // Get current active subscription for organization
    public function getCurrentSubscription($organizationId) {
        $sql = "
            SELECT * FROM {$this->table} 
            WHERE organization_id = ? 
                AND status = 'active' 
                AND start_date <= CURDATE() 
                AND end_date >= CURDATE()
            ORDER BY end_date DESC 
            LIMIT 1
        ";
        
        return $this->db->queryOne($sql, [$organizationId]);
    }
    
    // Check if organization has active subscription
    public function isSubscriptionActive($organizationId) {
        $subscription = $this->getCurrentSubscription($organizationId);
        return $subscription !== null;
    }
    
    // Get subscription history for organization
    public function getSubscriptionHistory($organizationId) {
        $sql = "
            SELECT s.*, u.first_name as verified_by_first_name, u.last_name as verified_by_last_name
            FROM {$this->table} s
            LEFT JOIN users u ON s.verified_by_user_id = u.id
            WHERE s.organization_id = ?
            ORDER BY s.created_at DESC
        ";
        
        return $this->db->query($sql, [$organizationId]);
    }
    
    // Create new subscription
    public function createSubscription($data) {
        // Set default status
        if (!isset($data['status'])) {
            $data['status'] = 'pending_verification';
        }
        
        return $this->create($data);
    }
    
    // Verify subscription (super admin action)
    public function verifySubscription($subscriptionId, $verifiedBy, $notes = null) {
        return $this->update($subscriptionId, [
            'status' => 'active',
            'verified_by_user_id' => $verifiedBy,
            'verified_at' => date('Y-m-d H:i:s'),
            'notes' => $notes
        ]);
    }
    
    // Reject subscription (super admin action)
    public function rejectSubscription($subscriptionId, $verifiedBy, $notes = null) {
        return $this->update($subscriptionId, [
            'status' => 'rejected',
            'verified_by_user_id' => $verifiedBy,
            'verified_at' => date('Y-m-d H:i:s'),
            'notes' => $notes
        ]);
    }
    
    // Expire subscription (automatic or manual)
    public function expireSubscription($subscriptionId, $notes = null) {
        return $this->update($subscriptionId, [
            'status' => 'expired',
            'notes' => $notes
        ]);
    }
    
    // Get pending subscriptions (for super admin review)
    public function getPendingSubscriptions($limit = 50) {
        $sql = "
            SELECT s.*, o.name as organization_name, o.status as organization_status
            FROM {$this->table} s
            INNER JOIN organizations o ON s.organization_id = o.id
            WHERE s.status = 'pending_verification'
            ORDER BY s.created_at ASC
            LIMIT ?
        ";
        
        return $this->db->query($sql, [$limit]);
    }
    
    // Get expiring subscriptions (for alerts)
    public function getExpiringSubscriptions($days = 30) {
        $sql = "
            SELECT s.*, o.name as organization_name, o.status as organization_status
            FROM {$this->table} s
            INNER JOIN organizations o ON s.organization_id = o.id
            WHERE s.status = 'active'
                AND s.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
            ORDER BY s.end_date ASC
        ";
        
        return $this->db->query($sql, [$days]);
    }
    
    // Get expired subscriptions
    public function getExpiredSubscriptions($limit = 50) {
        $sql = "
            SELECT s.*, o.name as organization_name
            FROM {$this->table} s
            INNER JOIN organizations o ON s.organization_id = o.id
            WHERE s.status = 'active' 
                AND s.end_date < CURDATE()
            ORDER BY s.end_date ASC
            LIMIT ?
        ";
        
        return $this->db->query($sql, [$limit]);
    }
    
    // Extend subscription
    public function extendSubscription($organizationId, $newEndDate, $amount = null, $receiptReference = null, $receiptImageUrl = null) {
        $currentSubscription = $this->getCurrentSubscription($organizationId);
        
        if (!$currentSubscription) {
            throw new Exception('No active subscription found to extend');
        }
        
        // Create new subscription record for extension
        $extensionData = [
            'organization_id' => $organizationId,
            'start_date' => $currentSubscription['end_date'], // Start from current end date
            'end_date' => $newEndDate,
            'status' => 'pending_verification',
            'amount' => $amount,
            'receipt_reference' => $receiptReference,
            'receipt_image_url' => $receiptImageUrl,
            'notes' => 'Subscription extension'
        ];
        
        return $this->create($extensionData);
    }
    
    // Get subscription statistics
    public function getSubscriptionStats() {
        $sql = "
            SELECT 
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
                COUNT(CASE WHEN status = 'pending_verification' THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_count,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
                SUM(CASE WHEN status = 'active' THEN amount END) as total_active_revenue
            FROM {$this->table}
        ";
        
        return $this->db->queryOne($sql);
    }
    
    // Auto-expire subscriptions (to be run by cron job)
    public function autoExpireSubscriptions() {
        $sql = "
            UPDATE {$this->table} 
            SET status = 'expired', updated_at = NOW()
            WHERE status = 'active' AND end_date < CURDATE()
        ";
        
        $result = $this->db->execute($sql);
        return $result['affected_rows'];
    }
    
    // Get revenue report
    public function getRevenueReport($startDate = null, $endDate = null) {
        $sql = "
            SELECT 
                DATE_FORMAT(verified_at, '%Y-%m') as month,
                COUNT(*) as subscription_count,
                SUM(amount) as total_revenue,
                AVG(amount) as average_amount
            FROM {$this->table}
            WHERE status IN ('active', 'expired') 
                AND verified_at IS NOT NULL
        ";
        
        $params = [];
        
        if ($startDate && $endDate) {
            $sql .= " AND verified_at BETWEEN ? AND ?";
            $params[] = $startDate;
            $params[] = $endDate;
        }
        
        $sql .= " GROUP BY DATE_FORMAT(verified_at, '%Y-%m') ORDER BY month DESC";
        
        return $this->db->query($sql, $params);
    }
    
    // Validate subscription data
    public function validateSubscriptionData($data, $isUpdate = false) {
        $errors = [];
        
        if (!$isUpdate || isset($data['organization_id'])) {
            if (empty($data['organization_id'])) {
                $errors['organization_id'] = 'Organization is required';
            } else {
                // Check if organization exists
                $orgModel = new Organization();
                $org = $orgModel->find($data['organization_id']);
                if (!$org) {
                    $errors['organization_id'] = 'Organization not found';
                }
            }
        }
        
        if (!$isUpdate || isset($data['start_date'])) {
            if (empty($data['start_date'])) {
                $errors['start_date'] = 'Start date is required';
            } elseif (!strtotime($data['start_date'])) {
                $errors['start_date'] = 'Invalid start date format';
            }
        }
        
        if (!$isUpdate || isset($data['end_date'])) {
            if (empty($data['end_date'])) {
                $errors['end_date'] = 'End date is required';
            } elseif (!strtotime($data['end_date'])) {
                $errors['end_date'] = 'Invalid end date format';
            } elseif (isset($data['start_date']) && strtotime($data['end_date']) <= strtotime($data['start_date'])) {
                $errors['end_date'] = 'End date must be after start date';
            }
        }
        
        if (isset($data['status']) && !in_array($data['status'], ['active', 'expired', 'pending_verification', 'rejected'])) {
            $errors['status'] = 'Invalid status';
        }
        
        if (isset($data['amount']) && $data['amount'] !== null) {
            if (!is_numeric($data['amount']) || $data['amount'] < 0) {
                $errors['amount'] = 'Amount must be a positive number';
            }
        }
        
        return $errors;
    }
}
?>