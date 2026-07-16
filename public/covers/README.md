# Game cover images

Drop cover art here to give any game a real picture in the catalog.

## How it works

1. Save an image in this folder named after the game's **slug**:
   `public/covers/<slug>.jpg` (also accepts `.jpeg`, `.png`, `.webp`, `.avif`, `.gif`).
2. Run `npm run db:seed` to pick up the new covers.
3. Refresh the site — the game now shows your image.

A manual file here **wins over** the built-in Steam cover, so you can also
replace any existing cover, not just fill in the blanks.

## Image tips

- **Landscape** looks best — the tile crops to a wide strip.
- Steam header art is `460×215`; anything around that ratio (roughly 2:1) works great.
- Keep files reasonably small (a few hundred KB); large images just slow the page.

## Cover status

Every game in the catalog currently has a cover. The six non-Steam games use
manual images in this folder:

`fortnite.jpg`, `genshin-impact.jpg`, `league-of-legends.jpg`, `minecraft.jpg`,
`valorant.jpg`, `world-of-warcraft.jpg`

Replace any of these — or drop a file for a Steam game to override its cover.

## All slugs (in case you want to override a Steam cover too)

`a-way-out`, `apex-legends`, `baldurs-gate-iii`, `barotrauma`, `bloons-td-6`,
`call-of-duty-mwiii`, `chained-together`, `core-keeper`, `counter-strike-2`,
`dead-by-daylight`, `deep-rock-galactic`, `dont-starve-together`, `dota-2`,
`elden-ring`, `enshrouded`, `fall-guys`, `fortnite`, `genshin-impact`, `grounded`,
`gta-v`, `gtfo`, `golf-with-your-friends`, `helldivers-2`, `it-takes-two`,
`league-of-legends`, `left-4-dead-2`, `lethal-company`, `minecraft`, `once-human`,
`overcooked-2`, `overwatch`, `palworld`, `phasmophobia`, `project-zomboid`, `pubg`,
`raft`, `rainbow-six-siege`, `risk-of-rain-2`, `rocket-league`, `rust`,
`satisfactory`, `sons-of-the-forest`, `split-fiction`, `stardew-valley`, `terraria`,
`valheim`, `valorant`, `war-thunder`, `world-of-warcraft`
</content>
