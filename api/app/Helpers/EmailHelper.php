<?php
require_once 'Logger.php';
require_once 'EnvLoader.php';

class EmailHelper {
    private $logger;
    private $smtpConfig;
    private $fromEmail;
    private $fromName;
    private $templates;
    
    public function __construct() {
        $this->logger = new Logger();
        $this->loadConfig();
        $this->loadTemplates();
    }
    
    // Load email configuration
    private function loadConfig() {
        // Email configuration - load from environment variables
        $this->smtpConfig = [
            'host' => EnvLoader::get('SMTP_HOST', 'smtp.gmail.com'),
            'port' => EnvLoader::get('SMTP_PORT', 587),
            'username' => EnvLoader::get('SMTP_USERNAME', 'kaarloruy.sasiang@gmail.com'),
            'password' => EnvLoader::get('SMTP_PASSWORD', ''),
            'encryption' => EnvLoader::get('SMTP_ENCRYPTION', 'tls'),
            'auth' => true
        ];
        
        // Always use kaarloruy.sasiang@gmail.com as FROM_EMAIL
        $this->fromEmail = 'kaarloruy.sasiang@gmail.com';
        $this->fromName = EnvLoader::get('FROM_NAME', 'AceTrack Attendance System');
    }
    
    // Load email templates
    private function loadTemplates() {
        $this->templates = [
            'verification' => [
                'subject' => 'Verify Your AceTrack Account',
                'template' => 'email_verification'
            ],
            'password_reset' => [
                'subject' => 'Reset Your AceTrack Password',
                'template' => 'password_reset'
            ],
            'welcome' => [
                'subject' => 'Welcome to AceTrack!',
                'template' => 'welcome'
            ],
            'membership_approved' => [
                'subject' => 'Membership Approved - {{organization_name}}',
                'template' => 'membership_approved'
            ],
            'event_reminder' => [
                'subject' => 'Event Reminder: {{event_name}}',
                'template' => 'event_reminder'
            ],
            'attendance_summary' => [
                'subject' => 'Attendance Summary - {{event_name}}',
                'template' => 'attendance_summary'
            ],
            'subscription_approved' => [
                'subject' => 'Subscription Approved - {{organization_name}}',
                'template' => 'subscription_approved'
            ],
            'subscription_rejected' => [
                'subject' => 'Subscription Rejected - {{organization_name}}',
                'template' => 'subscription_rejected'
            ]
        ];
    }
    
    // Send verification email
    public function sendVerificationEmail($email, $name, $verificationToken) {
        try {
            $verificationUrl = $this->getBaseUrl() . "/verify-email?token={$verificationToken}";
            
            $variables = [
                'name' => $name,
                'email' => $email,
                'verification_url' => $verificationUrl,
                'verification_token' => $verificationToken,
                'app_name' => APP_NAME,
                'expires_in' => '24 hours'
            ];
            
            $result = $this->sendTemplateEmail($email, $name, 'verification', $variables);
            
            if ($result['success']) {
                $this->logger->info('Verification Email Sent', [
                    'email' => $email,
                    'token' => substr($verificationToken, 0, 8) . '...'
                ]);
            }
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error('Verification Email Failed', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    // Send password reset email
    public function sendPasswordResetEmail($email, $name, $resetToken) {
        try {
            $resetUrl = $this->getBaseUrl() . "/reset-password?token={$resetToken}";
            
            $variables = [
                'name' => $name,
                'email' => $email,
                'reset_url' => $resetUrl,
                'reset_token' => $resetToken,
                'app_name' => APP_NAME,
                'expires_in' => '1 hour'
            ];
            
            $result = $this->sendTemplateEmail($email, $name, 'password_reset', $variables);
            
            if ($result['success']) {
                $this->logger->info('Password Reset Email Sent', [
                    'email' => $email,
                    'token' => substr($resetToken, 0, 8) . '...'
                ]);
            }
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error('Password Reset Email Failed', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    // Send welcome email
    public function sendWelcomeEmail($email, $name, $organizationName = null) {
        try {
            $variables = [
                'name' => $name,
                'email' => $email,
                'organization_name' => $organizationName,
                'app_name' => APP_NAME,
                'dashboard_url' => $this->getBaseUrl() . '/dashboard',
                'support_email' => $this->fromEmail
            ];
            
            $result = $this->sendTemplateEmail($email, $name, 'welcome', $variables);
            
            if ($result['success']) {
                $this->logger->info('Welcome Email Sent', ['email' => $email]);
            }
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error('Welcome Email Failed', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    // Send membership approval notification
    public function sendMembershipApprovalEmail($email, $name, $organizationName, $role = 'member') {
        try {
            $variables = [
                'name' => $name,
                'organization_name' => $organizationName,
                'role' => $role,
                'app_name' => APP_NAME,
                'dashboard_url' => $this->getBaseUrl() . '/dashboard'
            ];
            
            $result = $this->sendTemplateEmail($email, $name, 'membership_approved', $variables);
            
            if ($result['success']) {
                $this->logger->info('Membership Approval Email Sent', [
                    'email' => $email,
                    'organization' => $organizationName
                ]);
            }
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error('Membership Approval Email Failed', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    // Send event reminder
    public function sendEventReminderEmail($email, $name, $eventData) {
        try {
            $variables = [
                'name' => $name,
                'event_name' => $eventData['name'],
                'event_description' => $eventData['description'],
                'event_datetime' => date('F j, Y \a\t g:i A', strtotime($eventData['start_datetime'])),
                'event_location' => $eventData['location'],
                'organization_name' => $eventData['organization_name'] ?? 'Your Organization',
                'app_name' => APP_NAME
            ];
            
            $result = $this->sendTemplateEmail($email, $name, 'event_reminder', $variables);
            
            if ($result['success']) {
                $this->logger->info('Event Reminder Email Sent', [
                    'email' => $email,
                    'event_id' => $eventData['id'] ?? null
                ]);
            }
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error('Event Reminder Email Failed', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    // Send attendance summary to event organizers
    public function sendAttendanceSummaryEmail($email, $name, $eventData, $attendanceStats) {
        try {
            $variables = [
                'name' => $name,
                'event_name' => $eventData['name'],
                'event_date' => date('F j, Y', strtotime($eventData['start_datetime'])),
                'total_registered' => $attendanceStats['total_registered'] ?? 0,
                'total_checked_in' => $attendanceStats['total_checked_in'] ?? 0,
                'total_checked_out' => $attendanceStats['total_checked_out'] ?? 0,
                'attendance_rate' => $attendanceStats['attendance_rate'] ?? '0%',
                'organization_name' => $eventData['organization_name'] ?? 'Your Organization',
                'app_name' => APP_NAME
            ];
            
            $result = $this->sendTemplateEmail($email, $name, 'attendance_summary', $variables);
            
            if ($result['success']) {
                $this->logger->info('Attendance Summary Email Sent', [
                    'email' => $email,
                    'event_id' => $eventData['id'] ?? null
                ]);
            }
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error('Attendance Summary Email Failed', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    // Send subscription approved email
    public function sendSubscriptionApprovedEmail($email, $name, $organizationName, $subscription) {
        try {
            $variables = [
                'name' => $name,
                'organization_name' => $organizationName,
                'subscription_start' => date('F j, Y', strtotime($subscription['start_date'])),
                'subscription_end' => date('F j, Y', strtotime($subscription['end_date'])),
                'amount' => number_format($subscription['amount'], 2),
                'app_name' => APP_NAME,
                'dashboard_url' => $this->getBaseUrl() . '/dashboard'
            ];
            
            $result = $this->sendTemplateEmail($email, $name, 'subscription_approved', $variables);
            
            if ($result['success']) {
                $this->logger->info('Subscription Approved Email Sent', [
                    'email' => $email,
                    'subscription_id' => $subscription['id'] ?? null
                ]);
            }
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error('Subscription Approved Email Failed', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    // Send subscription rejected email
    public function sendSubscriptionRejectedEmail($email, $name, $organizationName, $subscription, $reason) {
        try {
            $variables = [
                'name' => $name,
                'organization_name' => $organizationName,
                'subscription_start' => date('F j, Y', strtotime($subscription['start_date'])),
                'subscription_end' => date('F j, Y', strtotime($subscription['end_date'])),
                'amount' => number_format($subscription['amount'], 2),
                'rejection_reason' => $reason,
                'app_name' => APP_NAME,
                'dashboard_url' => $this->getBaseUrl() . '/dashboard'
            ];
            
            $result = $this->sendTemplateEmail($email, $name, 'subscription_rejected', $variables);
            
            if ($result['success']) {
                $this->logger->info('Subscription Rejected Email Sent', [
                    'email' => $email,
                    'subscription_id' => $subscription['id'] ?? null
                ]);
            }
            
            return $result;
            
        } catch (Exception $e) {
            $this->logger->error('Subscription Rejected Email Failed', [
                'email' => $email,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    // Send template-based email
    private function sendTemplateEmail($email, $name, $templateType, $variables = []) {
        try {
            if (!isset($this->templates[$templateType])) {
                throw new Exception("Email template '{$templateType}' not found");
            }
            
            $template = $this->templates[$templateType];
            
            // Replace variables in subject
            $subject = $this->replaceVariables($template['subject'], $variables);
            
            // Generate HTML and text content
            $htmlContent = $this->generateHtmlContent($template['template'], $variables);
            $textContent = $this->generateTextContent($template['template'], $variables);
            
            // Send the email
            return $this->sendEmail($email, $name, $subject, $htmlContent, $textContent);
            
        } catch (Exception $e) {
            throw $e;
        }
    }
    
    // Send email using SMTP or fallback method
    private function sendEmail($to, $toName, $subject, $htmlContent, $textContent = null) {
        try {
            // Try to send using SMTP if configured
            if ($this->isSmtpConfigured()) {
                return $this->sendSMTPEmail($to, $toName, $subject, $htmlContent, $textContent);
            } else {
                // Fallback to PHP mail() function
                return $this->sendPHPMail($to, $toName, $subject, $htmlContent, $textContent);
            }
            
        } catch (Exception $e) {
            // Log to file as last resort
            $this->logEmailToFile($to, $subject, $htmlContent);
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
    
    // Send email via SMTP using PHP's mail() with SMTP headers
    // Send email via SMTP using socket connection
    private function sendSMTPEmail($to, $toName, $subject, $htmlContent, $textContent) {
        try {
            // Connect to SMTP server
            $connection = $this->connectToSMTP();
            
            if (!$connection) {
                throw new Exception('Could not connect to SMTP server');
            }
            
            // Perform SMTP handshake and authentication
            $this->performSMTPHandshake($connection);
            
            // Send the email
            $this->sendEmailViaSMTP($connection, $to, $subject, $htmlContent);
            
            // Close connection
            fclose($connection);
            
            $this->logger->info('SMTP Email Sent', [
                'to' => $to,
                'subject' => $subject,
                'method' => 'Real SMTP',
                'smtp_host' => $this->smtpConfig['host']
            ]);
            
            return [
                'success' => true,
                'method' => 'Real SMTP',
                'message' => 'Email sent via SMTP connection'
            ];
            
        } catch (Exception $e) {
            $this->logger->error('SMTP Email Failed', [
                'to' => $to,
                'error' => $e->getMessage(),
                'smtp_host' => $this->smtpConfig['host']
            ]);
            
            // Fallback to regular PHP mail
            return $this->sendPHPMail($to, $toName, $subject, $htmlContent, $textContent);
        }
    }
    
    // Connect to SMTP server
    private function connectToSMTP() {
        $host = $this->smtpConfig['host'];
        $port = $this->smtpConfig['port'];
        $encryption = $this->smtpConfig['encryption'];
        
        if ($encryption === 'ssl') {
            $host = 'ssl://' . $host;
        }
        
        $connection = fsockopen($host, $port, $errno, $errstr, 60); // Increased timeout to 60 seconds
        
        if (!$connection) {
            throw new Exception("SMTP Connection failed: $errstr ($errno)");
        }
        
        // Read initial response
        $response = fgets($connection, 512);
        if (substr($response, 0, 3) !== '220') {
            fclose($connection);
            throw new Exception('SMTP server did not respond correctly: ' . $response);
        }
        
        return $connection;
    }
    
    // Perform SMTP handshake and authentication
    private function performSMTPHandshake($connection) {
        // Send EHLO
        fputs($connection, "EHLO " . ($_SERVER['HTTP_HOST'] ?? 'localhost') . "\r\n");
        
        // Read all EHLO responses (multi-line response)
        while ($line = fgets($connection, 512)) {
            if (substr($line, 3, 1) === ' ') break; // Last line has space after code
        }
        
        // Start TLS if required
        if ($this->smtpConfig['encryption'] === 'tls') {
            fputs($connection, "STARTTLS\r\n");
            $response = fgets($connection, 512);
            if (substr($response, 0, 3) !== '220') {
                throw new Exception('STARTTLS failed: ' . $response);
            }
            
            if (!stream_socket_enable_crypto($connection, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new Exception('Failed to enable TLS encryption');
            }
            
            // Send EHLO again after TLS
            fputs($connection, "EHLO " . ($_SERVER['HTTP_HOST'] ?? 'localhost') . "\r\n");
            // Read all EHLO responses again
            while ($line = fgets($connection, 512)) {
                if (substr($line, 3, 1) === ' ') break; // Last line has space after code
            }
        }
        
        // Authenticate
        if (!empty($this->smtpConfig['username']) && !empty($this->smtpConfig['password'])) {
            fputs($connection, "AUTH LOGIN\r\n");
            $response = fgets($connection, 512);
            if (substr($response, 0, 3) !== '334') {
                throw new Exception('AUTH LOGIN failed: ' . $response);
            }
            
            fputs($connection, base64_encode($this->smtpConfig['username']) . "\r\n");
            $response = fgets($connection, 512);
            if (substr($response, 0, 3) !== '334') {
                throw new Exception('Username authentication failed: ' . $response);
            }
            
            fputs($connection, base64_encode($this->smtpConfig['password']) . "\r\n");
            $response = fgets($connection, 512);
            
            if (substr($response, 0, 3) !== '235') {
                throw new Exception('Password authentication failed: ' . $response);
            }
        }
    }
    
    // Send email via SMTP connection
    private function sendEmailViaSMTP($connection, $to, $subject, $htmlContent) {
        // MAIL FROM
        fputs($connection, "MAIL FROM:<" . $this->fromEmail . ">\r\n");
        $response = fgets($connection, 512);
        if (substr($response, 0, 3) !== '250') {
            throw new Exception('MAIL FROM failed: ' . $response);
        }
        
        // RCPT TO
        fputs($connection, "RCPT TO:<$to>\r\n");
        $response = fgets($connection, 512);
        if (substr($response, 0, 3) !== '250') {
            throw new Exception('RCPT TO failed: ' . $response);
        }
        
        // DATA
        fputs($connection, "DATA\r\n");
        $response = fgets($connection, 512);
        if (substr($response, 0, 3) !== '354') {
            throw new Exception('DATA command failed: ' . $response);
        }
        
        // Email headers and body
        $headers = "From: " . $this->fromName . " <" . $this->fromEmail . ">\r\n";
        $headers .= "To: <$to>\r\n";
        $headers .= "Subject: $subject\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "Date: " . date('r') . "\r\n";
        $headers .= "\r\n";
        
        // Send headers and body
        fputs($connection, $headers . $htmlContent . "\r\n.\r\n");
        $response = fgets($connection, 512);
        if (substr($response, 0, 3) !== '250') {
            throw new Exception('Email sending failed: ' . $response);
        }
        
        // QUIT
        fputs($connection, "QUIT\r\n");
        fgets($connection, 512);
    }
    
    // Check if SMTP is properly configured
    private function isSmtpConfigured() {
        return !empty($this->smtpConfig['host']) && 
               !empty($this->smtpConfig['username']) && 
               !empty($this->smtpConfig['password']);
    }
    private function sendPHPMail($to, $toName, $subject, $htmlContent, $textContent) {
        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . $this->fromName . ' <' . $this->fromEmail . '>',
            'Reply-To: ' . $this->fromEmail,
            'X-Mailer: AceTrack/1.0'
        ];
        
        $success = mail($to, $subject, $htmlContent, implode("\r\n", $headers));
        
        if ($success) {
            $this->logger->info('PHP Mail Sent', [
                'to' => $to,
                'subject' => $subject,
                'method' => 'PHP mail()'
            ]);
            
            return [
                'success' => true,
                'method' => 'PHP mail()',
                'message' => 'Email sent via PHP mail() function'
            ];
        } else {
            throw new Exception('Failed to send email via PHP mail() function');
        }
    }
    
    // Log email to file when all else fails
    private function logEmailToFile($to, $subject, $content) {
        try {
            $logDir = STORAGE_PATH . '/email_logs';
            if (!is_dir($logDir)) {
                mkdir($logDir, 0755, true);
            }
            
            $logFile = $logDir . '/emails_' . date('Y-m-d') . '.log';
            $logEntry = [
                'timestamp' => date('Y-m-d H:i:s'),
                'to' => $to,
                'subject' => $subject,
                'content' => $content
            ];
            
            file_put_contents($logFile, json_encode($logEntry, JSON_PRETTY_PRINT) . "\n\n", FILE_APPEND | LOCK_EX);
            
            $this->logger->warning('Email Logged to File', [
                'to' => $to,
                'file' => $logFile
            ]);
            
        } catch (Exception $e) {
            $this->logger->error('Email Logging Failed', ['error' => $e->getMessage()]);
        }
    }
    
    // Generate HTML content from template
    private function generateHtmlContent($templateName, $variables) {
        // Simple HTML template generation
        $baseTemplate = $this->getBaseHtmlTemplate();
        $contentTemplate = $this->getContentTemplate($templateName);
        
        $content = $this->replaceVariables($contentTemplate, $variables);
        $html = str_replace('{{CONTENT}}', $content, $baseTemplate);
        $html = $this->replaceVariables($html, $variables);
        
        return $html;
    }
    
    // Generate text content from template
    private function generateTextContent($templateName, $variables) {
        $template = $this->getTextTemplate($templateName);
        return $this->replaceVariables($template, $variables);
    }
    
    // Replace variables in content
    private function replaceVariables($content, $variables) {
        foreach ($variables as $key => $value) {
            $content = str_replace('{{' . $key . '}}', $value, $content);
        }
        
        // Clean up any remaining placeholders
        $content = preg_replace('/\{\{[^}]+\}\}/', '', $content);
        
        return $content;
    }
    
    // Get base HTML template
    private function getBaseHtmlTemplate() {
        return '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{subject}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; background: #007bff; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{app_name}}</h1>
    </div>
    <div class="content">
        {{CONTENT}}
    </div>
    <div class="footer">
        <p>This email was sent by {{app_name}}. If you have any questions, please contact support.</p>
    </div>
</body>
</html>';
    }
    
    // Get content template by name
    private function getContentTemplate($templateName) {
        $templates = [
            'email_verification' => '
                <h2>Welcome to {{app_name}}!</h2>
                <p>Hello {{name}},</p>
                <p>Thank you for registering with {{app_name}}. To complete your registration, please verify your email address by clicking the button below:</p>
                <p><a href="{{verification_url}}" class="button">Verify Email Address</a></p>
                <p>If the button doesn\'t work, you can copy and paste this link into your browser:</p>
                <p><a href="{{verification_url}}">{{verification_url}}</a></p>
                <p>This verification link will expire in {{expires_in}}.</p>
                <p>If you didn\'t create an account, please ignore this email.</p>
                <p>Best regards,<br>The {{app_name}} Team</p>
            ',
            'password_reset' => '
                <h2>Password Reset Request</h2>
                <p>Hello {{name}},</p>
                <p>You recently requested to reset your password for your {{app_name}} account. Click the button below to reset it:</p>
                <p><a href="{{reset_url}}" class="button">Reset Password</a></p>
                <p>If the button doesn\'t work, you can copy and paste this link into your browser:</p>
                <p><a href="{{reset_url}}">{{reset_url}}</a></p>
                <p>This password reset link will expire in {{expires_in}}.</p>
                <p>If you didn\'t request a password reset, please ignore this email or contact support if you have concerns.</p>
                <p>Best regards,<br>The {{app_name}} Team</p>
            ',
            'welcome' => '
                <h2>Welcome to {{app_name}}!</h2>
                <p>Hello {{name}},</p>
                <p>Welcome to {{app_name}}! Your account has been successfully created and verified.</p>
                {{#organization_name}}<p>You are now part of <strong>{{organization_name}}</strong>.</p>{{/organization_name}}
                <p>Here\'s what you can do next:</p>
                <ul>
                    <li>Complete your profile</li>
                    <li>Explore upcoming events</li>
                    <li>Connect with other members</li>
                </ul>
                <p><a href="{{dashboard_url}}" class="button">Go to Dashboard</a></p>
                <p>If you have any questions, feel free to contact us at {{support_email}}.</p>
                <p>Best regards,<br>The {{app_name}} Team</p>
            ',
            'membership_approved' => '
                <h2>Membership Approved!</h2>
                <p>Hello {{name}},</p>
                <p>Great news! Your membership request for <strong>{{organization_name}}</strong> has been approved.</p>
                <p>You have been granted <strong>{{role}}</strong> access to the organization.</p>
                <p>You can now:</p>
                <ul>
                    <li>View and register for events</li>
                    <li>Access member resources</li>
                    <li>Participate in organization activities</li>
                </ul>
                <p><a href="{{dashboard_url}}" class="button">Access Dashboard</a></p>
                <p>Welcome to the team!</p>
                <p>Best regards,<br>{{organization_name}} Team</p>
            ',
            'event_reminder' => '
                <h2>Event Reminder: {{event_name}}</h2>
                <p>Hello {{name}},</p>
                <p>This is a friendly reminder about the upcoming event:</p>
                <div style="background: white; padding: 20px; border-radius: 4px; margin: 20px 0;">
                    <h3>{{event_name}}</h3>
                    <p><strong>Date & Time:</strong> {{event_datetime}}</p>
                    <p><strong>Location:</strong> {{event_location}}</p>
                    <p><strong>Description:</strong> {{event_description}}</p>
                </div>
                <p>Don\'t forget to bring any required materials and arrive on time!</p>
                <p>Best regards,<br>{{organization_name}} Team</p>
            ',
            'attendance_summary' => '
                <h2>Event Attendance Summary</h2>
                <p>Hello {{name}},</p>
                <p>Here is the attendance summary for <strong>{{event_name}}</strong> held on {{event_date}}:</p>
                <div style="background: white; padding: 20px; border-radius: 4px; margin: 20px 0;">
                    <h3>Attendance Statistics</h3>
                    <p><strong>Total Registered:</strong> {{total_registered}}</p>
                    <p><strong>Total Checked In:</strong> {{total_checked_in}}</p>
                    <p><strong>Total Checked Out:</strong> {{total_checked_out}}</p>
                    <p><strong>Attendance Rate:</strong> {{attendance_rate}}</p>
                </div>
                <p>You can access detailed reports from your dashboard.</p>
                <p>Best regards,<br>{{organization_name}} Team</p>
            ',
            'subscription_approved' => '
                <h2>Subscription Approved!</h2>
                <p>Hello {{name}},</p>
                <p>Great news! Your subscription for <strong>{{organization_name}}</strong> has been approved and is now active.</p>
                <div style="background: white; padding: 20px; border-radius: 4px; margin: 20px 0;">
                    <h3>Subscription Details</h3>
                    <p><strong>Period:</strong> {{subscription_start}} to {{subscription_end}}</p>
                    <p><strong>Amount:</strong> ${{amount}}</p>
                    <p><strong>Status:</strong> Active</p>
                </div>
                <p>Your organization now has full access to all premium features.</p>
                <p><a href="{{dashboard_url}}" class="button">Access Dashboard</a></p>
                <p>Thank you for your business!</p>
                <p>Best regards,<br>The {{app_name}} Team</p>
            ',
            'subscription_rejected' => '
                <h2>Subscription Status Update</h2>
                <p>Hello {{name}},</p>
                <p>We have reviewed your subscription request for <strong>{{organization_name}}</strong>, but unfortunately we cannot approve it at this time.</p>
                <div style="background: white; padding: 20px; border-radius: 4px; margin: 20px 0;">
                    <h3>Submission Details</h3>
                    <p><strong>Period:</strong> {{subscription_start}} to {{subscription_end}}</p>
                    <p><strong>Amount:</strong> ${{amount}}</p>
                    <p><strong>Status:</strong> Rejected</p>
                </div>
                <div style="background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p><strong>Reason for rejection:</strong></p>
                    <p>{{rejection_reason}}</p>
                </div>
                <p>Please review the reason above and feel free to submit a new subscription request after addressing any issues.</p>
                <p>If you have questions, please contact our support team.</p>
                <p>Best regards,<br>The {{app_name}} Team</p>
            '
        ];
        
        return $templates[$templateName] ?? '<p>Email content not available.</p>';
    }
    
    // Get text template by name (simplified versions)
    private function getTextTemplate($templateName) {
        $templates = [
            'email_verification' => 'Welcome to {{app_name}}!\n\nHello {{name}},\n\nPlease verify your email by visiting: {{verification_url}}\n\nThis link expires in {{expires_in}}.\n\nBest regards,\nThe {{app_name}} Team',
            'password_reset' => 'Password Reset Request\n\nHello {{name}},\n\nReset your password by visiting: {{reset_url}}\n\nThis link expires in {{expires_in}}.\n\nBest regards,\nThe {{app_name}} Team',
            'welcome' => 'Welcome to {{app_name}}!\n\nHello {{name}},\n\nYour account has been created successfully. Visit your dashboard: {{dashboard_url}}\n\nBest regards,\nThe {{app_name}} Team'
        ];
        
        return $templates[$templateName] ?? 'Email content not available.';
    }
    
    // Get base URL for links
    private function getBaseUrl() {
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost:8888';
        return $protocol . '://' . $host . '/acetrack/frontend';
    }
    
    // Get email statistics
    public function getEmailStats() {
        try {
            $logDir = STORAGE_PATH . '/email_logs';
            if (!is_dir($logDir)) {
                return ['total_sent' => 0, 'daily_logs' => []];
            }
            
            $files = scandir($logDir);
            $stats = ['total_sent' => 0, 'daily_logs' => []];
            
            foreach ($files as $file) {
                if (strpos($file, 'emails_') === 0) {
                    $date = str_replace(['emails_', '.log'], '', $file);
                    $content = file_get_contents($logDir . '/' . $file);
                    $count = substr_count($content, '"timestamp"');
                    
                    $stats['daily_logs'][$date] = $count;
                    $stats['total_sent'] += $count;
                }
            }
            
            return $stats;
            
        } catch (Exception $e) {
            $this->logger->error('Email Stats Failed', ['error' => $e->getMessage()]);
            return ['error' => $e->getMessage()];
        }
    }
}
?>