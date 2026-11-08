'use strict';
// Test-only observations; real SQLite executes every application statement.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const net = require('node:net');
const log = (event) => fs.appendFileSync(process.env.SQLITE_TEST_TRACE, JSON.stringify({ pid: process.pid, ...event }) + '\n');
const originalLoad = Module._load;
const patched = new WeakSet();
Module._load = function (name, ...args) {
  const value = originalLoad.call(this, name, ...args);
  if (name !== 'sqlite3' || patched.has(value)) return value;
  patched.add(value);
  const NativeDatabase = value.Database;
  function ObservedDatabase(filename, ...rest) {
    const db = new NativeDatabase(filename, ...rest);
    const file = path.resolve(filename);
    log({ kind: 'open', file });
    const rawGet = db.get;
    for (const method of ['run', 'get', 'all', 'exec']) {
      const original = db[method];
      db[method] = function (sql, ...params) {
        // Observe actual connection state immediately before its data/schema use.
        if (/^\s*PRAGMA\b/i.test(sql)) return original.call(this, sql, ...params);
        db.serialize(() => {
          rawGet.call(db, 'PRAGMA foreign_keys', (error, row) => {
            log({ kind: 'use', file, enabled: error ? null : row.foreign_keys });
          });
          original.call(db, sql, ...params);
        });
        return db;
      };
    }
    const rawClose = db.close;
    db.close = function (callback) {
      return rawClose.call(db, function (error) {
        log({ kind: 'close', file, ok: !error });
        if (callback) callback.call(this, error);
      });
    };
    return db;
  }
  Object.setPrototypeOf(ObservedDatabase, NativeDatabase);
  ObservedDatabase.prototype = NativeDatabase.prototype;
  value.Database = ObservedDatabase;
  return value;
};
const listen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  // Avoid collision with real port 3000; no request/route behaviour is mocked.
  if (typeof args[0] === 'number') args[0] = 0;
  this.once('listening', () => log({ kind: 'listen', port: this.address().port }));
  return listen.apply(this, args);
};
