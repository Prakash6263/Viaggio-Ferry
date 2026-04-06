const multer = require("multer")
const path = require("path")
const fs = require("fs")

const adminUploadDir = path.join(__dirname, "../uploads/admin")
const companyUploadDir = path.join(__dirname, "../uploads/companies")
const whoWeAreUploadDir = path.join(__dirname, "../uploads/who-we-are")
const b2cUserUploadDir = path.join(__dirname, "../uploads/b2c-users") // Added B2C users upload directory
const userProfileUploadDir = path.join(__dirname, "../uploads/user-profiles") // User profile images
const shipUploadDir = path.join(__dirname, "../uploads/ships") // Ship documents upload directory

if (!fs.existsSync(adminUploadDir)) {
  fs.mkdirSync(adminUploadDir, { recursive: true })
}

if (!fs.existsSync(companyUploadDir)) {
  fs.mkdirSync(companyUploadDir, { recursive: true })
}

if (!fs.existsSync(whoWeAreUploadDir)) {
  fs.mkdirSync(whoWeAreUploadDir, { recursive: true })
}

if (!fs.existsSync(b2cUserUploadDir)) {
  // Create directory if it doesn't exist
  fs.mkdirSync(b2cUserUploadDir, { recursive: true })
}

if (!fs.existsSync(userProfileUploadDir)) {
  fs.mkdirSync(userProfileUploadDir, { recursive: true })
}

if (!fs.existsSync(shipUploadDir)) {
  fs.mkdirSync(shipUploadDir, { recursive: true })
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

const b2cUserStorage = multer.diskStorage({
  // Added storage configuration for B2C user profile images
  destination: (req, file, cb) => {
    cb(null, b2cUserUploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, "b2c-profile-" + uniqueSuffix + path.extname(file.originalname))
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

const shipDocumentFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "application/pdf",
  ]
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error("Only image files (PNG, JPEG, JPG, WebP) and PDF files are allowed"))
  }
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
      if (file.fieldname === "whoWeAreImage") {
        cb(null, whoWeAreUploadDir)
      } else if (file.fieldname === "adminProfileImage") {
        cb(null, adminUploadDir)
      } else {
        cb(null, companyUploadDir)
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)

      if (file.fieldname === "whoWeAreImage") {
        cb(null, "who-we-are-" + uniqueSuffix + path.extname(file.originalname))
      } else if (file.fieldname === "adminProfileImage") {
        cb(null, "admin-profile-" + uniqueSuffix + path.extname(file.originalname))
      } else {
        cb(null, "company-logo-" + uniqueSuffix + path.extname(file.originalname))
      }
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
})

const b2cUserUpload = multer({
  // Added multer instance for B2C user profile images
  storage: b2cUserStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
})

// User profile image storage
const userProfileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, userProfileUploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, "user-profile-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const userProfileUpload = multer({
  storage: userProfileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
})

const shipStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, shipUploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, "ship-doc-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const shipUpload = multer({
  storage: shipStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: shipDocumentFilter,
})

module.exports = {
  adminUpload,
  companyLogoUpload,
  b2cUserUpload, // Exported b2cUserUpload
  whoWeAreUpload,
  companyUpload,
  userProfileUpload, // User profile image upload
  shipUpload, // Ship documents upload
  companyMultiUpload: companyMultiUpload.fields([
    { name: "logo", maxCount: 1 },
    { name: "whoWeAreImage", maxCount: 1 },
    { name: "adminProfileImage", maxCount: 1 },
  ]),
}
