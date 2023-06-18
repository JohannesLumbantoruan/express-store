const fs = require('fs').promises;

async function deleteFile(path) {
    try {
        await fs.unlink(path);
    } catch(e) {
        throw e;
    }
}

module.exports = deleteFile;