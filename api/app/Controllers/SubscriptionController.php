<?php
require_once 'BaseController.php';

class SubscriptionController extends BaseController {
    
    // Get current organization subscription (admin only)
    public function show($params = []) {
        $this->requireRole(['admin']);
        
        try {
            $subscriptionModel = new Subscription();
            $currentSubscription = $subscriptionModel->getCurrentSubscription($this->currentTenantId);
            
            if (!$currentSubscription) {
                // Get latest subscription (even if expired)
                $latestSubscription = $subscriptionModel->getOrganizationSubscription($this->currentTenantId);
                
                $this->success([
                    'current_subscription' => null,
                    'latest_subscription' => $latestSubscription,
                    'is_active' => false,
                    'status' => $latestSubscription ? $latestSubscription['status'] : 'no_subscription'
                ], 'Subscription information retrieved');
            } else {
                $this->success([
                    'current_subscription' => $currentSubscription,
                    'latest_subscription' => $currentSubscription,
                    'is_active' => true,
                    'status' => 'active',
                    'days_until_expiry' => $this->getDaysUntilExpiry($currentSubscription['end_date'])
                ], 'Active subscription found');
            }
            
        } catch (Exception $e) {
            $this->error('Failed to get subscription: ' . $e->getMessage(), 500);
        }
    }
    
    // Get subscription history (admin only)
    public function history($params = []) {
        $this->requireRole(['admin']);
        
        try {
            $subscriptionModel = new Subscription();
            $history = $subscriptionModel->getSubscriptionHistory($this->currentTenantId);
            
            $this->success([
                'subscription_history' => $history,
                'total_count' => count($history)
            ], 'Subscription history retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get subscription history: ' . $e->getMessage(), 500);
        }
    }
    
    // Create new subscription or renewal (admin only)
    public function renew($params = []) {
        $this->requireRole(['admin']);
        
        try {
            $input = $this->getInput();
            
            // Validation rules
            $rules = [
                'start_date' => 'required|date',
                'end_date' => 'required|date',
                'amount' => 'required|numeric|min:0',
                'receipt_reference' => 'max:255',
                'receipt_image_url' => 'max:255'
            ];
            
            $validation = Validator::make($input, $rules);
            
            if (!$validation['valid']) {
                $this->validationError($validation['errors']);
            }
            
            $subscriptionModel = new Subscription();
            
            // Additional validation
            $subscriptionData = [
                'organization_id' => $this->currentTenantId,
                'start_date' => $input['start_date'],
                'end_date' => $input['end_date'],
                'amount' => $input['amount'],
                'receipt_reference' => $input['receipt_reference'] ?? null,
                'receipt_image_url' => $input['receipt_image_url'] ?? null
            ];
            
            $validationErrors = $subscriptionModel->validateSubscriptionData($subscriptionData);
            
            if (!empty($validationErrors)) {
                $this->validationError($validationErrors);
            }
            
            // Create subscription
            $subscription = $subscriptionModel->createSubscription($subscriptionData);
            
            if (!$subscription) {
                $this->error('Failed to create subscription');
            }
            
            // Send email notification to admin about new subscription
            $this->sendSubscriptionNotification($subscription, 'created');
            
            // Log the subscription creation
            $this->logAudit('subscription_created', 'Subscription', $subscription['id'], null, [
                'amount' => $subscription['amount'],
                'period' => $subscription['start_date'] . ' to ' . $subscription['end_date']
            ]);
            
            $this->success([
                'subscription' => $subscription,
                'status' => 'pending_verification',
                'message' => 'Subscription created and pending verification by system administrators.'
            ], 'Subscription renewal submitted successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to create subscription: ' . $e->getMessage(), 500);
        }
    }
    
    // Upload receipt for subscription (admin only)
    public function uploadReceipt($params = []) {
        $this->requireRole(['admin']);
        
        try {
            $subscriptionId = $params['id'] ?? null;
            
            if (!$subscriptionId) {
                $this->error('Subscription ID is required', 400);
            }
            
            if (!isset($_FILES['receipt'])) {
                $this->error('No receipt file provided', 400);
            }
            
            // Verify subscription exists and belongs to organization
            $subscriptionModel = new Subscription();
            $subscription = $subscriptionModel->find($subscriptionId);
            
            if (!$subscription || $subscription['organization_id'] != $this->currentTenantId) {
                $this->error('Subscription not found', 404);
            }
            
            // Upload the receipt
            $uploadResult = $this->uploadFile('receipt', array_merge(ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES), MAX_UPLOAD_SIZE);
            
            if (!$uploadResult) {
                $this->error('Failed to upload receipt');
            }
            
            // Update subscription with receipt info
            $updated = $subscriptionModel->update($subscriptionId, [
                'receipt_image_url' => $uploadResult['url'],
                'receipt_reference' => $this->input('receipt_reference', $uploadResult['filename'])
            ]);
            
            if (!$updated) {
                $this->error('Failed to update subscription with receipt');
            }
            
            // Log the receipt upload
            $this->logAudit('subscription_receipt_uploaded', 'Subscription', $subscriptionId, null, [
                'filename' => $uploadResult['filename'],
                'url' => $uploadResult['url']
            ]);
            
            $this->success([
                'receipt_url' => $uploadResult['url'],
                'receipt_reference' => $uploadResult['filename'],
                'upload_info' => $uploadResult
            ], 'Receipt uploaded successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to upload receipt: ' . $e->getMessage(), 500);
        }
    }
    
    // Super admin endpoints for managing all subscriptions
    
    // Get pending subscriptions (super admin only)
    public function pending($params = []) {
        $this->requireSuperAdmin();
        
        try {
            $limit = min(100, max(1, (int)($this->input('limit', 50))));
            
            $subscriptionModel = new Subscription();
            $pendingSubscriptions = $subscriptionModel->getPendingSubscriptions($limit);
            
            $this->success([
                'pending_subscriptions' => $pendingSubscriptions,
                'count' => count($pendingSubscriptions)
            ], 'Pending subscriptions retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get pending subscriptions: ' . $e->getMessage(), 500);
        }
    }
    
    // Verify subscription (super admin only)
    public function verify($params = []) {
        $this->requireSuperAdmin();
        
        try {
            $subscriptionId = $params['id'] ?? null;
            $input = $this->getInput();
            
            if (!$subscriptionId) {
                $this->error('Subscription ID is required', 400);
            }
            
            $subscriptionModel = new Subscription();
            $subscription = $subscriptionModel->find($subscriptionId);
            
            if (!$subscription) {
                $this->error('Subscription not found', 404);
            }
            
            if ($subscription['status'] !== 'pending_verification') {
                $this->error('Subscription is not pending verification', 400);
            }
            
            // Verify subscription
            $verified = $subscriptionModel->verifySubscription(
                $subscriptionId, 
                $this->currentUser['id'], 
                $input['notes'] ?? null
            );
            
            if (!$verified) {
                $this->error('Failed to verify subscription');
            }
            
            // Send verification email to organization
            $this->sendSubscriptionNotification($subscription, 'verified');
            
            // Log the verification
            $this->logAudit('subscription_verified', 'Subscription', $subscriptionId, 
                ['status' => 'pending_verification'], 
                ['status' => 'active', 'verified_by' => $this->currentUser['id']]
            );
            
            $this->success(null, 'Subscription verified successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to verify subscription: ' . $e->getMessage(), 500);
        }
    }
    
    // Reject subscription (super admin only)
    public function reject($params = []) {
        $this->requireSuperAdmin();
        
        try {
            $subscriptionId = $params['id'] ?? null;
            $input = $this->getInput();
            
            if (!$subscriptionId) {
                $this->error('Subscription ID is required', 400);
            }
            
            $notes = $input['notes'] ?? null;
            if (!$notes) {
                $this->error('Rejection reason (notes) is required', 400);
            }
            
            $subscriptionModel = new Subscription();
            $subscription = $subscriptionModel->find($subscriptionId);
            
            if (!$subscription) {
                $this->error('Subscription not found', 404);
            }
            
            if ($subscription['status'] !== 'pending_verification') {
                $this->error('Subscription is not pending verification', 400);
            }
            
            // Reject subscription
            $rejected = $subscriptionModel->rejectSubscription(
                $subscriptionId, 
                $this->currentUser['id'], 
                $notes
            );
            
            if (!$rejected) {
                $this->error('Failed to reject subscription');
            }
            
            // Send rejection email to organization
            $this->sendSubscriptionNotification($subscription, 'rejected', $notes);
            
            // Log the rejection
            $this->logAudit('subscription_rejected', 'Subscription', $subscriptionId, 
                ['status' => 'pending_verification'], 
                ['status' => 'rejected', 'rejected_by' => $this->currentUser['id'], 'reason' => $notes]
            );
            
            $this->success(null, 'Subscription rejected');
            
        } catch (Exception $e) {
            $this->error('Failed to reject subscription: ' . $e->getMessage(), 500);
        }
    }
    
    // Get subscription statistics (super admin only)
    public function stats($params = []) {
        $this->requireSuperAdmin();
        
        try {
            $subscriptionModel = new Subscription();
            $stats = $subscriptionModel->getSubscriptionStats();
            
            // Get expiring subscriptions
            $expiringSubscriptions = $subscriptionModel->getExpiringSubscriptions(30);
            $expiredSubscriptions = $subscriptionModel->getExpiredSubscriptions(10);
            
            $this->success([
                'statistics' => $stats,
                'expiring_soon' => $expiringSubscriptions,
                'recently_expired' => $expiredSubscriptions,
                'summary' => [
                    'active_count' => (int)$stats['active_count'],
                    'pending_count' => (int)$stats['pending_count'],
                    'expired_count' => (int)$stats['expired_count'],
                    'rejected_count' => (int)$stats['rejected_count'],
                    'total_active_revenue' => (float)$stats['total_active_revenue']
                ]
            ], 'Subscription statistics retrieved successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to get subscription stats: ' . $e->getMessage(), 500);
        }
    }
    
    // Get revenue report (super admin only)
    public function revenue($params = []) {
        $this->requireSuperAdmin();
        
        try {
            $startDate = $this->input('start_date');
            $endDate = $this->input('end_date');
            
            $subscriptionModel = new Subscription();
            $report = $subscriptionModel->getRevenueReport($startDate, $endDate);
            
            // Calculate totals
            $totalRevenue = 0;
            $totalSubscriptions = 0;
            
            foreach ($report as $row) {
                $totalRevenue += $row['total_revenue'];
                $totalSubscriptions += $row['subscription_count'];
            }
            
            $this->success([
                'revenue_report' => $report,
                'summary' => [
                    'total_revenue' => $totalRevenue,
                    'total_subscriptions' => $totalSubscriptions,
                    'average_subscription_value' => $totalSubscriptions > 0 ? $totalRevenue / $totalSubscriptions : 0,
                    'period' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate
                    ]
                ]
            ], 'Revenue report generated successfully');
            
        } catch (Exception $e) {
            $this->error('Failed to generate revenue report: ' . $e->getMessage(), 500);
        }
    }
    
    // Auto-expire subscriptions (system maintenance endpoint)
    public function autoExpire($params = []) {
        $this->requireSuperAdmin();
        
        try {
            $subscriptionModel = new Subscription();
            $expiredCount = $subscriptionModel->autoExpireSubscriptions();
            
            if ($expiredCount > 0) {
                $this->logAudit('subscriptions_auto_expired', 'System', null, null, [
                    'expired_count' => $expiredCount
                ]);
            }
            
            $this->success([
                'expired_count' => $expiredCount,
                'message' => "{$expiredCount} subscriptions were automatically expired"
            ], 'Auto-expiration completed');
            
        } catch (Exception $e) {
            $this->error('Failed to auto-expire subscriptions: ' . $e->getMessage(), 500);
        }
    }
    
    // Private helper methods
    
    private function getDaysUntilExpiry($endDate) {
        $now = new DateTime();
        $expiry = new DateTime($endDate);
        $diff = $now->diff($expiry);
        
        return $diff->days * ($diff->invert ? -1 : 1);
    }
    
    private function sendSubscriptionNotification($subscription, $action, $notes = null) {
        try {
            // Get organization details
            $orgModel = new Organization();
            $organization = $orgModel->find($subscription['organization_id']);
            
            if (!$organization) {
                return;
            }
            
            // Get admin users for the organization
            $userModel = new User();
            $adminUsers = $userModel->getOrganizationAdmins($subscription['organization_id']);
            
            // Load email helper
            require_once APP_PATH . '/Helpers/EmailHelper.php';
            $emailHelper = new EmailHelper();
            
            foreach ($adminUsers as $admin) {
                switch ($action) {
                    case 'created':
                        // Could send acknowledgment email
                        break;
                    case 'verified':
                        // Send subscription approved email
                        $emailHelper->sendSubscriptionApprovedEmail(
                            $admin['email'],
                            $admin['first_name'] . ' ' . $admin['last_name'],
                            $organization['name'],
                            $subscription
                        );
                        break;
                    case 'rejected':
                        // Send subscription rejected email
                        $emailHelper->sendSubscriptionRejectedEmail(
                            $admin['email'],
                            $admin['first_name'] . ' ' . $admin['last_name'],
                            $organization['name'],
                            $subscription,
                            $notes
                        );
                        break;
                }
            }
            
        } catch (Exception $e) {
            // Log but don't fail the main operation
            $this->logger->warning('Subscription notification email failed', [
                'subscription_id' => $subscription['id'],
                'action' => $action,
                'error' => $e->getMessage()
            ]);
        }
    }
}
?>