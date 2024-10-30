import { cdn } from "../../../../clients/cdn/cdn.js"
import { database } from "../../../../clients/database/knex-db.js"

export async function createServicePhotos(
  service_id: string,
  photos: string[],
) {
  for (const photo of photos) {
    const resource = await cdn.createExternalResource(
      photo,
      service_id + `_photo_${0}`,
    )

    await database.insertServiceImage({
      resource_id: resource.resource_id,
      service_id,
    })
  }
}
