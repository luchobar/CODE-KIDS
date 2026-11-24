import { Robot, Star, Wall } from '@phosphor-icons/react';
import { GRID_SIZE } from '../../engines/gridPhysics.js';

/**
 * Tablero visual 3×3 reutilizable para misiones de robot (Blockly y Python).
 * @param {{
 *   position: { x: number, y: number, direction: number },
 *   goal: { x: number, y: number },
 *   wall?: { x: number, y: number } | null,
 *   trail?: Array<{ x: number, y: number }>,
 *   variant?: 'blockly' | 'python',
 *   ariaLabel?: string
 * }} props
 */
export default function RobotGridStage({
  position,
  goal,
  wall = null,
  trail = [],
  variant = 'blockly',
  ariaLabel = 'Tablero del reto. Lleva el robot hasta la meta.',
}) {
  const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => ({
    x: index % GRID_SIZE,
    y: Math.floor(index / GRID_SIZE),
  }));

  if (variant === 'python') {
    return (
      <div className="python-grid" role="img" aria-label={ariaLabel}>
        {cells.map(({ x, y }) => {
          const isRobot = position.x === x && position.y === y;
          const isGoal = goal.x === x && goal.y === y;
          const isWall = wall?.x === x && wall?.y === y;
          return (
            <span
              key={`py-cell-${x}-${y}`}
              className={`python-cell${isRobot ? ' robot' : ''}${isGoal ? ' goal' : ''}${isWall ? ' wall' : ''}`}
            >
              {isRobot ? (
                <i style={{ transform: `rotate(${position.direction * 90}deg)` }}>
                  <Robot size={32} weight="duotone" />
                </i>
              ) : isGoal ? (
                <Star size={30} weight="fill" />
              ) : isWall ? (
                <Wall size={30} weight="duotone" />
              ) : null}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="robot-grid" role="img" aria-label={ariaLabel}>
      {cells.map(({ x, y }) => {
        const isRobot = position.x === x && position.y === y;
        const isGoal = goal.x === x && goal.y === y;
        const isWall = wall?.x === x && wall?.y === y;
        const isVisited = trail.some((pt) => pt.x === x && pt.y === y) && !isRobot;

        return (
          <div
            key={`bk-cell-${x}-${y}`}
            className={`robot-cell${isRobot ? ' robot-cell-active' : ''}${isGoal ? ' robot-cell-goal' : ''}${
              isWall ? ' robot-cell-wall' : ''
            }${isVisited ? ' robot-cell-trail' : ''}`}
          >
            <span className="cell-coord-tag">
              {x + 1},{y + 1}
            </span>
            {isRobot ? (
              <span className="robot-sprite" style={{ transform: `rotate(${position.direction * 90}deg)` }}>
                <Robot size={30} weight="duotone" />
              </span>
            ) : isGoal ? (
              <Star size={28} weight="fill" className="goal-icon" />
            ) : isWall ? (
              <Wall size={26} weight="duotone" className="wall-icon" />
            ) : isVisited ? (
              <span className="trail-energy-dot" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
