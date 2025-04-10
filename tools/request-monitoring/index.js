const express = require("./middleware/express");
const database = require("./database");

module.exports = {
  express: express.middleware,

  initDatabase: database.init,
  createTables: database.createTables,

  configure: require("./config").configure,
};
