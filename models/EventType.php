<?php
class EventType extends Model {
    protected $table = 'event_types';
    protected $fillable = [
        'organization_id', 'name', 'description', 'color',
        'default_duration_minutes', 'requires_attendance', 'status'
    ];
    
    public function getByOrganization($organizationId) {
        return $this->where(['organization_id' => $organizationId, 'status' => 'active'], $organizationId);
    }
    
    public function getWithEventCount($organizationId) {
        $sql = "SELECT et.*, 
                       COUNT(e.id) as event_count,
                       COUNT(CASE WHEN e.status = 'published' THEN 1 END) as published_count,
                       COUNT(CASE WHEN e.start_datetime > NOW() THEN 1 END) as upcoming_count
                FROM event_types et
                LEFT JOIN events e ON et.id = e.event_type_id
                WHERE et.organization_id = :organization_id AND et.status = 'active'
                GROUP BY et.id
                ORDER BY et.name ASC";
        
        return $this->db->fetchAll($sql, ['organization_id' => $organizationId]);
    }
    
    public function createDefault($organizationId) {
        $defaultTypes = [
            [
                'name' => 'General Meeting',
                'description' => 'Regular organizational meetings',
                'color' => '#3498db',
                'default_duration_minutes' => 120,
                'requires_attendance' => true
            ],
            [
                'name' => 'Workshop',
                'description' => 'Educational workshops and training sessions',
                'color' => '#e74c3c',
                'default_duration_minutes' => 180,
                'requires_attendance' => true
            ],
            [
                'name' => 'Social Event',
                'description' => 'Social gatherings and networking events',
                'color' => '#f39c12',
                'default_duration_minutes' => 240,
                'requires_attendance' => false
            ],
            [
                'name' => 'Conference',
                'description' => 'Academic conferences and symposiums',
                'color' => '#9b59b6',
                'default_duration_minutes' => 480,
                'requires_attendance' => true
            ],
            [
                'name' => 'Seminar',
                'description' => 'Educational seminars',
                'color' => '#2ecc71',
                'default_duration_minutes' => 150,
                'requires_attendance' => true
            ]
        ];
        
        $created = [];
        foreach ($defaultTypes as $type) {
            $type['organization_id'] = $organizationId;
            $type['status'] = 'active';
            $created[] = $this->create($type, $organizationId);
        }
        
        return $created;
    }
}

