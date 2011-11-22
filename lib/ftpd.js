var path = require('path')
  , net = require('net')
  , server = module.exports = net.createServer()
  , commands
  , messages

/**
 * FS emulator
 */
var fsWrapper = require('./fs')
server.fsOptions = {}

/**
 * Patch server.close
 */
server.closing = false
var original_server_close = server.close
server.close = function () {
  this.closing = true
  original_server_close.call(this)
}

/**
 * Some information when listening (should be removed)
 */
server.on('listening', function () {
  console.log('Server listening on ' + server.address().address + ':' + server.address().port)
})

/**
 * When server receives a new client socket
 */
server.on('connection', function (socket) {
  /**
   * Configure client connection info
   */
  socket.setTimeout(0)
  socket.setNoDelay()
  socket.dataEncoding = "binary"
  socket.passive = false
  socket.dataInfo = null
  socket.username = null

  /**
   * Initialize filesystem
   */
  socket.fs = new fsWrapper.Filesystem(server.fsOptions)
  // Catch-all
  socket.fs.onError = function (err) {
    if (!err.code) err.code = 550
    socket.reply(err.code, err.message)
  }

  /**
   * Socket response shortcut
   */
  socket.server = server
  socket.reply = function (status, message, callback) {
    if (!message) message = messages[status.toString()] || 'No information'
    this.write(status.toString() + ' ' + message.toString() + '\r\n', callback)
  }

  /**
   * Data transfer
   */
  socket.dataTransfer = function (handle) {
    function finish (dataSocket) {
      return function (err) {
        if (err) {
          dataSocket.emit('error', err)
        } else {
          dataSocket.end()
        }
      }
    }
    function execute () {
      socket.reply(150)
      handle.call(socket, this, finish(this))
    }
    // Will be unqueued in PASV command
    if (socket.passive) {
      socket.dataTransfer.queue.push(execute)
    }
    // Or we initialize directly the connection to the client
    else {
      dataSocket = net.createConnection(socket.dataInfo.port, socket.dataInfo.host)
      dataSocket.on('connect', execute)
    }
  }
  socket.dataTransfer.queue = []

  /**
   * When socket has established connection, reply with a hello message
   */
  socket.on('connect', function () {
    socket.reply(220)
  })

  /**
   * Received a command from socket
   */
  socket.on('data', function (chunk) {
    /**
     * If server is closing, refuse all commands
     */
    if (server.closing) {
      socket.reply(421)
    }
    /**
     * Parse received command and reply accordingly
     */
    var parts = trim(chunk.toString()).split(" ")
      , command = trim(parts[0]).toUpperCase()
      , args = parts.slice(1, parts.length)
      , callable = commands[command]
    if (!callable) {
      socket.reply(502)
    } else {
      callable.apply(socket, args)
    }
  })
})

/**
 * Standard messages for status (RFC 959)
 */
messages = exports.messages = {
  "200": "Command okay.",
  "500": "Syntax error, command unrecognized.", // This may include errors such as command line too long.
  "501": "Syntax error in parameters or arguments.",
  "202": "Command not implemented, superfluous at this site.",
  "502": "Command not implemented.",
  "503": "Bad sequence of commands.",
  "504": "Command not implemented for that parameter.",
  "110": "Restart marker reply.", // In this case, the text is exact and not left to the particular implementation; it must read: MARK yyyy = mmmm Where yyyy is User-process data stream marker, and mmmm server's equivalent marker (note the spaces between markers and "=").
  "211": "System status, or system help reply.",
  "212": "Directory status.",
  "213": "File status.",
  "214": "Help message.", // On how to use the server or the meaning of a particular non-standard command. This reply is useful only to the human user.
  "215": "NodeFTP server emulator.", // NAME system type. Where NAME is an official system name from the list in the Assigned Numbers document.
  "120": "Service ready in %s minutes.",
  "220": "Service ready for new user.",
  "221": "Service closing control connection.", // Logged out if appropriate.
  "421": "Service not available, closing control connection.", // This may be a reply to any command if the service knows it must shut down.
  "125": "Data connection already open; transfer starting.",
  "225": "Data connection open; no transfer in progress.",
  "425": "Can't open data connection.",
  "226": "Closing data connection.", // Requested file action successful (for example, file transfer or file abort).
  "426": "Connection closed; transfer aborted.",
  "227": "Entering Passive Mode.", // (h1,h2,h3,h4,p1,p2).
  "230": "User logged in, proceed.",
  "530": "Not logged in.",
  "331": "User name okay, need password.",
  "332": "Need account for login.",
  "532": "Need account for storing files.",
  "150": "File status okay; about to open data connection.",
  "250": "Requested file action okay, completed.",
  "257": "\"%s\" created.",
  "350": "Requested file action pending further information.",
  "450": "Requested file action not taken.", // File unavailable (e.g., file busy).
  "550": "Requested action not taken.", // File unavailable (e.g., file not found, no access).
  "451": "Requested action aborted. Local error in processing.",
  "551": "Requested action aborted. Page type unknown.",
  "452": "Requested action not taken.", // Insufficient storage space in system.
  "552": "Requested file action aborted.", // Exceeded storage allocation (for current directory or dataset).
  "553": "Requested action not taken.", // File name not allowed.
}

/**
 * Commands implemented by the FTP server
 */
commands = exports.commands = {
  /**
   * Unsupported commands
   * They're specifically listed here as a roadmap, but any unexisting command will reply with 202 Not supported
   */
  "ABOR": function () { this.reply(202) }, // Abort an active file transfer.
  "ACCT": function () { this.reply(202) }, // Account information
  "ADAT": function () { this.reply(202) }, // Authentication/Security Data (RFC 2228)
  "ALLO": function () { this.reply(202) }, // Allocate sufficient disk space to receive a file.
  "APPE": function () { this.reply(202) }, // Append.
  "AUTH": function () { this.reply(202) }, // Authentication/Security Mechanism (RFC 2228)
  "CCC":  function () { this.reply(202) }, // Clear Command Channel (RFC 2228)
  "CONF": function () { this.reply(202) }, // Confidentiality Protection Command (RFC 697)
  "ENC":  function () { this.reply(202) }, // Privacy Protected Channel (RFC 2228)
  "EPRT": function () { this.reply(202) }, // Specifies an extended address and port to which the server should connect. (RFC 2428)
  "EPSV": function () { this.reply(202) }, // Enter extended passive mode. (RFC 2428)
  "HELP": function () { this.reply(202) }, // Returns usage documentation on a command if specified, else a general help document is returned.
  "LANG": function () { this.reply(202) }, // Language Negotiation (RFC 2640)
  "LPRT": function () { this.reply(202) }, // Specifies a long address and port to which the server should connect. (RFC 1639)
  "LPSV": function () { this.reply(202) }, // Enter long passive mode. (RFC 1639)
  "MDTM": function () { this.reply(202) }, // Return the last-modified time of a specified file. (RFC 3659)
  "MIC":  function () { this.reply(202) }, // Integrity Protected Command (RFC 2228)
  "MKD":  function () { this.reply(202) }, // Make directory.
  "MLSD": function () { this.reply(202) }, // Lists the contents of a directory if a directory is named. (RFC 3659)
  "MLST": function () { this.reply(202) }, // Provides data about exactly the object named on its command line, and no others. (RFC 3659)
  "MODE": function () { this.reply(202) }, // Sets the transfer mode (Stream, Block, or Compressed).
  "NOOP": function () { this.reply(202) }, // No operation (dummy packet; used mostly on keepalives).
  "OPTS": function () { this.reply(202) }, // Select options for a feature. (RFC 2389)
  "REIN": function () { this.reply(202) }, // Re initializes the connection.
  "STOU": function () { this.reply(202) }, // Store file uniquely.
  "STRU": function () { this.reply(202) }, // Set file transfer structure.
  "PBSZ": function () { this.reply(202) }, // Protection Buffer Size (RFC 2228)
  "SITE": function () { this.reply(202) }, // Sends site specific commands to remote server.
  "SMNT": function () { this.reply(202) }, // Mount file structure.
  "RMD":  function () { this.reply(202) }, // Remove a directory.
  "STAT": function () { this.reply(202) }, //
  /**
   * General info
   */
  "FEAT": function () {
    this.write('211-Extensions supported\r\n')
    // No feature
    this.reply(211, 'End')
  },
  "SYST": function () {
    this.reply(215, 'Node FTP featureless server')
  },
  /**
   * Path commands
   */
  "CDUP": function () { // Change to parent directory
    commands.CWD.call(this, '..')
  },
  "CWD":  function (dir) { // Change working directory
    var socket = this
    socket.fs.chdir(dir, function (cwd) {
      socket.reply(250, 'Directory changed to "' + cwd + '"')
    })
  },
  "PWD":  function () { // Get working directory
    this.reply(257, '"' + this.fs.pwd() + '"')
  },
  "XPWD": function() { // Alias to PWD
    commands.PWD.call(this)
  },
  /**
   * Change data encoding
   */
  "TYPE": function (dataEncoding) {
    if (dataEncoding == "A" || dataEncoding == "I") {
      this.dataEncoding = (dataEncoding == "A") ? "ascii" : "binary"
      this.reply(200)
    } else {
      this.reply(501)
    }
  },
  /**
   * Authentication
   */
  "USER": function (username) {
    this.username = username
    this.reply(331)
  },
  "PASS": function (password) {
    // Automatically accept password
    this.reply(230)
  },
  /**
   * Passive mode
   */
  "PASV": function () { // Enter passive mode
    var socket = this
      , dataServer = net.createServer()
    socket.passive = true
    dataServer.on('connection', function (dataSocket) {
      dataSocket.setEncoding(socket.dataEncoding)
      dataSocket.on('connect', function () {
        // Unqueue method that has been queued previously
        if (socket.dataTransfer.queue.length) {
          socket.dataTransfer.queue.shift().call(dataSocket)
        } else {
          dataSocket.emit('error', {"code": 421})
          socket.end()
        }
      }).on('close', function () {
        socket.reply(this.error ? 426 : 226)
        dataServer.close()
      }).on('error', function (err) {
        this.error = err
        socket.reply(err.code || 500, err.message)
      })
    }).on('listening', function () {
      var port = this.address().port
        , host = server.address().address
      socket.dataInfo = { "host": host, "port": port }
      socket.reply(227, 'PASV OK (' + host.split('.').join(',') + ',' + parseInt(port/256,10) + ',' + (port%256) + ')')
    }).listen()
  },
  /**
   * TODO Active mode
   */
  "PORT": function (info) {
    this.reply(202)
    // Specifies an address and port to which the server should connect.
    /*socket.passive = false;
    var addr = command[1].split(",");
    socket.pasvhost = addr[0]+"."+addr[1]+"."+addr[2]+"."+addr[3];
    socket.pasvport = (parseInt(addr[4]) * 256) + parseInt(addr[5]);
    socket.send("200 PORT command successful.\r\n");*/
  },
  /**
   * Filesystem
   */
  "LIST": function (target) {
    var socket = this
    socket.dataTransfer(function (dataSocket, finish) {
      socket.fs.list(target || socket.fs.pwd(), function (result) {
        dataSocket.write(result + '\r\n', finish)
      })
    })
  },
  "NLST": function (target) {
    // TODO: just the list of file names
    this.reply(202)
  },
  "RETR": function (file) {
    var socket = this
    socket.dataTransfer(function (dataSocket, finish) {
      socket.fs.readFile(file, function (stream) {
        stream.pipe(dataSocket)
      })
    })
  },
  "STOR": function (file) {
    var socket = this
    socket.dataTransfer(function (dataSocket, finish) {
      socket.fs.writeFile(file, function (stream) {
        dataSocket.pipe(stream)
      })
    })
  },
  "DELE": function (file) {
    var socket = this
    socket.fs.unlink(file, function () {
      socket.reply(250)
    })
  },
  "RNFR": function (name) {
    this.reply(202)
    // Rename from.
    /*socket.filefrom = socket.fs.cwd() + command[1].trim();
    socket.send("350 File exists, ready for destination name.\r\n");*/
  },
  "RNTO": function (name) {
    this.reply(202)
    // Rename to.
    /*var fileto = socket.fs.cwd() + command[1].trim();
    rn = sys.exec("mv " + socket.filefrom + " " + fileto);
    rn.addCallback(function (stdout, stderr) {
      socket.send("250 file renamed successfully\r\n");
    });
    rn.addErrback(function () {
      socket.send("250 file renamed successfully\r\n");
    });*/
  },
  /**
   * Allow restart interrupted transfer
   */
  "REST": function (start) {
    this.reply(202)
    // Restart transfer from the specified point.
    /*socket.totsize = parseInt(command[1].trim());
    socket.send("350 Rest supported. Restarting at " + socket.totsize + "\r\n");*/
  },
  /**
   * Disconnection
   */
  "QUIT": function () {
    this.reply(221)
    this.end()
  }
}

function trim (string) {
  return string.replace(/^\s+|\s+$/g,"")
}

if (!module.parent) {
  server.fsOptions.root = path.resolve(__dirname, '..', 'test', 'data')
  server.listen(21)
}
