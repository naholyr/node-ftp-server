[![Build Status](https://secure.travis-ci.org/naholyr/node-ftp-server.png)](http://travis-ci.org/naholyr/node-ftp-server)

# FTP Server -- Simple featureless FTP server

This is a very simple FTP server. At first it's aimed to simply provide a full-Node implementation of FTP server to be embedded for Unit Testing purpose.

It's currently highly experimental and could crash anytime. It could become a real FTP server if you want to contribute a bit ;) Don't be afraid: FTP protocol is quite simple.

## Install

```bash
# Using NPM
npm install ftp-server
```

Or from source:

```bash
# Install from sources...
git clone git://github.com/naholyr/node-ftp-server.git ftp-server
cd ftp-server
npm link

# ...Then in your project
npm link ftp-server
```

You can run unit tests:

```bash
# From your project where ftp-server has been installed as a module
npm test ftp-server

# Or directly from ftp-server
npm test
```

## Usage

Example: Simply serve a given directory:

```javascript
var ftpd = require('ftp-server')
// Path to your FTP root
ftpd.fsOptions.root = '/path/to/ftp-root'
// Start listening on port 21 (you need to be root for ports < 1024)
ftpd.listen(21)
```

## Extend server

Just look at the code. I'll fully document the ways to extend the server with additional features when it's at least more stable.

## Paternity

Note that the original implementation I based my work on was [@billywhizz 's from GitHub](https://github.com/billywhizz/nodeftpd).

## Roadmap

 * Add support for rename commands
 * Better implementation of `LIST` and `NLST` to be cross-platform
 * Add support for `REST` command (restart an interrupted download)
 * Maybe wrap all this stuff in a class or at least a function with options (like what FS we'll use)
 * Add better documentation on how to extend server (add "features") or new FS wrappers
 * Implement MemoryFS
 * Support authentication from config or even from database
 * Implement all the RFCs from FTP protocol
