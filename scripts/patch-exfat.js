const fs = require('fs');
let nodeFs;
try {
  nodeFs = require('node:fs');
} catch (_) {}

const fsModules = [fs, nodeFs].filter(Boolean);

// 1. Patch readlink: convert Windows exFAT EISDIR into standard EINVAL
fsModules.forEach((mod) => {
  const origSync = mod.readlinkSync;
  if (origSync) {
    mod.readlinkSync = function (path, options) {
      try {
        return origSync.call(mod, path, options);
      } catch (err) {
        if (err && err.code === 'EISDIR') {
          const e = new Error(`EINVAL: invalid argument, readlink '${path}'`);
          e.code = 'EINVAL';
          e.errno = -4071;
          e.syscall = 'readlink';
          e.path = path;
          throw e;
        }
        throw err;
      }
    };
  }

  const origAsync = mod.readlink;
  if (origAsync) {
    mod.readlink = function (path, options, callback) {
      const cb = typeof options === 'function' ? options : callback;
      const opt = typeof options === 'function' ? undefined : options;

      return origAsync.call(mod, path, opt, (err, linkString) => {
        if (err && err.code === 'EISDIR') {
          const e = new Error(`EINVAL: invalid argument, readlink '${path}'`);
          e.code = 'EINVAL';
          e.errno = -4071;
          e.syscall = 'readlink';
          e.path = path;
          return cb(e);
        }
        return cb(err, linkString);
      });
    };
  }

  if (mod.promises && mod.promises.readlink) {
    const origPromise = mod.promises.readlink;
    mod.promises.readlink = async function (path, options) {
      try {
        return await origPromise.call(mod.promises, path, options);
      } catch (err) {
        if (err && err.code === 'EISDIR') {
          const e = new Error(`EINVAL: invalid argument, readlink '${path}'`);
          e.code = 'EINVAL';
          e.errno = -4071;
          e.syscall = 'readlink';
          e.path = path;
          throw e;
        }
        throw err;
      }
    };
  }
});

// 2. Patch rmdir: handle Windows exFAT ENOTEMPTY / EEXIST / EPERM / EBUSY by recursively removing
fsModules.forEach((mod) => {
  const isRetryable = (code) =>
    code === 'ENOTEMPTY' || code === 'EEXIST' || code === 'EPERM' || code === 'EBUSY';

  const origRmdirSync = mod.rmdirSync;
  if (origRmdirSync) {
    mod.rmdirSync = function (path, options) {
      try {
        return origRmdirSync.call(mod, path, options);
      } catch (err) {
        if (err && isRetryable(err.code)) {
          try {
            return mod.rmSync(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
          } catch (_) {
            return;
          }
        }
        throw err;
      }
    };
  }

  const origRmdir = mod.rmdir;
  if (origRmdir) {
    mod.rmdir = function (path, options, callback) {
      const cb = typeof options === 'function' ? options : callback;
      const opt = typeof options === 'function' ? undefined : options;

      return origRmdir.call(mod, path, opt, (err) => {
        if (err && isRetryable(err.code)) {
          try {
            mod.rmSync(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
            return cb(null);
          } catch (_) {
            return cb(null);
          }
        }
        return cb(err);
      });
    };
  }

  if (mod.promises && mod.promises.rmdir) {
    const origPromise = mod.promises.rmdir;
    mod.promises.rmdir = async function (path, options) {
      try {
        return await origPromise.call(mod.promises, path, options);
      } catch (err) {
        if (err && isRetryable(err.code)) {
          try {
            await mod.promises.rm(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
            return;
          } catch (_) {
            return;
          }
        }
        throw err;
      }
    };
  }
});

// 3. Patch mkdir: handle Windows exFAT EPERM / EEXIST when directory already exists
fsModules.forEach((mod) => {
  const isIgnorable = (code) => code === 'EPERM' || code === 'EEXIST';

  const origMkdirSync = mod.mkdirSync;
  if (origMkdirSync) {
    mod.mkdirSync = function (path, options) {
      try {
        return origMkdirSync.call(mod, path, options);
      } catch (err) {
        if (err && isIgnorable(err.code)) {
          return path;
        }
        throw err;
      }
    };
  }

  const origMkdir = mod.mkdir;
  if (origMkdir) {
    mod.mkdir = function (path, options, callback) {
      const cb = typeof options === 'function' ? options : callback;
      const opt = typeof options === 'function' ? undefined : options;

      return origMkdir.call(mod, path, opt, (err, made) => {
        if (err && isIgnorable(err.code)) {
          return cb(null, made || path);
        }
        return cb(err, made);
      });
    };
  }

  if (mod.promises && mod.promises.mkdir) {
    const origPromise = mod.promises.mkdir;
    mod.promises.mkdir = async function (path, options) {
      try {
        return await origPromise.call(mod.promises, path, options);
      } catch (err) {
        if (err && isIgnorable(err.code)) {
          return path;
        }
        throw err;
      }
    };
  }
});

// 4. Patch readdir: handle Windows exFAT EPERM / scandir on phantom directory entries
fsModules.forEach((mod) => {
  const origReaddirSync = mod.readdirSync;
  if (origReaddirSync) {
    mod.readdirSync = function (path, options) {
      try {
        return origReaddirSync.call(mod, path, options);
      } catch (err) {
        if (err && (err.code === 'EPERM' || err.code === 'ENOENT')) {
          return [];
        }
        throw err;
      }
    };
  }

  const origReaddir = mod.readdir;
  if (origReaddir) {
    mod.readdir = function (path, options, callback) {
      const cb = typeof options === 'function' ? options : callback;
      const opt = typeof options === 'function' ? undefined : options;

      return origReaddir.call(mod, path, opt, (err, files) => {
        if (err && (err.code === 'EPERM' || err.code === 'ENOENT')) {
          return cb(null, []);
        }
        return cb(err, files);
      });
    };
  }

  if (mod.promises && mod.promises.readdir) {
    const origPromise = mod.promises.readdir;
    mod.promises.readdir = async function (path, options) {
      try {
        return await origPromise.call(mod.promises, path, options);
      } catch (err) {
        if (err && (err.code === 'EPERM' || err.code === 'ENOENT')) {
          return [];
        }
        throw err;
      }
    };
  }
});

// 5. Patch stat/lstat: handle Windows exFAT EPERM on phantom directory entries
fsModules.forEach((mod) => {
  const fakeStat = {
    isDirectory: () => true,
    isFile: () => false,
    isSymbolicLink: () => false,
    mtimeMs: Date.now(),
    mtime: new Date(),
  };

  const origStatSync = mod.statSync;
  if (origStatSync) {
    mod.statSync = function (path, options) {
      try {
        return origStatSync.call(mod, path, options);
      } catch (err) {
        if (err && err.code === 'EPERM') return fakeStat;
        throw err;
      }
    };
  }

  const origLstatSync = mod.lstatSync;
  if (origLstatSync) {
    mod.lstatSync = function (path, options) {
      try {
        return origLstatSync.call(mod, path, options);
      } catch (err) {
        if (err && err.code === 'EPERM') return fakeStat;
        throw err;
      }
    };
  }
});

// 6. Expose rawOpenSync and patch openSync/open for .next/types/ exFAT phantom locks
const pathUtil = require('path');
const safeTypesDir = pathUtil.resolve(__dirname, '..', '.safe_types');
try { fs.mkdirSync(safeTypesDir, { recursive: true }); } catch (_) {}

function redirectTypesPath(p) {
  if (typeof p === 'string' && (p.includes('.next\\types') || p.includes('.next/types'))) {
    const filename = pathUtil.basename(p);
    return pathUtil.join(safeTypesDir, filename);
  }
  return p;
}

fsModules.forEach((mod) => {
  const origOpenSync = mod.openSync;
  mod.rawOpenSync = origOpenSync;
  if (origOpenSync) {
    mod.openSync = function (path, flags, mode) {
      try {
        return origOpenSync.call(mod, path, flags, mode);
      } catch (err) {
        if (err && err.code === 'EPERM') {
          const redirected = redirectTypesPath(path);
          if (redirected !== path) {
            return origOpenSync.call(mod, redirected, flags, mode);
          }
        }
        throw err;
      }
    };
  }

  const origOpen = mod.open;
  mod.rawOpen = origOpen;
  if (origOpen) {
    mod.open = function (path, flags, mode, callback) {
      const cb = typeof mode === 'function' ? mode : callback;
      const m = typeof mode === 'function' ? undefined : mode;

      return origOpen.call(mod, path, flags, m, (err, fd) => {
        if (err && err.code === 'EPERM') {
          const redirected = redirectTypesPath(path);
          if (redirected !== path) {
            return origOpen.call(mod, redirected, flags, m, cb);
          }
        }
        return cb(err, fd);
      });
    };
  }

  if (mod.promises && mod.promises.open) {
    const origPromiseOpen = mod.promises.open;
    mod.promises.open = async function (path, flags, mode) {
      try {
        return await origPromiseOpen.call(mod.promises, path, flags, mode);
      } catch (err) {
        if (err && err.code === 'EPERM') {
          const redirected = redirectTypesPath(path);
          if (redirected !== path) {
            return await origPromiseOpen.call(mod.promises, redirected, flags, mode);
          }
        }
        throw err;
      }
    };
  }

  const origWriteFileSync = mod.writeFileSync;
  if (origWriteFileSync) {
    mod.writeFileSync = function (path, data, options) {
      try {
        return origWriteFileSync.call(mod, path, data, options);
      } catch (err) {
        if (err && err.code === 'EPERM') {
          const redirected = redirectTypesPath(path);
          if (redirected !== path) {
            return origWriteFileSync.call(mod, redirected, data, options);
          }
        }
        throw err;
      }
    };
  }

  const origWriteFile = mod.writeFile;
  if (origWriteFile) {
    mod.writeFile = function (path, data, options, callback) {
      const cb = typeof options === 'function' ? options : callback;
      const opt = typeof options === 'function' ? undefined : options;

      return origWriteFile.call(mod, path, data, opt, (err) => {
        if (err && err.code === 'EPERM') {
          const redirected = redirectTypesPath(path);
          if (redirected !== path) {
            return origWriteFile.call(mod, redirected, data, opt, cb);
          }
        }
        return cb(err);
      });
    };
  }

  if (mod.promises && mod.promises.writeFile) {
    const origPromiseWriteFile = mod.promises.writeFile;
    mod.promises.writeFile = async function (path, data, options) {
      try {
        return await origPromiseWriteFile.call(mod.promises, path, data, options);
      } catch (err) {
        if (err && err.code === 'EPERM') {
          const redirected = redirectTypesPath(path);
          if (redirected !== path) {
            return await origPromiseWriteFile.call(mod.promises, redirected, data, options);
          }
        }
        throw err;
      }
    };
  }
});

