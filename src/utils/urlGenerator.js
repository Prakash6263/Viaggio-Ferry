/**
 * Generate company slug + full website URL
 * Example:
 * "Sabihat Marine Services"
 * -> slug: "sabihat-marine-services"
 * -> website: "https://voyagian.com/sabihat-marine-services"
 */
const generateCompanyUrl = (companyName) => {
  if (!companyName) {
    return { slug: null, website: null }
  }

  const slug = companyName
    .toString()
    .trim()
    .toLowerCase()                 // ✅ lowercase
    .replace(/[^a-z0-9\s-]/g, "")  // remove special chars
    .replace(/\s+/g, "-")          // spaces → hyphen
    .replace(/-+/g, "-")           // remove duplicate hyphens

  const baseUrl = "https://voyagian.com"

  return {
    slug,
    website: `${baseUrl}/${slug}`,
  }
}

module.exports = { generateCompanyUrl }
