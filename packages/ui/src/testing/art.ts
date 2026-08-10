/** Arte inline para fixtures: nenhuma story depende de uma imagem de terceiro estar no ar. */
function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const MONSTER_ART = {
  pyrelisk: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" fill="#f08030"/>' +
      '<circle cx="32" cy="32" r="20" fill="#fff4e0"/>' +
      '<circle cx="24" cy="28" r="4" fill="#2b1a12"/>' +
      '<circle cx="40" cy="28" r="4" fill="#2b1a12"/>' +
      '</svg>',
  ),
  aquashell: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" fill="#6890f0"/>' +
      '<rect x="12" y="12" width="40" height="40" rx="10" fill="#e0f0ff"/>' +
      '<circle cx="24" cy="28" r="4" fill="#12233f"/>' +
      '<circle cx="40" cy="28" r="4" fill="#12233f"/>' +
      '</svg>',
  ),
  duskfang: svgDataUri(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" fill="#705898"/>' +
      '<polygon points="32,10 54,52 10,52" fill="#efe6ff"/>' +
      '<circle cx="26" cy="42" r="3" fill="#241a3a"/>' +
      '<circle cx="38" cy="42" r="3" fill="#241a3a"/>' +
      '</svg>',
  ),
} as const;
