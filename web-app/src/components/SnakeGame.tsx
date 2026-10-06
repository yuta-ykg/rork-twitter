import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { t } from "@/lib/language";
import { createSnakeGame, stepSnake, turnSnake, type SnakeDirection } from "@/lib/snake";

export function SnakeGame() {
  const [game, setGame] = useState(createSnakeGame);

  useEffect(() => {
    if (game.ended) return;
    const timer = window.setInterval(() => setGame((current) => stepSnake(current)), 170);
    return () => window.clearInterval(timer);
  }, [game.ended]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const directions: Partial<Record<string, SnakeDirection>> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      };
      const direction = directions[event.key];
      if (!direction) return;
      event.preventDefault();
      setGame((current) => turnSnake(current, direction));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const turn = (direction: SnakeDirection) => setGame((current) => turnSnake(current, direction));
  const occupied = new Map(game.snake.map((point, index) => [`${point.row}-${point.col}`, index]));

  return <div>
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold">{t("スネーク")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("エサを集めて長くなり、壁や自分の体を避けましょう。")}</p>
      </div>
      <button type="button" onClick={() => setGame(createSnakeGame())} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-input" aria-label={t("新しいゲーム")}>
        <RotateCcw className="h-4 w-4" />
      </button>
    </div>
    <p className="mt-4 text-sm">{t("スコア")} <strong className="text-lg tabular-nums">{game.score}</strong></p>
    <div className="mx-auto mt-4 grid aspect-square max-w-[430px] overflow-hidden rounded-xl border border-border bg-emerald-950 p-1"
      style={{ gridTemplateColumns: `repeat(${game.size}, minmax(0, 1fr))` }} role="grid" aria-label={t("スネーク")}>
      {Array.from({ length: game.size * game.size }, (_, index) => {
        const row = Math.floor(index / game.size);
        const col = index % game.size;
        const snakeIndex = occupied.get(`${row}-${col}`);
        const isFood = game.food.row === row && game.food.col === col;
        return <div key={index} role="gridcell" className="aspect-square p-[1px]">
          <div className={`h-full w-full rounded-sm ${snakeIndex === 0 ? "bg-emerald-300" : snakeIndex !== undefined ? "bg-emerald-500" : isFood ? "bg-rose-400" : "bg-emerald-950"}`} />
        </div>;
      })}
    </div>
    {game.ended ? <p className="mt-3 text-center font-semibold" role="status">{t("ゲームオーバー")}</p> : null}
    <div className="mx-auto mt-4 grid w-fit grid-cols-3 gap-2" aria-label={t("操作")}>
      <span /><Control icon={<ArrowUp />} label={t("上")} onClick={() => turn("up")} /><span />
      <Control icon={<ArrowLeft />} label={t("左")} onClick={() => turn("left")} />
      <Control icon={<ArrowDown />} label={t("下")} onClick={() => turn("down")} />
      <Control icon={<ArrowRight />} label={t("右")} onClick={() => turn("right")} />
    </div>
  </div>;
}

function Control({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} aria-label={label} className="grid h-11 w-11 place-items-center rounded-xl border border-input [&>svg]:h-5 [&>svg]:w-5">{icon}</button>;
}
