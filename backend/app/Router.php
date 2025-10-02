<?php
class Router {
    private $routes = [];
    private $middlewares = [];
    private $currentMethod;
    private $currentPath;
    private $currentPrefix = '';
    private $currentGroupMiddlewares = [];
    
    public function __construct() {
        $this->currentMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $this->currentPath = $this->getCurrentPath();
    }
    
    // Get current request path
    private function getCurrentPath() {
        $path = $_SERVER['REQUEST_URI'] ?? '/';
        
        // Remove query string
        if (($pos = strpos($path, '?')) !== false) {
            $path = substr($path, 0, $pos);
        }
        
        // Remove base path for deployment in subdirectory
        $basePath = '/acetrack/backend';
        if (strpos($path, $basePath) === 0) {
            $path = substr($path, strlen($basePath));
            if (empty($path)) {
                $path = '/';
            }
        }
        
        // Remove trailing slash except for root
        if ($path !== '/' && substr($path, -1) === '/') {
            $path = substr($path, 0, -1);
        }
        
        return $path;
    }
    
    // Add a GET route
    public function get($path, $handler, $middlewares = []) {
        $this->addRoute('GET', $path, $handler, $middlewares);
    }
    
    // Add a POST route
    public function post($path, $handler, $middlewares = []) {
        $this->addRoute('POST', $path, $handler, $middlewares);
    }
    
    // Add a PUT route
    public function put($path, $handler, $middlewares = []) {
        $this->addRoute('PUT', $path, $handler, $middlewares);
    }
    
    // Add a DELETE route
    public function delete($path, $handler, $middlewares = []) {
        $this->addRoute('DELETE', $path, $handler, $middlewares);
    }
    
    // Add a PATCH route
    public function patch($path, $handler, $middlewares = []) {
        $this->addRoute('PATCH', $path, $handler, $middlewares);
    }
    
    // Add any method route
    public function any($path, $handler, $middlewares = []) {
        $methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        foreach ($methods as $method) {
            $this->addRoute($method, $path, $handler, $middlewares);
        }
    }
    
    // Add route to collection
    private function addRoute($method, $path, $handler, $middlewares = []) {
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler,
            'middlewares' => $middlewares,
            'pattern' => $this->pathToPattern($path),
            'params' => $this->extractParams($path)
        ];
    }
    
    // Convert path to regex pattern
    private function pathToPattern($path) {
        // Escape forward slashes
        $pattern = str_replace('/', '\/', $path);
        
        // Replace parameters like {id} with regex
        $pattern = preg_replace('/\{(\w+)\}/', '([^\/]+)', $pattern);
        
        // Add anchors
        return '/^' . $pattern . '$/';
    }
    
    // Extract parameter names from path
    private function extractParams($path) {
        preg_match_all('/\{(\w+)\}/', $path, $matches);
        return $matches[1];
    }
    
    // Add route group with prefix and middlewares
    public function group($prefix, $callback, $middlewares = []) {
        $originalPrefix = $this->currentPrefix ?? '';
        $originalMiddlewares = $this->currentGroupMiddlewares ?? [];
        
        $this->currentPrefix = $originalPrefix . $prefix;
        $this->currentGroupMiddlewares = array_merge($originalMiddlewares, $middlewares);
        
        $callback($this);
        
        $this->currentPrefix = $originalPrefix;
        $this->currentGroupMiddlewares = $originalMiddlewares;
    }
    
    // Dispatch the current request
    public function dispatch() {
        $route = $this->findMatchingRoute();
        
        if (!$route) {
            $this->handle404();
            return;
        }
        
        try {
            // Extract route parameters
            $params = $this->extractRouteParams($route);
            
            // Run middlewares
            $this->runMiddlewares($route['middlewares']);
            
            // Call the handler
            $this->callHandler($route['handler'], $params);
            
        } catch (Exception $e) {
            $this->handle500($e);
        }
    }
    
    // Find matching route for current request
    private function findMatchingRoute() {
        foreach ($this->routes as $route) {
            if ($route['method'] === $this->currentMethod && 
                preg_match($route['pattern'], $this->currentPath)) {
                return $route;
            }
        }
        return null;
    }
    
    // Extract parameters from matched route
    private function extractRouteParams($route) {
        preg_match($route['pattern'], $this->currentPath, $matches);
        array_shift($matches); // Remove full match
        
        $params = [];
        foreach ($route['params'] as $index => $paramName) {
            $params[$paramName] = $matches[$index] ?? null;
        }
        
        return $params;
    }
    
    // Run middleware chain
    private function runMiddlewares($middlewares) {
        foreach ($middlewares as $middleware) {
            if (is_string($middleware)) {
                $middlewareClass = $middleware;
                $middlewareInstance = new $middlewareClass();
                $middlewareInstance->handle();
            } elseif (is_callable($middleware)) {
                $middleware();
            }
        }
    }
    
    // Call route handler
    private function callHandler($handler, $params = []) {
        if (is_string($handler)) {
            // Format: 'ControllerName@methodName'
            list($controllerName, $methodName) = explode('@', $handler);
            
            $controllerClass = $controllerName . 'Controller';
            
            if (!class_exists($controllerClass)) {
                throw new Exception("Controller {$controllerClass} not found");
            }
            
            $controller = new $controllerClass();
            
            if (!method_exists($controller, $methodName)) {
                throw new Exception("Method {$methodName} not found in {$controllerClass}");
            }
            
            // Pass route parameters to controller method
            $controller->$methodName($params);
            
        } elseif (is_callable($handler)) {
            // Anonymous function
            $handler($params);
        } else {
            throw new Exception("Invalid route handler");
        }
    }
    
    // Handle 404 errors
    private function handle404() {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Route not found',
            'path' => $this->currentPath,
            'method' => $this->currentMethod
        ]);
    }
    
    // Handle 500 errors
    private function handle500($exception) {
        http_response_code(500);
        
        $response = [
            'success' => false,
            'error' => 'Internal server error'
        ];
        
        // Show detailed error in development
        if (APP_ENV === 'development') {
            $response['details'] = [
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTraceAsString()
            ];
        }
        
        echo json_encode($response);
    }
    
    // Add resource routes (RESTful)
    public function resource($path, $controller, $middlewares = []) {
        $basePath = '/' . trim($path, '/');
        $controllerName = $controller;
        
        // Index - GET /resource
        $this->get($basePath, $controllerName . '@index', $middlewares);
        
        // Store - POST /resource
        $this->post($basePath, $controllerName . '@store', $middlewares);
        
        // Show - GET /resource/{id}
        $this->get($basePath . '/{id}', $controllerName . '@show', $middlewares);
        
        // Update - PUT /resource/{id}
        $this->put($basePath . '/{id}', $controllerName . '@update', $middlewares);
        
        // Delete - DELETE /resource/{id}
        $this->delete($basePath . '/{id}', $controllerName . '@destroy', $middlewares);
    }
}
?>