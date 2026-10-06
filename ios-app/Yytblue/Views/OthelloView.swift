import SwiftUI

private enum OthelloDisc: Equatable {
    case black, white

    var other: OthelloDisc { self == .black ? .white : .black }
    var name: String { L(self == .black ? "黒" : "白") }
}

private enum OthelloMode: String, CaseIterable, Identifiable, Hashable {
    case cpu, local
    var id: String { rawValue }
    var title: String { L(self == .cpu ? "CPU対戦" : "2人で対戦") }
}

private struct OthelloGame {
    private(set) var board: [OthelloDisc?] = Array(repeating: nil, count: 64)
    private(set) var turn: OthelloDisc = .black
    private(set) var finished = false
    private(set) var passed: OthelloDisc?

    init() {
        board[27] = .white
        board[28] = .black
        board[35] = .black
        board[36] = .white
    }

    var blackScore: Int { board.filter { $0 == .black }.count }
    var whiteScore: Int { board.filter { $0 == .white }.count }
    var legalMoves: Set<Int> {
        finished ? [] : Set((0..<64).filter { !flips(at: $0, for: turn).isEmpty })
    }

    func chooseCpuMove() -> Int? {
        let moves = legalMoves.sorted()
        guard var best = moves.first else { return nil }
        let weights = [
            120, -35, 20, 20, 20, 20, -35, 120,
            -35, -50, -5, -5, -5, -5, -50, -35,
            20, -5, 10, 4, 4, 10, -5, 20,
            20, -5, 4, 2, 2, 4, -5, 20,
            20, -5, 4, 2, 2, 4, -5, 20,
            20, -5, 10, 4, 4, 10, -5, 20,
            -35, -50, -5, -5, -5, -5, -50, -35,
            120, -35, 20, 20, 20, 20, -35, 120
        ]
        var bestValue = Int.min
        for move in moves {
            let captured = flips(at: move, for: turn)
            var next = self
            next.board[move] = turn
            for index in captured { next.board[index] = turn }
            let opponentMoves = (0..<64).filter { !next.flips(at: $0, for: turn.other).isEmpty }.count
            let value = weights[move] + captured.count * 2 - opponentMoves * 3
            if value > bestValue {
                best = move
                bestValue = value
            }
        }
        return best
    }

    private func flips(at index: Int, for player: OthelloDisc) -> [Int] {
        guard (0..<64).contains(index), board[index] == nil else { return [] }
        let row = index / 8
        let col = index % 8
        var result: [Int] = []
        for dr in -1...1 {
            for dc in -1...1 where dr != 0 || dc != 0 {
                var r = row + dr
                var c = col + dc
                var line: [Int] = []
                while (0..<8).contains(r), (0..<8).contains(c), board[r * 8 + c] == player.other {
                    line.append(r * 8 + c)
                    r += dr
                    c += dc
                }
                if !line.isEmpty, (0..<8).contains(r), (0..<8).contains(c), board[r * 8 + c] == player {
                    result.append(contentsOf: line)
                }
            }
        }
        return result
    }

    mutating func place(at index: Int) {
        guard !finished else { return }
        let captured = flips(at: index, for: turn)
        guard !captured.isEmpty else { return }
        board[index] = turn
        for position in captured { board[position] = turn }
        let next = turn.other
        if (0..<64).contains(where: { !flips(at: $0, for: next).isEmpty }) {
            turn = next
            passed = nil
        } else if (0..<64).contains(where: { !flips(at: $0, for: turn).isEmpty }) {
            passed = next
        } else {
            passed = nil
            finished = true
        }
    }
}

struct OthelloView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @State private var game = OthelloGame()
    @State private var mode: OthelloMode = .cpu

    private var cpuTurnID: String {
        mode.rawValue + ":" + game.board.map { $0 == .black ? "b" : $0 == .white ? "w" : "." }.joined()
    }

    private var status: String {
        if game.finished {
            if game.blackScore == game.whiteScore { return L("引き分け") }
            return (game.blackScore > game.whiteScore ? L("黒") : L("白")) + L("の勝ち")
        }
        if mode == .cpu && game.turn == .white { return L("CPUが考えています…") }
        return game.turn.name + L("の番")
    }

    var body: some View {
        VStack {
            VStack(alignment: .leading, spacing: 16) {
                Text(L("オセロ")).font(.largeTitle.bold())
                Text(L(mode == .cpu ? "黒の石でCPUと対戦します。" : "同じ端末で交互に遊べます。置ける場所を選んでください。"))
                    .font(.subheadline).foregroundStyle(.secondary)

                Picker(L("対戦モード"), selection: $mode) {
                    ForEach(OthelloMode.allCases) { option in
                        Text(option.title).tag(option)
                    }
                }
                .pickerStyle(.segmented)
                .onChange(of: mode) { _, _ in game = OthelloGame() }

                HStack {
                    scoreLabel(.black, score: game.blackScore)
                    Spacer(minLength: 8)
                    Text(status).font(.subheadline.bold()).multilineTextAlignment(.center)
                    Spacer(minLength: 8)
                    scoreLabel(.white, score: game.whiteScore)
                }
                .padding(12)
                .background(.quaternary, in: RoundedRectangle(cornerRadius: 14))
                .accessibilityElement(children: .combine)

                if let passed = game.passed {
                    Text(passed.name + L("は置けないためパスしました。"))
                        .font(.subheadline).foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                }

                GeometryReader { geometry in
                    let side = (geometry.size.width - 20) / 8
                    let moves = mode == .cpu && game.turn == .white ? Set<Int>() : game.legalMoves
                    LazyVGrid(columns: Array(repeating: GridItem(.fixed(side), spacing: 2), count: 8), spacing: 2) {
                        ForEach(0..<64, id: \.self) { index in
                            Button { game.place(at: index) } label: {
                                ZStack {
                                    Rectangle().fill(Color.green)
                                    if let disc = game.board[index] {
                                        Circle()
                                            .fill(disc == .black ? Color.black : Color.white)
                                            .overlay(Circle().stroke(.gray.opacity(disc == .white ? 0.5 : 0), lineWidth: 1))
                                            .padding(4)
                                    } else if moves.contains(index) {
                                        Circle().fill(.white.opacity(0.6))
                                            .frame(width: side * 0.2, height: side * 0.2)
                                    }
                                }
                                .frame(width: side, height: side)
                            }
                            .buttonStyle(.plain)
                            .disabled(!moves.contains(index))
                            .accessibilityLabel("\(index / 8 + 1)\(L("行"))\(index % 8 + 1)\(L("列"))、\(game.board[index]?.name ?? (moves.contains(index) ? L("置けます") : L("空き")))")
                        }
                    }
                    .padding(3)
                    .background(Color(red: 0.02, green: 0.28, blue: 0.18), in: RoundedRectangle(cornerRadius: 8))
                }
                .aspectRatio(1, contentMode: .fit)

                Button(L("新しい対局")) { game = OthelloGame() }
                    .buttonStyle(.bordered)
                    .frame(maxWidth: .infinity)
            }
            .padding()
        }
        .task(id: cpuTurnID) {
            guard mode == .cpu, game.turn == .white, !game.finished else { return }
            do { try await Task.sleep(for: .milliseconds(450)) } catch { return }
            guard !Task.isCancelled, mode == .cpu, game.turn == .white, !game.finished else { return }
            if let move = game.chooseCpuMove() { game.place(at: move) }
        }
    }

    private func scoreLabel(_ disc: OthelloDisc, score: Int) -> some View {
        HStack(spacing: 5) {
            Circle().fill(disc == .black ? Color.black : Color.white)
                .overlay(Circle().stroke(.gray.opacity(disc == .white ? 0.5 : 0), lineWidth: 1))
                .frame(width: 18, height: 18)
            Text(mode == .cpu && disc == .white ? L("CPU") : disc.name)
            Text(String(score)).bold()
        }
        .font(.subheadline)
    }
}
