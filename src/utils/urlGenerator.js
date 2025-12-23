/**
 * Generate a slugified URL from company name
 * Example: "Sabihat Marine Services" -> "Sabihat-Marine-Services"
 */
const generateCompanyUrl = (companyName) => {
  if (!companyName) return null

  // Remove extra whitespace and replace spaces with hyphens
  const slug = companyName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "") // Remove special characters

  const baseUrl = "https://voyagian.com"
  return `${baseUrl}/${slug}`
}

module.exports = { generateCompanyUrl }
