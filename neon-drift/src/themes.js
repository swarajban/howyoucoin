export const THEMES = {
  orbit: {
    name: 'Prism Orbit', subtitle: 'A rainbow ribbon through the rings of Saturn', edition: '04 / PRISM ORBIT',
    skyTop: '#030311', horizon: '#151031', fog: '#100e29', accent: '#d1c1ff',
    road: '#372971', edge: '#c4faff', block: '#3e507e', blockGlow: '#6765ff',
    marble: '#eee5ff', marbleGlow: '#312275', hemisphere: '#c7d3ff', ground: '#39183b',
    sun: '#ae7dff', key: '#dbe9ff', rim: '#ff8cda', bloom: .48, exposure: 1.1, kind: 3,
    sectors: ['STARBOUND', 'RINGS OF SATURN', 'COSMIC CURRENT', 'HYPERSPACE', 'BEYOND INFINITY']
  },
  abyss: {
    name: 'Abyssal Bloom', subtitle: 'Bioluminescent jellyfish in a midnight ocean', edition: '05 / ABYSSAL BLOOM',
    skyTop: '#041d30', horizon: '#04272c', fog: '#03212b', accent: '#a7ffea',
    road: '#10545b', edge: '#59e8d4', block: '#426e79', blockGlow: '#29b6aa',
    marble: '#c9faff', marbleGlow: '#0b494e', hemisphere: '#74cbd1', ground: '#05182d',
    sun: '#61eadf', key: '#c1ffff', rim: '#cb7dff', bloom: .5, exposure: 1.2, kind: 4,
    sectors: ['THE BLUE HOUR', 'GLOW GARDEN', 'DEEP CURRENT', 'MIDNIGHT REEF', 'INTO THE ABYSS']
  },
  dunes: {
    name: 'Golden Dunes', subtitle: 'Sandstone canyons · golden-hour light', edition: '01 / GOLDEN DUNES',
    skyTop: '#7db6c8', horizon: '#efcfa2', fog: '#d3b68d', accent: '#ffdca5',
    road: '#925f42', edge: '#e3bf87', block: '#984c42', blockGlow: '#6b3026',
    marble: '#fff4dc', marbleGlow: '#3a1807', hemisphere: '#fff2d4', ground: '#9a593b',
    sun: '#ffe8b3', key: '#ffe2a7', rim: '#d1edff', bloom: .17, exposure: 1.1, kind: 1,
    sectors: ['GOLDEN HOUR', 'CANYON RUN', 'DUST & THUNDER', 'SUN CHASER', 'BEYOND THE DUNES']
  },
  forest: {
    name: 'Cloud Forest', subtitle: 'Floating islands · a miniature woodland', edition: '02 / CLOUD FOREST',
    skyTop: '#87bec9', horizon: '#def0d3', fog: '#bdd8cd', accent: '#c9f5d5',
    road: '#789e86', edge: '#d3e5b7', block: '#db9870', blockGlow: '#64452c',
    marble: '#c7f6ed', marbleGlow: '#092723', hemisphere: '#efffef', ground: '#4f7d76',
    sun: '#fff4cc', key: '#ffefc7', rim: '#aee9e7', bloom: .14, exposure: 1.15, kind: 2,
    sectors: ['IN THE CANOPY', 'WINDING WOODS', 'CLOUD HOPPER', 'WILD AT HEART', 'THE GREAT BEYOND']
  },
  neon: {
    name: 'Night Shift', subtitle: 'Electric skylines · the original neon city', edition: '03 / NIGHT SHIFT',
    skyTop: '#040611', horizon: '#130a26', fog: '#101932', accent: '#b7ffce',
    road: '#10294e', edge: '#5acbff', block: '#812789', blockGlow: '#b42378',
    marble: '#e8c9ff', marbleGlow: '#460c73', hemisphere: '#c0d8ff', ground: '#30264c',
    sun: '#9757dd', key: '#ccddff', rim: '#b559ff', bloom: .48, exposure: 1.15, kind: 0,
    sectors: ['AFTER HOURS', 'ELECTRIC RUSH', 'MIDNIGHT FLOW', 'OVERDRIVE', 'INTO THE VOID']
  }
};
export const themeFor = key => THEMES[key] || THEMES.dunes;
