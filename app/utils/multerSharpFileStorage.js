var fs = require('fs')
var sharp = require('sharp')
var os = require('os')
var path = require('path')
var crypto = require('crypto')
var exec = require('child_process').exec

function getFilename (req, file, cb) {
  crypto.pseudoRandomBytes(16, function (err, raw) {
    cb(err, err ? undefined : raw.toString('hex'))
  })
}

function getDestination (req, file, cb) {
  cb(null, os.tmpdir())
}

function MulterSharpFileStorage (opts) {
  this.getFilename = (opts.filename || getFilename)

  if (typeof opts.destination === 'string') {
    this.getDestination = function ($0, $1, cb) { cb(null, opts.destination) }
  } else {
    this.getDestination = (opts.destination || getDestination)
  }
}

MulterSharpFileStorage.prototype._handleFile = function _handleFile (req, file, cb) {
  var that = this

  that.getDestination(req, file, function (err, destination) {
    if (err) return cb(err)

    that.getFilename(req, file, function (err, filename) {
      if (err) return cb(err)

      var imgRegex = new RegExp(/^image\/(?:png|jpe?g).*/i);
      var videoRegex = new RegExp(/^video\/(?:avi|mp4|mpeg|quicktime).*/i);

      if (videoRegex.test(file.mimetype)) {
        destination = path.join(destination, 'videos')
      }

      var finalPath = path.join(destination, filename) + path.extname(file.originalname).toLowerCase()
      var outStream = fs.createWriteStream(finalPath)
      var hash = crypto.createHash('md5')

      file.stream.on('data', function (data) {
        hash.update(data)
      })

      outStream.on('error', cb)
      outStream.on('close', function () {
        var fileHash = hash.digest('hex')
        var newFinalPath = path.join(destination, fileHash) + ((videoRegex.test(file.mimetype)) ? '' : path.extname(file.originalname).toLowerCase())

        fs.stat(newFinalPath, function(err, stat) {
          if (err == null) {
            // File exists remove tmp file
            fs.unlink(finalPath);
          } else if (err.code == 'ENOENT') {
            // Rename tmp file to MD5 Hash name
            fs.rename(finalPath, newFinalPath, function (err) {

              // If video then generate thumbnail
              if (videoRegex.test(file.mimetype)) {
                exec("ffmpeg -i " + newFinalPath + " 2>&1 | grep 'Duration' | cut -d ' ' -f 4 | sed s/,//", function (error, stdout, stderr) {
                  var output = stdout || ''
                  var movieLengthString = output.trim() || '00:00:00.00'

                  var seconds = movieLengthString.split(':').reduceRight(function (prev, curr, i) {
                    return +prev + +curr * 60 * Math.pow(60, 1 - i)
                  })

                  exec('ffmpeg -ss ' + seconds/2 + ' -i ' + newFinalPath + ' -f image2 -vframes 1 ' + path.join(destination, fileHash) + '.png' + ' 2>&1', function(error, stdout, stderr) {
                    if (error) return console.error(error)
                    if (stderr) return console.error(stderr)

                    var thumbPath = path.join(destination, fileHash) + '.png'
                    var thumbReadStream = fs.createReadStream(thumbPath)
                    var generateThumb = sharp().rotate().resize(800, 800).blur(10).overlayWith(path.join(__dirname, 'movieOverlay.png'), 'center', 'center').on('error', function (err) {
                      cb(err);
                      fs.unlink(finalPath);
                    })

                    thumbReadStream.pipe(generateThumb).toFile(thumbPath)

                  });

                })

              }

            })
          }

          cb(null, {
            destination: destination,
            filename: fileHash,
            path: newFinalPath,
            size: outStream.bytesWritten,
            md5: fileHash
          })

        });
      })

      var resize = sharp().rotate().resize(800, 800).max().on('error', function (err) {
        cb(err);
        fs.unlink(finalPath);
      })

      if (imgRegex.test(file.mimetype)) {
        file.stream.pipe(resize).pipe(outStream)
      } else {
        file.stream.pipe(outStream)
      }
      

    })
  })
}

MulterSharpFileStorage.prototype._removeFile = function _removeFile (req, file, cb) {
  var path = file.path

  delete file.destination
  delete file.filename
  delete file.path

  fs.unlink(path, cb)
}

module.exports = function (opts) {
  return new MulterSharpFileStorage(opts)
}