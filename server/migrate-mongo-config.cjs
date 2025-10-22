const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = {
  mongodb: {
    url: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/bayoucarbon',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'migrations',
  migrationFileExtension: '.js',
  moduleSystem: 'commonjs',
};
