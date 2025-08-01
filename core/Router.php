<?php
class Router {
    private $routes = [];
    private $middlewares = [];
    
    public function __construct() {
        $this->middlewares = [
            'auth' => new AuthMiddleware(),
            'tenant' => new TenantMiddleware(),
            'rbac' => new RBACMiddleware()
        ];
    }
    
    public function get($path, $handler, $middlewares = []) {
        $this->addRoute('GET', $path, $handler, $middlewares);
    }
    
    public function post($path, $handler, $middlewares = []) {
        $this->addRoute('POST', $path, $handler, $middlewares);
    }
    
    public function put($path, $handler, $middlewares = []) {
        $this->addRoute('PUT', $path, $handler, $middlewares);
    }
    
    public function delete($path, $handler, $middlewares = []) {
        $this->addRoute('DELETE', $path, $handler, $middlewares);
    }
    
    private function addRoute($method, $path, $handler, $middlewares) {
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler,
            'middlewares' => $middlewares
        ];
    }
    
    public function dispatch() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        foreach ($this->routes as $route) {
            if ($route['method'] === $method && $this->matchPath($route['path'], $path)) {
                $params = $this->extractParams($route['path'], $path);
                
                // Execute middlewares
                foreach ($route['middlewares'] as $middleware) {
                    $this->executeMiddleware($middleware);
                }
                
                // Execute controller
                $this->executeHandler($route['handler'], $params);
                return;
            }
        }
        
        // Route not found
        http_response_code(404);
        echo json_encode(['error' => 'Route not found']);
    }
    
    private function matchPath($routePath, $requestPath) {
        $routePattern = preg_replace('/\{[^}]+\}/', '([^/]+)', $routePath);
        $routePattern = str_replace('/', '\/', $routePattern);
        return preg_match('/^' . $routePattern . '$/', $requestPath);
    }
    
    private function extractParams($routePath, $requestPath) {
        $params = [];
        
        preg_match_all('/\{([^}]+)\}/', $routePath, $paramNames);
        $routePattern = preg_replace('/\{[^}]+\}/', '([^/]+)', $routePath);
        $routePattern = str_replace('/', '\/', $routePattern);
        
        if (preg_match('/^' . $routePattern . '$/', $requestPath, $matches)) {
            array_shift($matches); // Remove full match
            
            for ($i = 0; $i < count($paramNames[1]); $i++) {
                $params[$paramNames[1][$i]] = $matches[$i] ?? null;
            }
        }
        
        return $params;
    }
    
    private function executeMiddleware($middleware) {
        if (strpos($middleware, ':') !== false) {
            list($middlewareName, $params) = explode(':', $middleware, 2);
            $middlewareParams = explode(',', $params);
        } else {
            $middlewareName = $middleware;
            $middlewareParams = [];
        }
        
        if (isset($this->middlewares[$middlewareName])) {
            $this->middlewares[$middlewareName]->handle($middlewareParams);
        }
    }
    
    private function executeHandler($handler, $params) {
        list($controllerName, $method) = explode('@', $handler);
        
        if (class_exists($controllerName)) {
            $controller = new $controllerName();
            if (method_exists($controller, $method)) {
                $controller->$method($params);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Method not found']);
            }
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Controller not found']);
        }
    }
}

