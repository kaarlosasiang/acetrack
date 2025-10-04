<?php
require_once 'BaseModel.php';

class NewsUpdate extends BaseModel {
    protected $table = 'news_updates';
    protected $tenantColumn = 'organization_id';
    protected $softDeletes = true;
    protected $fillable = [
        'organization_id', 'title', 'content', 'banner_url',
        'author_user_id', 'publish_datetime', 'is_pinned', 'status'
    ];
    
    // Get published news for an organization
    public function getPublishedNews($organizationId, $limit = 20, $offset = 0) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT nu.*, u.first_name as author_first_name, u.last_name as author_last_name
            FROM {$this->table} nu
            LEFT JOIN users u ON nu.author_user_id = u.id
            WHERE nu.organization_id = ? 
                AND nu.status = 'published' 
                AND nu.deleted_at IS NULL
                AND (nu.publish_datetime IS NULL OR nu.publish_datetime <= NOW())
            ORDER BY nu.is_pinned DESC, nu.publish_datetime DESC, nu.created_at DESC
            LIMIT ? OFFSET ?
        ";
        
        return $this->db->query($sql, [$organizationId, $limit, $offset]);
    }
    
    // Get pinned news for an organization
    public function getPinnedNews($organizationId) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT nu.*, u.first_name as author_first_name, u.last_name as author_last_name
            FROM {$this->table} nu
            LEFT JOIN users u ON nu.author_user_id = u.id
            WHERE nu.organization_id = ? 
                AND nu.status = 'published' 
                AND nu.is_pinned = 1
                AND nu.deleted_at IS NULL
                AND (nu.publish_datetime IS NULL OR nu.publish_datetime <= NOW())
            ORDER BY nu.publish_datetime DESC, nu.created_at DESC
        ";
        
        return $this->db->query($sql, [$organizationId]);
    }
    
    // Get draft news for an organization (admin view)
    public function getDraftNews($organizationId, $limit = 20, $offset = 0) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT nu.*, u.first_name as author_first_name, u.last_name as author_last_name
            FROM {$this->table} nu
            LEFT JOIN users u ON nu.author_user_id = u.id
            WHERE nu.organization_id = ? 
                AND nu.status = 'draft' 
                AND nu.deleted_at IS NULL
            ORDER BY nu.created_at DESC
            LIMIT ? OFFSET ?
        ";
        
        return $this->db->query($sql, [$organizationId, $limit, $offset]);
    }
    
    // Create news update
    public function createNews($data) {
        // Set default values
        if (!isset($data['status'])) {
            $data['status'] = 'draft';
        }
        
        if (!isset($data['is_pinned'])) {
            $data['is_pinned'] = false;
        }
        
        return $this->create($data);
    }
    
    // Publish news update
    public function publishNews($newsId, $publishDatetime = null) {
        $publishDatetime = $publishDatetime ?: date('Y-m-d H:i:s');
        
        return $this->update($newsId, [
            'status' => 'published',
            'publish_datetime' => $publishDatetime
        ]);
    }
    
    // Unpublish news update (archive it)
    public function archiveNews($newsId) {
        return $this->update($newsId, [
            'status' => 'archived',
            'is_pinned' => false
        ]);
    }
    
    // Pin/unpin news update
    public function togglePin($newsId, $isPinned = null) {
        $news = $this->find($newsId);
        
        if (!$news) {
            throw new Exception('News update not found');
        }
        
        // If not specified, toggle current state
        if ($isPinned === null) {
            $isPinned = !$news['is_pinned'];
        }
        
        return $this->update($newsId, [
            'is_pinned' => $isPinned ? 1 : 0
        ]);
    }
    
    // Search news updates
    public function searchNews($organizationId, $query, $status = 'published', $limit = 20) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT nu.*, u.first_name as author_first_name, u.last_name as author_last_name
            FROM {$this->table} nu
            LEFT JOIN users u ON nu.author_user_id = u.id
            WHERE nu.organization_id = ? 
                AND nu.status = ?
                AND nu.deleted_at IS NULL
                AND (nu.title LIKE ? OR nu.content LIKE ?)
            ORDER BY nu.is_pinned DESC, nu.publish_datetime DESC, nu.created_at DESC
            LIMIT ?
        ";
        
        $searchTerm = '%' . $query . '%';
        return $this->db->query($sql, [$organizationId, $status, $searchTerm, $searchTerm, $limit]);
    }
    
    // Get news statistics for organization
    public function getNewsStats($organizationId) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT 
                COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
                COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
                COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_count,
                COUNT(CASE WHEN is_pinned = 1 AND status = 'published' THEN 1 END) as pinned_count
            FROM {$this->table}
            WHERE organization_id = ? AND deleted_at IS NULL
        ";
        
        return $this->db->queryOne($sql, [$organizationId]);
    }
    
    // Get recent news activity
    public function getRecentActivity($organizationId, $days = 7, $limit = 20) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT nu.*, u.first_name as author_first_name, u.last_name as author_last_name
            FROM {$this->table} nu
            LEFT JOIN users u ON nu.author_user_id = u.id
            WHERE nu.organization_id = ? 
                AND nu.deleted_at IS NULL
                AND nu.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            ORDER BY nu.created_at DESC
            LIMIT ?
        ";
        
        return $this->db->query($sql, [$organizationId, $days, $limit]);
    }
    
    // Schedule news for future publishing
    public function scheduleNews($newsId, $publishDatetime) {
        return $this->update($newsId, [
            'status' => 'published',
            'publish_datetime' => $publishDatetime
        ]);
    }
    
    // Get scheduled news (not yet published)
    public function getScheduledNews($organizationId) {
        $this->setTenant($organizationId);
        
        $sql = "
            SELECT nu.*, u.first_name as author_first_name, u.last_name as author_last_name
            FROM {$this->table} nu
            LEFT JOIN users u ON nu.author_user_id = u.id
            WHERE nu.organization_id = ? 
                AND nu.status = 'published'
                AND nu.publish_datetime > NOW()
                AND nu.deleted_at IS NULL
            ORDER BY nu.publish_datetime ASC
        ";
        
        return $this->db->query($sql, [$organizationId]);
    }
    
    // Validate news data
    public function validateNewsData($data, $isUpdate = false) {
        $errors = [];
        
        if (!$isUpdate || isset($data['title'])) {
            if (empty($data['title'])) {
                $errors['title'] = 'Title is required';
            } elseif (strlen($data['title']) > 255) {
                $errors['title'] = 'Title must not exceed 255 characters';
            }
        }
        
        if (!$isUpdate || isset($data['content'])) {
            if (empty($data['content'])) {
                $errors['content'] = 'Content is required';
            }
        }
        
        if (isset($data['status']) && !in_array($data['status'], ['draft', 'published', 'archived'])) {
            $errors['status'] = 'Invalid status';
        }
        
        if (isset($data['publish_datetime']) && $data['publish_datetime']) {
            if (!strtotime($data['publish_datetime'])) {
                $errors['publish_datetime'] = 'Invalid publish datetime format';
            }
        }
        
        return $errors;
    }
}
?>