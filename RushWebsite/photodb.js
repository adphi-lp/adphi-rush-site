var tools = require('./tools');
var fs = require('fs');

var PHOTO_DIR = '/public/img/';
var DEFAULT_PHOTO = 'no_photo.jpg';
var DEFAULT_PHOTO_PATH = getPhotoPath(DEFAULT_PHOTO);
var PHOTO_NAME_LENGTH = 10;

function getPhotoPath(filename) {
    return PHOTO_DIR + filename;
}

function getFilePath(filename) {
    return __dirname + getPhotoPath(filename);
}

/**
 * Uploads the given photo with a random filename if the photo.size is non-zero
 * @param photo the new photo
 * @param oldPath the old path of the photo
 * @param callback callback function that receives err, filename of photo
 */
function uploadPhotoIf(photo, oldPath, callback) {
    if (photo.size === 0) {
        callback(null, oldPath);
        return;
    }

    var filename = tools.randomString(PHOTO_NAME_LENGTH, '') + '.' + tools.extension(photo.name);

    fs.readFile(photo.path, function (err, data) {
        if (err !== null && err !== undefined) {
            callback(err, oldPath);
            return;
        }

        var newPath = getFilePath(filename);
        fs.writeFile(newPath, data, function (err) {
            if (err !== null && err != undefined) {
                // log the error
                console.log('uploadpath: ' + photo.path);
                console.log('photopath: ' + newPath);
                console.log(err);
                return;
            }

            callback(err, getPhotoPath(filename));
        });
    });
}

function uploadPhoto(photo, callback) {
    uploadPhotoIf(photo, DEFAULT_PHOTO_PATH, callback)
}

module.exports = {
    PHOTO_DIR: PHOTO_DIR,
    DEFAULT_PHOTO: DEFAULT_PHOTO,
    DEFAULT_PHOTO_PATH: DEFAULT_PHOTO_PATH,
    PHOTO_NAME_LENGTH: PHOTO_NAME_LENGTH,
    uploadPhoto: uploadPhoto,
    uploadPhotoIf: uploadPhotoIf
};