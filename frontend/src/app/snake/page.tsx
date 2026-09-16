import { SnakeGame } from "./SnakeGame";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SnakePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Snake</CardTitle>
          <CardDescription>
            Classic grid-based snake. Eat food, grow longer, avoid walls and your tail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SnakeGame />
        </CardContent>
      </Card>
    </div>
  );
}
