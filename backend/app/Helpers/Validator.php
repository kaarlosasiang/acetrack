<?php
class Validator {
    
    private $errors = [];
    
    // Validate data against rules
    public function validate($data, $rules) {
        $this->errors = [];
        
        foreach ($rules as $field => $fieldRules) {
            $value = $data[$field] ?? null;
            $fieldRules = explode('|', $fieldRules);
            
            foreach ($fieldRules as $rule) {
                $this->applyRule($field, $value, $rule, $data);
            }
        }
        
        return empty($this->errors);
    }
    
    // Get validation errors
    public function getErrors() {
        return $this->errors;
    }
    
    // Apply a single validation rule
    private function applyRule($field, $value, $rule, $allData) {
        $parts = explode(':', $rule);
        $ruleName = $parts[0];
        $parameter = $parts[1] ?? null;
        
        switch ($ruleName) {
            case 'required':
                if (empty($value) && $value !== '0') {
                    $this->addError($field, "{$field} is required");
                }
                break;
                
            case 'email':
                if (!empty($value) && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                    $this->addError($field, "{$field} must be a valid email address");
                }
                break;
                
            case 'min':
                if (!empty($value) && strlen($value) < $parameter) {
                    $this->addError($field, "{$field} must be at least {$parameter} characters");
                }
                break;
                
            case 'max':
                if (!empty($value) && strlen($value) > $parameter) {
                    $this->addError($field, "{$field} must not exceed {$parameter} characters");
                }
                break;
                
            case 'numeric':
                if (!empty($value) && !is_numeric($value)) {
                    $this->addError($field, "{$field} must be numeric");
                }
                break;
                
            case 'integer':
                if (!empty($value) && !filter_var($value, FILTER_VALIDATE_INT)) {
                    $this->addError($field, "{$field} must be an integer");
                }
                break;
                
            case 'date':
                if (!empty($value) && !strtotime($value)) {
                    $this->addError($field, "{$field} must be a valid date");
                }
                break;
                
            case 'datetime':
                if (!empty($value)) {
                    $date = DateTime::createFromFormat('Y-m-d H:i:s', $value);
                    if (!$date || $date->format('Y-m-d H:i:s') !== $value) {
                        $this->addError($field, "{$field} must be a valid datetime (Y-m-d H:i:s)");
                    }
                }
                break;
                
            case 'in':
                $allowedValues = explode(',', $parameter);
                if (!empty($value) && !in_array($value, $allowedValues)) {
                    $this->addError($field, "{$field} must be one of: " . implode(', ', $allowedValues));
                }
                break;
                
            case 'confirmed':
                $confirmField = $field . '_confirmation';
                if ($value !== ($allData[$confirmField] ?? null)) {
                    $this->addError($field, "{$field} confirmation does not match");
                }
                break;
                
            case 'unique':
                // Format: unique:table,column
                $parts = explode(',', $parameter);
                $table = $parts[0];
                $column = $parts[1] ?? $field;
                $excludeId = $parts[2] ?? null;
                
                if (!empty($value) && $this->isValueNotUnique($table, $column, $value, $excludeId)) {
                    $this->addError($field, "{$field} already exists");
                }
                break;
                
            case 'exists':
                // Format: exists:table,column
                $parts = explode(',', $parameter);
                $table = $parts[0];
                $column = $parts[1] ?? $field;
                
                if (!empty($value) && !$this->valueExists($table, $column, $value)) {
                    $this->addError($field, "{$field} does not exist");
                }
                break;
                
            case 'url':
                if (!empty($value) && !filter_var($value, FILTER_VALIDATE_URL)) {
                    $this->addError($field, "{$field} must be a valid URL");
                }
                break;
                
            case 'alpha':
                if (!empty($value) && !ctype_alpha($value)) {
                    $this->addError($field, "{$field} may only contain letters");
                }
                break;
                
            case 'alpha_num':
                if (!empty($value) && !ctype_alnum($value)) {
                    $this->addError($field, "{$field} may only contain letters and numbers");
                }
                break;
                
            case 'phone':
                if (!empty($value) && !preg_match('/^[\+]?[0-9\s\-\(\)]{10,}$/', $value)) {
                    $this->addError($field, "{$field} must be a valid phone number");
                }
                break;
                
            case 'student_id':
                if (!empty($value) && !preg_match('/^[A-Za-z0-9\-]{5,20}$/', $value)) {
                    $this->addError($field, "{$field} must be a valid student ID (5-20 alphanumeric characters)");
                }
                break;
        }
    }
    
    // Add validation error
    private function addError($field, $message) {
        if (!isset($this->errors[$field])) {
            $this->errors[$field] = [];
        }
        $this->errors[$field][] = $message;
    }
    
    // Check if value is not unique in database
    private function isValueNotUnique($table, $column, $value, $excludeId = null) {
        try {
            $db = Database::getInstance();
            $sql = "SELECT COUNT(*) as count FROM {$table} WHERE {$column} = ?";
            $params = [$value];
            
            if ($excludeId) {
                $sql .= " AND id != ?";
                $params[] = $excludeId;
            }
            
            $result = $db->queryOne($sql, $params);
            return $result && $result['count'] > 0;
        } catch (Exception $e) {
            return false; // Assume valid if database check fails
        }
    }
    
    // Check if value exists in database
    private function valueExists($table, $column, $value) {
        try {
            $db = Database::getInstance();
            $sql = "SELECT COUNT(*) as count FROM {$table} WHERE {$column} = ?";
            $result = $db->queryOne($sql, [$value]);
            return $result && $result['count'] > 0;
        } catch (Exception $e) {
            return false; // Assume invalid if database check fails
        }
    }
    
    // Static validation method
    public static function make($data, $rules) {
        $validator = new self();
        $isValid = $validator->validate($data, $rules);
        
        return [
            'valid' => $isValid,
            'errors' => $validator->getErrors()
        ];
    }
    
    // Validate email format
    public static function isEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    // Validate password strength
    public static function isStrongPassword($password, $minLength = 8) {
        if (strlen($password) < $minLength) {
            return false;
        }
        
        // Check for at least one uppercase, lowercase, number, and special character
        return preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/', $password);
    }
    
    // Sanitize input
    public static function sanitize($input) {
        if (is_array($input)) {
            return array_map([self::class, 'sanitize'], $input);
        }
        
        return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
    }
    
    // Clean filename for uploads
    public static function cleanFilename($filename) {
        // Remove any path information
        $filename = basename($filename);
        
        // Remove any characters that aren't alphanumeric, dots, dashes, or underscores
        $filename = preg_replace('/[^a-zA-Z0-9.\-_]/', '', $filename);
        
        // Ensure it's not empty and has an extension
        if (empty($filename) || strpos($filename, '.') === false) {
            $filename = 'file_' . time() . '.tmp';
        }
        
        return $filename;
    }
}
?>