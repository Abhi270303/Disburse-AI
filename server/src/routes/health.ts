import { Router } from 'express';
import { HealthController } from '../controllers';

const router: Router = Router();
const healthController = new HealthController();

// Basic health check
router.get('/', healthController.health);

// Detailed health check with service testing
router.get('/detailed', healthController.healthDetailed);

// Readiness probe (for Kubernetes)
router.get('/ready', healthController.ready);

// Liveness probe (for Kubernetes)
router.get('/live', healthController.live);

// CORS test endpoint
router.get('/cors-test', (req, res) => {
    res.json({
        success: true,
        message: 'CORS is working correctly!',
        timestamp: new Date().toISOString(),
        origin: req.headers.origin || 'No origin header',
        method: req.method,
        headers: req.headers
    });
});

// CORS test endpoint for POST requests
router.post('/cors-test', (req, res) => {
    res.json({
        success: true,
        message: 'CORS POST request is working correctly!',
        timestamp: new Date().toISOString(),
        origin: req.headers.origin || 'No origin header',
        method: req.method,
        body: req.body
    });
});

export default router; 