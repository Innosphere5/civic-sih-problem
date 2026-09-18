const { EventEmitter } = require("events");

// Ensure a single global event emitter instance survives hot module reload in dev
if (!global.__complaintEmitter) {
  global.__complaintEmitter = new EventEmitter();
  global.__complaintEmitter.setMaxListeners(200);
}

const complaintEvents = global.__complaintEmitter;

module.exports = { complaintEvents };
