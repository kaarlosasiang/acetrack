<?php
/**
 * Main Routes Configuration
 * Loads all modular route files to keep routes organized
 */

// Load Public Routes (No authentication required)
require_once CONFIG_PATH . '/routes/public.php';

// Load Authentication Routes
require_once CONFIG_PATH . '/routes/auth.php';

// Load User Profile and Personal Routes (Authentication required)
require_once CONFIG_PATH . '/routes/user.php';

// Load Organization Management Routes (Authentication + Tenant context required)
require_once CONFIG_PATH . '/routes/organization.php';

// Load Event Management Routes (Authentication + Tenant context required)
require_once CONFIG_PATH . '/routes/events.php';

// Load Attendance Management Routes (Authentication + Tenant context required)
require_once CONFIG_PATH . '/routes/attendance.php';

// Load News and Updates Routes (Authentication + Tenant context required)
require_once CONFIG_PATH . '/routes/news.php';

// Load Super Admin Routes (Authentication + Super Admin privileges required)
require_once CONFIG_PATH . '/routes/admin.php';
?>
