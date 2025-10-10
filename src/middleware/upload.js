const multer = require("multer")

const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 1_000_000 }, // 1MB
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype)
    if (!ok) return cb(new Error("Only image files are allowed"))
    cb(null, true)
  },
})

module.exports = { upload }
