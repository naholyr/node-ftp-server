var Base  = require('./fs').Base
  , util  = require('util')
  , path  = require('path')
  , fs    = require('fs')
  , spawn = require('child_process').spawn

module.exports = Filesystem

util.inherits(Filesystem, Base)

function Filesystem (options) {
  Base.call(this, options)

  this.cwd = ''
}

Filesystem.prototype.pwd = function () {
  return '/' + this.cwd
}

Filesystem.prototype.chdir = function (dir, cb) {
  var new_cwd
  if (dir.match(/^\//)) { // Absolute
    new_cwd = dir.substring(1)
  } else { // Relative
    if (path.relative(this.cwd, dir).match(/^\.\./)) {
      // Tried to go farther than root
      return this.respond(cb, {"code": 431, "message": 'Root it root'})
    }
    new_cwd = path.join(this.cwd, dir)
  }
  var self = this
  fs.stat(path.join(this.options.root, new_cwd), function (err, stats) {
    if (err || !stats.isDirectory()) {
      self.respond(cb, {"code": 431, "message": 'No such directory'})
    } else {
      self.cwd = new_cwd
      self.respond(cb, null, ['/' + new_cwd])
    }
  })
}

Filesystem.prototype.list = function (dir, cb) {
  var self = this
    , target = path.join(this.options.root, this.cwd)
  path.exists(target, function (exists) {
    if (!exists) {
      self.respond(cb, {"code": 431, "message": 'No such directory'})
    } else {
      var ls = spawn('ls', ['-l', target])
        , result = ''
      ls.stdout.on('data', function (chunk) {
        result += chunk.toString()
      })
      ls.on('exit', function (code) {
        var lines = result.split('\n')
        result = lines.slice(1, lines.length).join('\r\n')
        var err
        if (code != 0) {
          err = {}
        }
        self.respond(cb, null, [result])
      })
    }
  })
}

Filesystem.prototype.readFile = function (file, cb) {
  var self = this
    , target = path.join(this.options.root, this.cwd, file)
  fs.stat(target, function (err, stats) {
    if (err || !stats.isFile()) {
      self.respond(cb, {"code": 431, "message": 'No such file'})
    } else {
      self.respond(cb, null, [fs.createReadStream(target)])
    }
  })
}

Filesystem.prototype.writeFile = function (file, cb) {
  this.respond(cb, null, [fs.createWriteStream(path.join(this.options.root, this.cwd, file))])
}

Filesystem.prototype.unlink = function (file, cb) {
  var self = this
  fs.unlink(path.join(this.options.root, this.cwd, file), function (err) {
    self.respond(cb, err)
  })
}
