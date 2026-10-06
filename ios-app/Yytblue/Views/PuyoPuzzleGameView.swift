import SwiftUI

private enum FallingColor: Int, CaseIterable, Equatable {
    case red, blue, green, yellow

    static func random() -> FallingColor { allCases.randomElement() ?? .red }
    var color: Color {
        switch self {
        case .red: .pink
        case .blue: .cyan
        case .green: .green
        case .yellow: .yellow
        }
    }
    var name: String {
        switch self {
        case .red: L("赤")
        case .blue: L("青")
        case .green: L("緑")
        case .yellow: L("黄")
        }
    }
}

private struct FallingPair {
    var first: FallingColor
    var second: FallingColor
    var row = 1
    var col = 2
    var rotation = 0

    var cells: [(Int, Int, FallingColor)] {
        let offsets = [(-1, 0), (0, 1), (1, 0), (0, -1)]
        let (dr, dc) = offsets[rotation]
        return [(row, col, first), (row + dr, col + dc, second)]
    }
}

private struct FallingPuzzleState {
    private(set) var board: [FallingColor?] = Array(repeating: nil, count: 72)
    private(set) var active = FallingPair(first: .random(), second: .random())
    private(set) var next = FallingPair(first: .random(), second: .random())
    private(set) var score = 0
    private(set) var lastChain = 0
    private(set) var ended = false

    private func fits(_ pair: FallingPair) -> Bool {
        pair.cells.allSatisfy { cell in
            let (row, col, _) = cell
            (0..<12).contains(row) && (0..<6).contains(col) && board[row * 6 + col] == nil
        }
    }

    mutating func move(_ direction: Int) {
        guard !ended else { return }
        var candidate = active
        candidate.col += direction
        if fits(candidate) { active = candidate }
    }

    mutating func rotate() {
        guard !ended else { return }
        for kick in [0, -1, 1] {
            var candidate = active
            candidate.rotation = (candidate.rotation + 1) % 4
            candidate.col += kick
            if fits(candidate) { active = candidate; return }
        }
    }

    mutating func step() {
        guard !ended else { return }
        var candidate = active
        candidate.row += 1
        if fits(candidate) { active = candidate }
        else { lock() }
    }

    mutating func hardDrop() {
        guard !ended else { return }
        while true {
            var candidate = active
            candidate.row += 1
            if fits(candidate) { active = candidate }
            else { lock(); return }
        }
    }

    private mutating func lock() {
        for (row, col, color) in active.cells { board[row * 6 + col] = color }
        resolveBoard()
        active = next
        active.row = 1
        active.col = 2
        active.rotation = 0
        next = FallingPair(first: .random(), second: .random())
        ended = !fits(active)
    }

    private func neighbors(_ index: Int) -> [Int] {
        let row = index / 6
        let col = index % 6
        return [row > 0 ? index - 6 : -1, row < 11 ? index + 6 : -1,
                col > 0 ? index - 1 : -1, col < 5 ? index + 1 : -1].filter { $0 >= 0 }
    }

    private mutating func resolveBoard() {
        lastChain = 0
        while true {
            var seen: Set<Int> = []
            var clear: Set<Int> = []
            for point in 0..<72 where board[point] != nil && !seen.contains(point) {
                let color = board[point]
                var group = [point]
                seen.insert(point)
                var offset = 0
                while offset < group.count {
                    for neighbor in neighbors(group[offset]) where board[neighbor] == color && !seen.contains(neighbor) {
                        seen.insert(neighbor)
                        group.append(neighbor)
                    }
                    offset += 1
                }
                if group.count >= 4 { clear.formUnion(group) }
            }
            guard !clear.isEmpty else { return }
            lastChain += 1
            score += clear.count * 10 * lastChain
            for point in clear { board[point] = nil }
            for col in 0..<6 {
                var remaining = (0..<12).compactMap { row in board[row * 6 + col] }
                for row in stride(from: 11, through: 0, by: -1) {
                    board[row * 6 + col] = remaining.popLast()
                }
            }
        }
    }
}

struct PuyoPuzzleGameView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @State private var game = FallingPuzzleState()

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(L("カラーペアパズル")).font(.system(size: 20, weight: .bold))
            Text(L("同じ色を4つ以上つなげると消えます。連鎖を狙いましょう。"))
                .font(.system(size: 13)).foregroundStyle(.secondary)
            HStack(alignment: .top, spacing: 10) {
                LazyVGrid(columns: Array(repeating: GridItem(.fixed(28), spacing: 3), count: 6), spacing: 3) {
                    ForEach(0..<72, id: \.self) { index in
                        ZStack {
                            RoundedRectangle(cornerRadius: 4).fill(Color(red: 0.25, green: 0.33, blue: 0.44))
                            if let color = color(at: index) {
                                Circle().fill(color.color)
                                    .overlay(Circle().stroke(.white.opacity(0.3), lineWidth: 1))
                                    .padding(2)
                            }
                        }
                        .frame(width: 28, height: 28)
                        .accessibilityLabel("\(index / 6 + 1)\(L("行"))\(index % 6 + 1)\(L("列"))、\(color(at: index)?.name ?? L("空き"))")
                    }
                }
                .padding(6)
                .background(Color(red: 0.08, green: 0.13, blue: 0.2), in: RoundedRectangle(cornerRadius: 10))
                VStack(spacing: 7) {
                    Text(L("次のペア")).font(.system(size: 12, weight: .semibold))
                    Circle().fill(game.next.second.color).frame(width: 26, height: 26)
                    Circle().fill(game.next.first.color).frame(width: 26, height: 26)
                }
                .padding(8)
                .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 10))
            }
            .frame(maxWidth: .infinity)
            HStack {
                Text("\(L("スコア"))  \(game.score)").bold()
                Spacer()
                Text("\(L("連鎖"))  \(game.lastChain)").bold()
            }
            .font(.system(size: 14))
            .padding(10)
            .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 12))
            if game.ended { Text(L("ゲームオーバー")).font(.system(size: 16, weight: .bold)) }
            HStack(spacing: 7) {
                control("arrow.left", label: "左") { game.move(-1) }
                control("arrow.clockwise", label: "回転") { game.rotate() }
                control("arrow.right", label: "右") { game.move(1) }
                control("arrow.down", label: "下") { game.step() }
                Button(L("落下")) { game.hardDrop() }
                    .disabled(game.ended)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .buttonStyle(.bordered)
            }
            Button(L("新しいゲーム")) { game = FallingPuzzleState() }
                .buttonStyle(.bordered)
                .frame(maxWidth: .infinity)
        }
        .task(id: game.ended) {
            while !Task.isCancelled && !game.ended {
                do { try await Task.sleep(for: .milliseconds(650)) } catch { return }
                if !Task.isCancelled { game.step() }
            }
        }
    }

    private func color(at index: Int) -> FallingColor? {
        if !game.ended {
            for (row, col, color) in game.active.cells where row * 6 + col == index { return color }
        }
        return game.board[index]
    }

    private func control(_ symbol: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) { Image(systemName: symbol).frame(maxWidth: .infinity, minHeight: 44) }
            .disabled(game.ended)
            .buttonStyle(.bordered)
            .accessibilityLabel(L(label))
    }
}
