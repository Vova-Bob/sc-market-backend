import { database } from "../clients/database/knex-db.js"
import { createOffer } from "../api/routes/v1/orders/helpers.js"
import {
  DBAuctionDetails,
  DBMarketListing,
} from "../clients/database/db-models.js"
import { t } from "../api/routes/v1/util/i18n.js"

export async function process_auction(auction: DBAuctionDetails) {
  const complete = await database.getMarketListingComplete(auction.listing_id)
  if (complete.listing.status === "archived") {
    return
  }

  const bids = await database.getMarketBids({ listing_id: auction.listing_id })

  if (bids.length) {
    const winning_bid = bids.reduce((a, b) => (a.bid > b.bid ? a : b))
    const winner = await database.getUser({
      user_id: winning_bid.user_bidder_id,
    })

    const quantity = 1
    // TODO: Fix auctions with new offer system
    const _ = await createOffer(
      {
        assigned_id: complete.listing.user_seller_id,
        contractor_id: complete.listing.contractor_seller_id,
        customer_id: winner.user_id,
      },
      {
        actor_id: winner.user_id,
        kind: "Delivery",
        cost: (+winning_bid.bid * quantity).toString(),
        title: t("market.delivery.itemSoldTitle", {
          title: complete.details.title,
          quantity,
          username: winner.username,
        }),
        description: t("market.delivery.itemSoldDescription", {
          title: complete.details.title,
          quantity,
          username: winner.username,
          description: complete.details.description,
        }),
      },
      [{ quantity, listing: complete }],
    )
  }

  await database.updateAuctionDetails(
    { listing_id: auction.listing_id },
    { status: "concluded" },
  )
  await database.updateMarketListing(auction.listing_id, { status: "archived" })
}

export async function process_auctions() {
  const auctions = await database.getExpiringAuctions()
  auctions.forEach((a) =>
    setTimeout(
      () => process_auction(a),
      a.end_time.getTime() - new Date().getTime(),
    ),
  )
}

export async function process_expiring_market_listing(
  listing: DBMarketListing,
) {
  console.log(`Expiring listing ${listing.listing_id}`)
  await database.updateMarketListing(listing.listing_id, { status: "inactive" })
}

export async function process_expiring_market_listings() {
  const listings = await database.getExpiringMarketListings()
  listings.forEach((a) =>
    setTimeout(
      () => process_expiring_market_listing(a),
      a.expiration.getTime() - new Date().getTime(),
    ),
  )
}

export async function rebuild_search_view() {
  await database.rebuildMarket()
}

export async function update_price_history() {
  await database.updatePriceHistpry()
}
