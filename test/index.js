var ftpd = require('..')
ftpd.fsOptions.root = require('path').resolve(__dirname, 'data')
ftpd.listen().on('listening', function () {
  var server = this
    , address = server.address()
    , client = require('net').connect(address.port, address.address)
  client.on('connect', function () {
    console.log('client started')
    setTimeout(function () { client.end() }, 1000)
  })
  client.on('close', function () {
    console.log('client closed')
    server.close()
    server.on('close', function () {
      console.log('server closed')
    })
  })
})
