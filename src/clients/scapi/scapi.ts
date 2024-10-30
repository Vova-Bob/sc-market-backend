import { env } from "../../config/env.js"

const exampleRespSCAPI = {
  data: {
    affiliation: [],
    organization: {
      image:
        "https://robertsspaceindustries.com/media/3i0ohk9q1nmmlr/heap_infobox/DEICOMPANY-Logo.png",
      name: "Dutch East India Company",
      rank: "Board Member",
      sid: "DEICOMPANY",
      stars: 5,
    },
    profile: {
      badge: "2949 Pirate Aggressor",
      badge_image:
        "https://media.robertsspaceindustries.com/qcwc0o75z4j98/heap_thumb.png",
      bio: "afeb0cfe-1052-4c16-b298-32a25b005e8e",
      display: "Nobody",
      enlisted: "2019-05-02T00:00:00.000000",
      fluency: ["English", "French", "Japanese"],
      handle: "Khuzdul",
      id: "#2293707",
      image:
        "https://robertsspaceindustries.com/media/ji9zg5icdpr0ur/heap_infobox/P-The-Grand-Budapest-Hotel-Tony-Revolori.jpg",
      page: {
        title:
          "Nobody | Khuzdul - Dutch East India Company | DEICOMPANY (Board Member) - Roberts Space Industries | Follow the development of Star Citizen and Squadron 42",
        url: "https://robertsspaceindustries.com/citizens/Khuzdul",
      },
    },
  },
  message: "ok",
  source: "live",
  success: 1,
}

export async function fetchRSIProfileSCAPI(
  spectrum_id: string,
): Promise<typeof exampleRespSCAPI> {
  const url = `https://api.starcitizen-api.com/${
    env.SCAPI_KEY
  }/v1/live/user/${encodeURIComponent(spectrum_id)}`
  const result = await fetch(url)

  return (await result.json()) as typeof exampleRespSCAPI
}

const exampleOrgResp = {
  data: {
    archetype: "Corporation",
    banner:
      "https://robertsspaceindustries.com/media/420e9238f1804r/banner/DEICOMPANY-Banner.jpg",
    charter: {
      html: '<div class="markitup-text">\n\t\t\t\t\t\t\n\t\t\t\t\t</div>\n\t\t  \t\n',
      plaintext: "\n\t\t\t\t\t\t\n\t\t\t\t\t",
    },
    commitment: "Casual",
    focus: {
      primary: {
        image:
          "https://robertsspaceindustries.com/media/svml2z3iniikjr/icon/Trade.png",
        name: "Trading",
      },
      secondary: {
        image:
          "https://robertsspaceindustries.com/media/xhuvehkwn6qsnr/icon/Freelancing.png",
        name: "Freelancing",
      },
    },
    headline: {
      html: '<div class="body markitup-text">\n\t  \t<p>Welcome to the SC Market <span class="caps">RSI</span> page!</p>\n\n<p>Find us <a href="https://sc-market.space/" title="SC Market">here</a> and on <a href="https://discord.gg/YATfrNv5J5" title="Discord">Discord</a></p>\n\t  \t</div>\n\t  \t\n',
      plaintext:
        "\n\t  \tWelcome to the SC Market RSI page!\n\nFind us here and on Discord\n\t  \t",
    },
    history: {
      html: '<div class="markitup-text">\n\t\t\t\t\t\t\n\t        </div>\n\t\t  \t\n',
      plaintext: "\n\t\t\t\t\t\t\n\t        ",
    },
    href: "https://robertsspaceindustries.com/orgs/DEICOMPANY",
    lang: "English",
    logo: "https://robertsspaceindustries.com/media/3i0ohk9q1nmmlr/avatar/DEICOMPANY-Logo.jpg",
    manifesto: {
      html: '<div class="markitup-text">\n\t\t\t\t\t\t\n\t\t\t\t\t</div>\n\t\t  \t\n',
      plaintext: "\n\t\t\t\t\t\t\n\t\t\t\t\t",
    },
    members: 17,
    name: "SC Market",
    recruiting: true,
    roleplay: false,
    sid: "DEICOMPANY",
    url: "https://robertsspaceindustries.com/orgs/DEICOMPANY",
  },
  message: "ok",
  source: "live",
  success: 1,
}

export async function fetchRSIOrgSCAPI(
  spectrum_id: string,
): Promise<typeof exampleOrgResp> {
  const url = `https://api.starcitizen-api.com/${env.SCAPI_KEY}/v1/live/organization/${spectrum_id}`
  const result = await fetch(url)

  return (await result.json()) as typeof exampleOrgResp
}
