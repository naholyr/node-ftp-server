exports.Base = Base
exports.Filesystem = require('./fs.filesystem.js')
// TODO exports.Memory = require('./fs.memory.js')

function Base (options) {
  this.options = options
}

Base.prototype.respond = function (cb, err, args) {
  if (this.onError) {
    if (err) {
      this.onError(err)
    } else {
      cb.apply(this, args || [])
    }
  } else {
    args.unshift(err)
    cb.apply(this, args || [])
  }
}

Base.prototype.chdir = function (dir, cb) {
  this.respond(cb, new Error('Not implemented yet'))
}

Base.prototype.pwd = function () {
  throw new Error('Not implemented yet')
}

