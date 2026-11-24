import {
  Compass,
  Cpu,
  FileHtml,
  FileJs,
  Flame,
  Lightning,
  Planet,
  RocketLaunch,
  SlidersHorizontal,
  TerminalWindow,
  Wall,
} from '@phosphor-icons/react';

/**
 * Renderiza el ícono vectorial correspondiente al avatar seleccionado.
 */
export function AvatarGlyph({ avatar, size = 22 }) {
  switch (avatar) {
    case 'dragon':
    case '🐲':
      return <Flame size={size} weight="duotone" />;
    case 'cat':
    case '🐱':
      return <Compass size={size} weight="duotone" />;
    case 'robot':
    case '🤖':
      return <Cpu size={size} weight="duotone" />;
    case 'fox':
    case '🦊':
      return <Lightning size={size} weight="duotone" />;
    case 'unicorn':
    case '🦄':
      return <Planet size={size} weight="duotone" />;
    default:
      return <RocketLaunch size={size} weight="duotone" />;
  }
}

/**
 * Renderiza el ícono asociado a cada habilidad o lenguaje de programación.
 */
export function SkillGlyph({ skill, size = 20 }) {
  if (skill === 'Secuencias') return <Compass size={size} weight="regular" />;
  if (skill === 'Bucles') return <SlidersHorizontal size={size} weight="regular" />;
  if (skill === 'Condicionales') return <Wall size={size} weight="regular" />;
  if (skill === 'Python') return <TerminalWindow size={size} weight="regular" />;
  if (skill === 'HTML5') return <FileHtml size={size} weight="regular" />;
  if (skill === 'JavaScript') return <FileJs size={size} weight="regular" />;
  return <Cpu size={size} weight="regular" />;
}
