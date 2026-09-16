export type Direction = "up" | "down" | "left" | "right";

export type GameStatus = "running" | "paused" | "gameover";

export type Point = {
  x: number;
  y: number;
};

export type GameState = {
  gridSize: number;
  snake: Point[];
  direction: Direction;
  nextDirection: Direction;
  food: Point | null;
  score: number;
  status: GameStatus;
};

const DIRECTION_VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function isOppositeDirection(a: Direction, b: Direction) {
  return OPPOSITE_DIRECTION[a] === b;
}

export function createInitialState(
  gridSize = 20,
  rng: () => number = Math.random
): GameState {
  const mid = Math.floor(gridSize / 2);
  const snake: Point[] = [
    { x: mid + 1, y: mid },
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
  ];

  const baseState: GameState = {
    gridSize,
    snake,
    direction: "right",
    nextDirection: "right",
    food: null,
    score: 0,
    status: "running",
  };

  return {
    ...baseState,
    food: placeFood(baseState, rng),
  };
}

export function placeFood(state: GameState, rng: () => number): Point | null {
  const occupied = new Set(state.snake.map((segment) => `${segment.x},${segment.y}`));
  const empty: Point[] = [];

  for (let y = 0; y < state.gridSize; y += 1) {
    for (let x = 0; x < state.gridSize; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        empty.push({ x, y });
      }
    }
  }

  if (empty.length === 0) {
    return null;
  }

  const index = Math.floor(rng() * empty.length);
  return empty[index];
}

export function stepGame(state: GameState, rng: () => number): GameState {
  if (state.status !== "running") {
    return state;
  }

  const direction = state.nextDirection;
  const vector = DIRECTION_VECTORS[direction];
  const head = state.snake[0];
  const nextHead: Point = {
    x: head.x + vector.x,
    y: head.y + vector.y,
  };

  if (
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= state.gridSize ||
    nextHead.y >= state.gridSize
  ) {
    return {
      ...state,
      status: "gameover",
    };
  }

  const ateFood =
    state.food !== null &&
    nextHead.x === state.food.x &&
    nextHead.y === state.food.y;

  const collisionBody =
    ateFood ? state.snake : state.snake.slice(0, Math.max(state.snake.length - 1, 0));
  const bodySet = new Set(
    collisionBody.map((segment) => `${segment.x},${segment.y}`)
  );
  if (bodySet.has(`${nextHead.x},${nextHead.y}`)) {
    return {
      ...state,
      status: "gameover",
    };
  }

  const nextSnake = [nextHead, ...state.snake];

  if (!ateFood) {
    nextSnake.pop();
  }

  let nextFood = state.food;
  let nextScore = state.score;
  let nextStatus: GameStatus = state.status;

  if (ateFood) {
    nextScore += 1;
    nextFood = placeFood({ ...state, snake: nextSnake }, rng);
    if (!nextFood) {
      nextStatus = "gameover";
    }
  }

  return {
    ...state,
    snake: nextSnake,
    direction,
    nextDirection: direction,
    food: nextFood,
    score: nextScore,
    status: nextStatus,
  };
}

export function queueDirection(state: GameState, next: Direction): GameState {
  if (state.status === "gameover") {
    return state;
  }

  if (isOppositeDirection(state.direction, next)) {
    return state;
  }

  return {
    ...state,
    nextDirection: next,
  };
}
