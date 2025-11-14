// Export all models from a single file for easy importing
const Authority = require('./Authority');
const Driver = require('./Driver');
const Route = require('./Route');
const Bus = require('./Bus');
const Location = require('./Location');
const Alert = require('./Alert');

module.exports = {
  Authority,
  Driver,
  Route,
  Bus,
  Location,
  Alert
};