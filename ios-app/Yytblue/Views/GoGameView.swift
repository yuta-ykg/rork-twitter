import SwiftUI

private enum GoStone: Equatable {
    case black, white
    var other: GoStone { self == .black ? .white : .black }
    var name: String { L(self == .black ? "黒" : "白") }
}

private struct GoScore {
    var black: Double
    var white: Double
}

private struct GoGameState {
    private(set) var board: [GoStone?] = Array(repeating: nil, count: 81)
    private(set) var turn: GoStone = .black
    private(set) var passes = 0
    private(set) var finished = false
    private(set) var koBoard: [GoStone?]?
    private(set) var lastMove: Int?

    private func neighbors(_ index: Int) -> [Int] {
        let row = index / 9
        let col = index % 9
        return [row > 0 ? index - 9 : -1, row < 8 ? index + 9 : -1,
                col > 0 ? index - 1 : -1, col < 8 ? index + 1 : -1].filter { $0 >= 0 }
    }

    private func group(on board: [GoStone?], from start: Int) -> (stones: [Int], liberties: Set<Int>) {
        let color = board[start]
        var seen: Set<Int> = [start]
        var stack = [start]
        var liberties: Set<Int> = []
        while let point = stack.popLast() {
            for neighbor in neighbors(point) {
                if board[neighbor] == nil {
                    liberties.insert(neighbor)
                } else if board[neighbor] == color, !seen.contains(neighbor) {
                    seen.insert(neighbor)
                    stack.append(neighbor)
                }
            }
        }
        return (Array(seen), liberties)
    }

    func isLegal(_ index: Int) -> Bool {
        var copy = self
        return copy.place(index)
    }

    @discardableResult mutating func place(_ index: Int) -> Bool {
        guard !finished, (0..<81).contains(index), board[index] == nil else { return false }
        var next = board
        next[index] = turn
        var checked: Set<Int> = []
        for neighbor in neighbors(index) where next[neighbor] == turn.other && !checked.contains(neighbor) {
            let opponent = group(on: next, from: neighbor)
            checked.formUnion(opponent.stones)
            if opponent.liberties.isEmpty {
                for stone in opponent.stones { next[stone] = nil }
            }
        }
        guard !group(on: next, from: index).liberties.isEmpty else { return false }
        if let koBoard, next == koBoard { return false }
        koBoard = board
        board = next
        turn = turn.other
        passes = 0
        lastMove = index
        return true
    }

    mutating func pass() {
        guard !finished else { return }
        passes += 1
        finished = passes >= 2
        turn = turn.other
        koBoard = nil
        lastMove = nil
    }

    var score: GoScore {
        var black = Double(board.filter { $0 == .black }.count)
        var white = Double(board.filter { $0 == .white }.count)
        guard finished else { return GoScore(black: black, white: white) }
        var visited: Set<Int> = []
        for point in 0..<81 where board[point] == nil && !visited.contains(point) {
            var stack = [point]
            var region = 0
            var borders: Set<Int> = []
            visited.insert(point)
            while let current = stack.popLast() {
                region += 1
                for neighbor in neighbors(current) {
                    if board[neighbor] == .black { borders.insert(1) }
                    else if board[neighbor] == .white { borders.insert(2) }
                    else if !visited.contains(neighbor) {
                        visited.insert(neighbor)
                        stack.append(neighbor)
                    }
                }
            }
            if borders == [1] { black += Double(region) }
            else if borders == [2] { white += Double(region) }
        }
        return GoScore(black: black, white: white + 5.5)
    }
}

struct GoGameView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @State private var game = GoGameState()

    private var status: String {
        if game.finished {
            return (game.score.black > game.score.white ? L("黒") : L("白")) + L("の勝ち")
        }
        return game.turn.name + L("の番")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(L("囲碁")).font(.system(size: 20, weight: .bold))
            Text(L("9路盤で交互に打ちます。2回続けてパスすると終局です。"))
                .font(.system(size: 13)).foregroundStyle(.secondary)
            Text(L("中国式の面積計算・白にコミ5.5目。死石は終局前に取り除いてください。"))
                .font(.system(size: 12)).foregroundStyle(.secondary)
            HStack {
                scoreLabel(.black, value: game.score.black)
                Spacer(minLength: 5)
                Text(status).font(.system(size: 13, weight: .bold)).multilineTextAlignment(.center)
                Spacer(minLength: 5)
                scoreLabel(.white, value: game.score.white)
            }
            .padding(10)
            .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 12))
            .accessibilityElement(children: .combine)

            GeometryReader { geometry in
                let side = (geometry.size.width - 12) / 9
                LazyVGrid(columns: Array(repeating: GridItem(.fixed(side), spacing: 0), count: 9), spacing: 0) {
                    ForEach(0..<81, id: \.self) { index in
                        let stone = game.board[index]
                        let legal = stone == nil && game.isLegal(index)
                        Button { _ = game.place(index) } label: {
                            ZStack {
                                Color(red: 0.93, green: 0.78, blue: 0.49)
                                Rectangle().fill(Color.brown.opacity(0.7)).frame(height: 1)
                                Rectangle().fill(Color.brown.opacity(0.7)).frame(width: 1)
                                if [2, 4, 6].contains(index / 9), [2, 4, 6].contains(index % 9) {
                                    Circle().fill(Color.brown).frame(width: 5, height: 5)
                                }
                                if let stone {
                                    Circle().fill(stone == .black ? Color.black : Color.white)
                                        .overlay(Circle().stroke(Color.gray.opacity(stone == .white ? 0.6 : 0), lineWidth: 1))
                                        .padding(3)
                                }
                                if game.lastMove == index {
                                    Circle().fill(stone == .black ? Color.white : Color.black).frame(width: 5, height: 5)
                                }
                            }
                            .frame(width: side, height: side)
                        }
                        .buttonStyle(.plain)
                        .disabled(!legal)
                        .accessibilityLabel("\(index / 9 + 1)\(L("行"))\(index % 9 + 1)\(L("列"))、\(stone?.name ?? (legal ? L("置けます") : L("空き")))")
                    }
                }
                .padding(6)
                .background(Color.brown, in: RoundedRectangle(cornerRadius: 8))
            }
            .aspectRatio(1, contentMode: .fit)

            HStack(spacing: 8) {
                Button(L("パス")) { game.pass() }
                    .disabled(game.finished)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .buttonStyle(.bordered)
                Button(L("新しい対局")) { game = GoGameState() }
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .buttonStyle(.bordered)
            }
            if game.passes == 1 && !game.finished {
                Text(L("相手がパスしました。続けてパスすると終局です。"))
                    .font(.system(size: 13)).foregroundStyle(.secondary)
            }
        }
    }

    private func scoreLabel(_ stone: GoStone, value: Double) -> some View {
        HStack(spacing: 4) {
            Circle().fill(stone == .black ? Color.black : Color.white)
                .overlay(Circle().stroke(.gray.opacity(stone == .white ? 0.5 : 0), lineWidth: 1))
                .frame(width: 16, height: 16)
            Text(stone.name)
            Text(value == floor(value) ? String(Int(value)) : String(value)).bold()
        }
        .font(.system(size: 13))
    }
}
