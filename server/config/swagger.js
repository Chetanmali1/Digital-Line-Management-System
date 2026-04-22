/**
 * Swagger/OpenAPI 3.0 Configuration
 * Auto-generates interactive API documentation
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Digital Queue Management System API',
      version: '1.0.0',
      description: `
        Enterprise-grade Queue Management API with AI-powered wait time predictions.
        
        ## Authentication
        Use the /auth/login endpoint to get a JWT token, then click "Authorize" and enter: **Bearer {your_token}**
        
        ## Features
        - Real-time queue management via Socket.io
        - AI-powered wait time estimation
        - Peak hour detection
        - Redis caching for performance
      `,
      contact: { name: 'API Support', email: 'support@queuemanager.io' },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development' },
      { url: 'https://api.queuemanager.io', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['user', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ServiceCounter: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            counterName: { type: 'string' },
            serviceType: { type: 'string' },
            isActive: { type: 'boolean' },
            avgServiceTime: { type: 'number', description: 'Average service time in minutes' },
            maxCapacity: { type: 'number' },
            currentCount: { type: 'number' },
          },
        },
        QueueEntry: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            tokenNumber: { type: 'string' },
            status: { type: 'string', enum: ['waiting', 'serving', 'served', 'cancelled'] },
            position: { type: 'number' },
            estimatedWait: { type: 'number', description: 'Estimated wait in minutes' },
            joinedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./routes/*.js', './models/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { background-color: #1e293b; }',
    customSiteTitle: 'Queue Management API Docs',
  }));

  // Raw spec endpoint for Postman import
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

module.exports = { setupSwagger, swaggerSpec };
