const multer = require("multer")
const path = require("path")
const fs = require("fs")

const adminUploadDir = path.join(__dirname, "../uploads/admin")
const companyUploadDir = path.join(__dirname, "../uploads/companies")
const whoWeAreUploadDir = path.join(__dirname, "../uploads/who-we-are")

if (!fs.existsSync(adminUploadDir)) {
  fs.mkdirSync(adminUploadDir, { recursive: true })
}

if (!fs.existsSync(companyUploadDir)) {
  fs.mkdirSync(companyUploadDir, { recursive: true })
}

if (!fs.existsSync(whoWeAreUploadDir)) {
  fs.mkdirSync(whoWeAreUploadDir, { recursive: true })
}

const adminStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, adminUploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, "admin-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const companyStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, companyUploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, "company-logo-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const whoWeAreStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, whoWeAreUploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, "who-we-are-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const fileFilter = (req, file, cb) => {
  const ok = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype)
  if (!ok) return cb(new Error("Only image files are allowed"))
  cb(null, true)
}

const adminUpload = multer({
  storage: adminStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
})

const companyLogoUpload = multer({
  storage: companyStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
})

const whoWeAreUpload = multer({
  storage: whoWeAreStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
})

const companyUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, companyUploadDir)
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
      const prefix = file.fieldname === "whoWeAreImage" ? "who-we-are-" : "company-logo-"
      cb(null, prefix + uniqueSuffix + path.extname(file.originalname))
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
})

const companyMultiUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, companyUploadDir)
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
      let prefix = "company-logo-"
      if (file.fieldname === "whoWeAreImage") prefix = "who-we-are-"
      if (file.fieldname === "adminProfileImage") prefix = "admin-profile-"
      cb(null, prefix + uniqueSuffix + path.extname(file.originalname))
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
})

module.exports = {
  adminUpload,
  companyLogoUpload,
  whoWeAreUpload,
  companyUpload,
  companyMultiUpload: companyMultiUpload.fields([
    { name: "logo", maxCount: 1 },
    { name: "whoWeAreImage", maxCount: 1 },
    { name: "adminProfileImage", maxCount: 1 },
  ]),
}
