import { DBMarketListingComplete } from "../../../../clients/database/db-models.js"

interface FormattableListingType {
  type: string
  details: { title: string }
  listing: { listing_id: string }
}

export function formatListingSlug(title: string) {
  return title
    .toLocaleLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "")
}

export function formatMarketUrl(listing: DBMarketListingComplete) {
  return `/market/${listing?.listing?.listing_id}/#/${formatListingSlug(
    listing.details.title,
  )}`
}
