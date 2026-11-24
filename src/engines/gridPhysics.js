export const GRID_SIZE = 3;

export const DIRECTIONS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/**
 * Calcula la siguiente coordenada en la dirección actual del robot.
 * @param {{ x: number, y: number, direction: number }} position
 * @returns {{ x: number, y: number }}
 */
export function getNextCoordinate(position) {
  const vector = DIRECTIONS[position.direction] || DIRECTIONS[0];
  return {
    x: position.x + vector.x,
    y: position.y + vector.y,
  };
}

/**
 * Determina si la casilla frontal está fuera del tablero o bloqueada por un muro.
 * @param {{ x: number, y: number, direction: number }} position
 * @param {{ x: number, y: number } | null | undefined} wall
 * @param {number} [gridSize=3]
 * @returns {boolean}
 */
export function isBlockedAhead(position, wall, gridSize = GRID_SIZE) {
  const next = getNextCoordinate(position);
  if (next.x < 0 || next.x >= gridSize || next.y < 0 || next.y >= gridSize) {
    return true;
  }
  return Boolean(wall && wall.x === next.x && wall.y === next.y);
}

/**
 * Gira 90° a la derecha manteniendo la posición actual.
 * @param {{ x: number, y: number, direction: number }} position
 */
export function turnRight(position) {
  return { ...position, direction: (position.direction + 1) % 4 };
}

/**
 * Gira 90° a la izquierda manteniendo la posición actual.
 * @param {{ x: number, y: number, direction: number }} position
 */
export function turnLeft(position) {
  return { ...position, direction: (position.direction + 3) % 4 };
}

/**
 * Intenta avanzar una casilla; indica si ocurrió colisión contra borde o muro.
 * @param {{ x: number, y: number, direction: number }} position
 * @param {{ x: number, y: number } | null | undefined} wall
 * @param {number} [gridSize=3]
 */
export function stepForward(position, wall, gridSize = GRID_SIZE) {
  if (isBlockedAhead(position, wall, gridSize)) {
    return { position: { ...position }, blocked: true };
  }
  const next = getNextCoordinate(position);
  return {
    position: { ...position, x: next.x, y: next.y },
    blocked: false,
  };
}
