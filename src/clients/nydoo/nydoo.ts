import { env } from "../../config/env.js"

const exampleRespNydoo = {
  data: [
    {
      user_handle: "Khuzdul",
      status: 202,
      user_displayname: "Khuzdul",
      user_profile_image:
        "https://robertsspaceindustries.com/media/ji9zg5icdpr0ur/heap_infobox/P-The-Grand-Budapest-Hotel-Tony-Revolori.jpg",
      user_biography:
        "\n efeabb84-3382-40c5-b011-0f53c290b9af\nafeb0cfe-1052-4c16-b298-32a25b005e8e\n\n123123\n ",
      user_org_main_handle: "BWINCORP",
      user_org_affiliate_handles: ["NYDOO", "SCMARKET", "DEICOMPANY"],
    },
  ],
  data_count: 1,
  exit_code: 1,
  exit_message: "SUCCESS",
}

export async function fetchRSIProfileNydoo(
  spectrum_id: string,
): Promise<typeof exampleRespNydoo> {
  const url = `https://nydoo.org/api/v2/user/get?identifier_type=handle&identifier_value=${encodeURIComponent(
    spectrum_id,
  )}&cached=0`
  const result = await fetch(url, {
    headers: {
      "Auth-Token": env.NYDOO_KEY || "",
      Mail: env.NYDOO_EMAIL || "",
    },
  })

  return (await result.json()) as typeof exampleRespNydoo
}
