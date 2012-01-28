var ftpd = require('..')
ftpd.fsOptions.root = require('path').resolve(__dirname, 'data')
ftpd.on('listening', function () {
  var server = this, client = new FTPClient(server.address())
  client.on('connect', function () {
    console.log('connected')
    client.once('2xx', function () {
      client.send('USER', 'anonymous', function (code, message) {
        console.log('TODO ?')
        client.end()
      })
    })
  })
  client.on('close', function () {
    console.log('disconnected')
    server.close()
    server.on('close', function () {
      console.log('server closed')
    })
  })
})
ftpd.listen()


require('util').inherits(FTPClient, require('events').EventEmitter)

function FTPClient (address) {
  var self = this, client = this.client = require('net').createConnection(address.port, address.address)
  client.on('connect', function () { self.emit('connect', client) })
  client.on('close', function () { self.emit('close', client) })
  client.on('data', function (chunk) {
    var lines = chunk.toString().split('\n'), parts, status, text
    for (var i=0; i<lines.length; i++) {
      parts = trim(lines[i]).split(" ")
      status = parseInt(trim(parts[0]), 10)
      text = trim(parts.slice(1, parts.length).join(' '))
      self.emit('response', status, text)
      status = status.toString()
      self.emit(status, status, text)
      self.emit(status.substring(0, status.length-1) + 'x', status, text)
      self.emit(status.substring(0, status.length-2) + 'xx', status, text)
    }
  })
}

FTPClient.prototype.send = function (command, arg, callback) {
  this.client.write(command + ' ' + arg + '\r\n')
  this.once('response', function (code, message) {
    var err
    if (code % 500 < 100) {
      err = new Error(message)
    }
    callback(err, code, message)
  })
}

FTPClient.prototype.end = function () {
  this.client.end()
}

function trim (string) {
  return string.replace(/^\s+|\s+$/g,"")
}

/*
Statut :  Résolution de l'adresse de localhost
Statut :  Connexion à [::1]:21000...
Statut :  Échec de la tentative de connexion avec "ECONNREFUSED - Connection refused by server", essai de l'adresse suivante.
Statut :  Connexion à 127.0.0.1:21000...
Statut :  Connexion établie, attente du message d'accueil...
Réponse : 220 Service ready for new user.
Commande :  USER anonymous
Réponse : 331 User name okay, need password.
Commande :  PASS **************
Réponse : 230 User logged in, proceed.
Commande :  SYST
Réponse : 215 Node FTP featureless server
Commande :  FEAT
Réponse : 211-Extensions supported
Réponse : 211 End
Statut :  Connecté
Statut :  Récupération du contenu du dossier...
Commande :  PWD
Réponse : 257 "/"
Commande :  TYPE I
Réponse : 200 Command okay.
Commande :  PASV
Réponse : 227 PASV OK (0,0,0,0,226,209)
Commande :  LIST
Réponse : 150 File status okay; about to open data connection.
Réponse : 226 Closing data connection.
Statut :  Succès de la lecture du contenu du dossier
Statut :  Résolution de l'adresse de localhost
Statut :  Connexion à [::1]:21000...
Statut :  Échec de la tentative de connexion avec "ECONNREFUSED - Connection refused by server", essai de l'adresse suivante.
Statut :  Connexion à 127.0.0.1:21000...
Statut :  Connexion établie, attente du message d'accueil...
Réponse : 220 Service ready for new user.
Commande :  USER anonymous
Réponse : 331 User name okay, need password.
Commande :  PASS **************
Réponse : 230 User logged in, proceed.
Statut :  Connecté
Statut :  Démarrage de l'envoi de /home/nchambrier/Téléchargements/google-chrome-stable_current_i386.deb
Commande :  CWD /
Réponse : 250 Directory changed to "/"
Commande :  PWD
Réponse : 257 "/"
Commande :  TYPE I
Réponse : 200 Command okay.
Commande :  PASV
Réponse : 227 PASV OK (0,0,0,0,135,9)
Commande :  STOR google-chrome-stable_current_i386.deb
Réponse : 150 File status okay; about to open data connection.
Réponse : 226 Closing data connection.
Statut :  Transfert de fichier réussi, transféré 28,8 Mo en 1 seconde
Statut :  Récupération du contenu du dossier...
Commande :  PASV
Réponse : 227 PASV OK (0,0,0,0,135,242)
Commande :  LIST
Réponse : 150 File status okay; about to open data connection.
Réponse : 226 Closing data connection.
Statut :  Succès de la lecture du contenu du dossier
Statut :  Récupération du contenu du dossier...
Commande :  PASV
Réponse : 227 PASV OK (0,0,0,0,215,59)
Commande :  LIST
Réponse : 150 File status okay; about to open data connection.
Réponse : 226 Closing data connection.
Statut :  Succès de la lecture du contenu du dossier
Commande :  DELE google-chrome-stable_current_i386.deb
Réponse : 250 Requested file action okay, completed.
*/
