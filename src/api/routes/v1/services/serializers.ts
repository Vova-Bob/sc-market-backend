import { DBService } from "../../../../clients/database/db-models.js"
import { database } from "../../../../clients/database/knex-db.js"

export async function serializeService(service: DBService) {
  const photos = await database.getServiceListingImagesResolved({
    service_id: service.service_id,
  })

  return {
    service_id: service.service_id,
    timestamp: service.timestamp,
    status: service.status,
    kind: service.kind,
    description: service.description,
    cost: +service.cost,
    title: service.title,
    service_name: service.service_name,
    service_description: service.service_description,
    collateral: service.collateral,
    departure: service.departure,
    destination: service.destination,
    rush: service.rush,
    offer: service.offer,
    payment_type: service.payment_type,
    user: service.user_id
      ? await database.getMinimalUser({ user_id: service.user_id })
      : null,
    contractor: service.contractor_id
      ? await database.getMinimalContractor({
          contractor_id: service.contractor_id,
        })
      : null,
    photos,
  }
}
