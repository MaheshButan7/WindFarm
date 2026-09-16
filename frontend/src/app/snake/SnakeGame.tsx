"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createInitialState,
  queueDirection,
  stepGame,
  type Direction,
  type GameState,
} from "@/lib/snake";

const GRID_SIZE = 20;
const TICK_MS = 140;

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

export function SnakeGame() {
  const rngRef = useRef(() => Math.random());
  const [state, setState] = useState<GameState>(() =>
    createInitialState(GRID_SIZE, rngRef.current)
  );

  const restart = useCallback(() => {
    setState(createInitialState(GRID_SIZE, rngRef.current));
  }, []);

  const togglePause = useCallback(() => {
    setState((prev) => {
      if (prev.status === "gameover") {
        return prev;
      }
      return {
        ...prev,
        status: prev.status === "running" ? "paused" : "running",
      };
    });
  }, []);

  const setDirection = useCallback((direction: Direction) => {
    setState((prev) => queueDirection(prev, direction));
  }, []);

  useEffect(() => {
    if (state.status !== "running") {
      return;
    }

    const interval = window.setInterval(() => {
      setState((prev) => stepGame(prev, rngRef.current));
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [state.status]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const direction = KEY_TO_DIRECTION[event.key];
      if (direction) {
        event.preventDefault();
        setDirection(direction);
        return;
      }

      if (event.key === " ") {
        event.preventDefault();
        togglePause();
        return;
      }

      if (event.key === "r" || event.key === "R") {
        restart();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [restart, setDirection, togglePause]);

  const snakeSet = useMemo(() => {
    const set = new Set<string>();
    state.snake.forEach((segment) => {
      set.add(`${segment.x},${segment.y}`);
    });
    return set;
  }, [state.snake]);

  const headKey = `${state.snake[0].x},${state.snake[0].y}`;
  const foodKey = state.food ? `${state.food.x},${state.food.y}` : null;
  const cells = useMemo(() => {
    const list: string[] = [];
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        list.push(`${x},${y}`);
      }
    }
    return list;
  }, []);

  const statusLabel =
    state.status === "gameover"
      ? "Game Over"
      : state.status === "paused"
        ? "Paused"
        : "Running";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Score</p>
          <p className="text-2xl font-semibold">{state.score}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs">
            {statusLabel}
          </span>
          <span className="hidden text-xs text-muted-foreground md:inline">
            Arrow keys/WASD to move · Space to pause · R to restart
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={togglePause}
            disabled={state.status === "gameover"}
          >
            {state.status === "running" ? "Pause" : "Resume"}
          </Button>
          <Button onClick={restart}>Restart</Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div
          className="grid w-full max-w-[480px] aspect-square rounded-xl border bg-card p-2"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
          }}
        >
          {cells.map((key) => {
            const isSnake = snakeSet.has(key);
            const isHead = key === headKey;
            const isFood = foodKey === key;

            return (
              <div
                key={key}
                className={
                  "h-full w-full rounded-[2px] " +
                  (isFood
                    ? "bg-destructive"
                    : isHead
                      ? "bg-primary"
                      : isSnake
                        ? "bg-primary/70"
                        : "bg-muted/40")
                }
              />
            );
          })}
        </div>

        <div className="grid w-full max-w-[240px] grid-cols-3 gap-2 md:hidden">
          <div />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDirection("up")}
          >
            ↑
          </Button>
          <div />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDirection("left")}
          >
            ←
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDirection("down")}
          >
            ↓
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDirection("right")}
          >
            →
          </Button>
        </div>
      </div>
    </div>
  );
}
