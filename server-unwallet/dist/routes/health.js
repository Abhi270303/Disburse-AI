"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const controllers_1 = require("../controllers");
const router = (0, express_1.Router)();
const healthController = new controllers_1.HealthController();
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
exports.default = router;
//# sourceMappingURL=health.js.map