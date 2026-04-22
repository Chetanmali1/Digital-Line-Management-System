// MongoDB Initialization Script
// Creates collections with initial data for development

db = db.getSiblingDB('queue_management');

// Create collections with validators
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'password'],
      properties: {
        name: { bsonType: 'string' },
        email: { bsonType: 'string' },
        role: { bsonType: 'string', enum: ['user', 'admin'] },
      },
    },
  },
});

db.createCollection('servicecounters');
db.createCollection('queues');
db.createCollection('queuehistories');

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.queues.createIndex({ status: 1 });
db.queues.createIndex({ counterId: 1, status: 1 });
db.queuehistories.createIndex({ date: -1 });

print('✅ MongoDB initialized for Queue Management System');
