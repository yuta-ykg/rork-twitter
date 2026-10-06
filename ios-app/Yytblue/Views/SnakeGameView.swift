import SwiftUI

private enum SnakeDirection {
    case up, down, left, right

    var delta: (row: Int, col: Int) {
        switch self {
        case .up: (-1, 0)
        case .down: (1, 0)
        case .left: (0, -1)
        case .right: (0, 1)
        }
    }

    func isOpposite(of other: SnakeDirection) -> Bool {
        switch (self, other) {
        case (.up, .down), (.down, .up), (.left, .right), (.right, .left): return true
        default: return false
        }
    }
}

private struct SnakePoint: Hashable {
    let row: Int
    let col: Int
}

private struct SnakeState {
    let size = 16
    var snake: [SnakePoint]
    var food: SnakePoint
    var direction: SnakeDirection = .right
    var queuedDirection: SnakeDirection = .right
    var score = 0
    var ended = false

    static func fresh() -> SnakeState {
        let center = 8
        let snake = [
            SnakePoint(row: center, col: center),
            SnakePoint(row: center, col: center - 1),
            SnakePoint(row: center, col: center - 2)
        ]
        return SnakeState(snake: snake, food: nextFood(size: 16, snake: snake))
    }

    mutating func turn(_ next: SnakeDirection) {
        guard !ended, !next.isOpposite(of: direction) else { return }
        queuedDirection = next
    }

    mutating func step() {
        guard !ended, let head = snake.first else { return }
        direction = queuedDirection
        let delta = direction.delta
        let next = SnakePoint(row: head.row + delta.row, col: head.col + delta.col)
        let ate = next == food
        let collisionBody = ate ? snake : Array(snake.dropLast())
        guard next.row >= 0, next.col >= 0, next.row < size, next.col < size,
              !collisionBody.contains(next) else {
            ended = true
            return
        }
        snake.insert(next, at: 0)
        if ate {
            score += 10
            food = Self.nextFood(size: size, snake: snake)
        } else {
            snake.removeLast()
        }
        if snake.count == size * size { ended = true }
    }

    private static func nextFood(size: Int, snake: [SnakePoint]) -> SnakePoint {
        let occupied = Set(snake)
        let empty = (0..<size).flatMap { row in
            (0..<size).compactMap { col in
                let point = SnakePoint(row: row, col: col)
                return occupied.contains(point) ? nil : point
            }
        }
        return empty.randomElement() ?? SnakePoint(row: -1, col: -1)
    }
}

struct SnakeGameView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @State private var game = SnakeState.fresh()

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(L("スネーク")).font(.system(size: 20, weight: .bold))
                    Text(L("エサを集めて長くなり、壁や自分の体を避けましょう。"))
                        .font(.system(size: 13))
                        .foregroundStyle(Color.irukaSecondary)
                }
                Spacer()
                Button { game = .fresh() } label: {
                    Image(systemName: "arrow.clockwise").frame(width: 42, height: 42)
                }
                .buttonStyle(.bordered)
                .accessibilityLabel(L("新しいゲーム"))
            }
            Text("\(L("スコア"))  \(game.score)")
                .font(.system(size: 16, weight: .semibold))
                .monospacedDigit()
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 1), count: game.size), spacing: 1) {
                ForEach(0..<(game.size * game.size), id: \.self) { index in
                    let point = SnakePoint(row: index / game.size, col: index % game.size)
                    let snakeIndex = game.snake.firstIndex(of: point)
                    RoundedRectangle(cornerRadius: 2)
                        .fill(snakeIndex == 0 ? Color.green.opacity(0.95) :
                                snakeIndex != nil ? Color.green.opacity(0.65) :
                                point == game.food ? Color.red.opacity(0.85) :
                                Color(red: 0.03, green: 0.22, blue: 0.15))
                        .aspectRatio(1, contentMode: .fit)
                }
            }
            .padding(4)
            .background(Color(red: 0.03, green: 0.22, blue: 0.15), in: RoundedRectangle(cornerRadius: 13))
            if game.ended {
                Text(L("ゲームオーバー"))
                    .font(.system(size: 17, weight: .bold))
                    .frame(maxWidth: .infinity)
            }
            VStack(spacing: 6) {
                control("arrow.up", label: L("上"), direction: .up)
                HStack(spacing: 6) {
                    control("arrow.left", label: L("左"), direction: .left)
                    control("arrow.down", label: L("下"), direction: .down)
                    control("arrow.right", label: L("右"), direction: .right)
                }
            }
            .frame(maxWidth: .infinity)
        }
        .task(id: game.ended) {
            while !Task.isCancelled, !game.ended {
                try? await Task.sleep(nanoseconds: 170_000_000)
                if !Task.isCancelled { game.step() }
            }
        }
    }

    private func control(_ icon: String, label: String, direction: SnakeDirection) -> some View {
        Button { game.turn(direction) } label: {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .bold))
                .frame(width: 44, height: 40)
        }
        .buttonStyle(.bordered)
        .accessibilityLabel(label)
    }
}
