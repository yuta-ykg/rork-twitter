import SwiftUI

private enum ArcadeGame: String, CaseIterable, Identifiable {
    case memory, game2048, othello, shogi
    var id: String { rawValue }
    var title: String {
        switch self {
        case .memory: L("神経衰弱")
        case .game2048: "2048"
        case .othello: L("オセロ")
        case .shogi: L("将棋")
        }
    }
}

struct GamesView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @Environment(AuthManager.self) private var auth
    let store: PostStore
    @Binding var showsSignIn: Bool
    @State private var selected: ArcadeGame = .memory
    @State private var shareMessage: String?
    @State private var isSharing = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text(L("ゲームのスコアや対局結果を投稿で共有できます。"))
                    .font(.system(size: 14))
                    .foregroundStyle(Color.irukaSecondary)
                Picker(L("ゲームを選択"), selection: $selected) {
                    ForEach(ArcadeGame.allCases) { game in Text(game.title).tag(game) }
                }
                .pickerStyle(.segmented)
                Group {
                    switch selected {
                    case .memory: MemoryGameView(onShare: shareResult)
                    case .game2048: Game2048View(onShare: shareResult)
                    case .othello: OthelloView()
                    case .shogi:
                        ShogiGameView(
                            user: DevelopmentData.isActive ? nil : auth.user,
                            onShare: shareResult,
                            onRequestSignIn: { showsSignIn = true }
                        )
                    }
                }
                .padding(15)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Color.irukaHairline, lineWidth: 1))
            }
            .padding(16)
        }
        .background(Color.irukaField.opacity(0.45))
        .navigationTitle(L("ゲームセンター"))
        .navigationBarTitleDisplayMode(.inline)
        .alert(L("ゲーム"), isPresented: Binding(get: { shareMessage != nil }, set: { if !$0 { shareMessage = nil } })) {
            Button("OK") { shareMessage = nil }
        } message: { Text(L(shareMessage ?? "")) }
    }

    private func shareResult(_ body: String) {
        guard let user = auth.user else { showsSignIn = true; return }
        guard !isSharing else { return }
        isSharing = true
        Task {
            do {
                try await store.createGameResultPost(body, user: user)
                shareMessage = "ゲーム結果を投稿しました。"
            } catch {
                shareMessage = "ゲーム結果を投稿できませんでした。"
            }
            isSharing = false
        }
    }
}

private struct MemoryCard: Identifiable {
    let id: Int
    let symbol: String
}

private struct MemoryGameView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    let onShare: (String) -> Void
    @State private var cards = Self.makeCards()
    @State private var selected: [Int] = []
    @State private var matched: Set<Int> = []
    @State private var moves = 0
    @State private var startedAt: Date?
    @State private var isLocked = false

    private var complete: Bool { matched.count == cards.count }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(L("神経衰弱")).font(.system(size: 20, weight: .bold)).foregroundStyle(Color.irukaInk)
                    Text(L("カードの中から同じ絵柄のペアを見つけましょう。"))
                        .font(.system(size: 13)).foregroundStyle(Color.irukaSecondary)
                }
                Spacer()
                Button(action: restart) { Image(systemName: "arrow.clockwise").frame(width: 42, height: 42) }
                    .buttonStyle(.bordered).accessibilityLabel(L("新しいゲーム"))
            }
            HStack(spacing: 18) {
                Label("\(L("手数"))  \(moves)", systemImage: "hand.tap")
                if let startedAt, !complete {
                    TimelineView(.periodic(from: startedAt, by: 1)) { context in
                        Label("\(L("経過時間"))  \(max(0, Int(context.date.timeIntervalSince(startedAt))))\(L("秒"))", systemImage: "clock")
                    }
                } else {
                    Label("\(L("経過時間"))  \(elapsedSeconds)\(L("秒"))", systemImage: "clock")
                }
            }
            .font(.system(size: 12, weight: .medium)).foregroundStyle(Color.irukaSecondary)

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                ForEach(cards) { card in
                    let faceUp = selected.contains(card.id) || matched.contains(card.id)
                    Button { reveal(card.id) } label: {
                        Text(faceUp ? card.symbol : "?")
                            .font(.system(size: 28, weight: .semibold))
                            .frame(maxWidth: .infinity).aspectRatio(1, contentMode: .fit)
                            .background(matched.contains(card.id) ? Color.green.opacity(0.18) : faceUp ? Color.irukaBlue.opacity(0.13) : Color.irukaField,
                                        in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .buttonStyle(.plain)
                    .disabled(isLocked || complete || matched.contains(card.id))
                    .accessibilityLabel("\(L("カード")) \(card.id + 1) \(faceUp ? card.symbol : L("裏返し"))")
                }
            }
            if complete {
                VStack(spacing: 9) {
                    Text(L("クリアしました！")).font(.system(size: 17, weight: .bold))
                    Text("\(L("手数")) \(moves) · \(L("経過時間")) \(elapsedSeconds)\(L("秒"))")
                        .font(.system(size: 14)).foregroundStyle(Color.irukaSecondary)
                    Button { onShare("\(L("神経衰弱をクリアしました！")) \(moves)\(L("手数"))・\(elapsedSeconds)\(L("秒"))") } label: {
                        Label(L("結果を投稿で共有"), systemImage: "square.and.arrow.up")
                            .frame(maxWidth: .infinity, minHeight: 42)
                    }
                    .buttonStyle(.borderedProminent).tint(Color.irukaBlue)
                    Button(L("もう一度遊ぶ"), action: restart).font(.system(size: 14, weight: .semibold))
                }
                .frame(maxWidth: .infinity).padding(12)
                .background(Color.green.opacity(0.1), in: RoundedRectangle(cornerRadius: 14))
            }
        }
    }

    private var elapsedSeconds: Int {
        guard let startedAt else { return 0 }
        return max(0, Int(Date().timeIntervalSince(startedAt)))
    }

    private func reveal(_ id: Int) {
        guard !isLocked, !complete, !matched.contains(id), !selected.contains(id) else { return }
        if startedAt == nil { startedAt = Date() }
        let next = selected + [id]
        selected = next
        guard next.count == 2 else { return }
        moves += 1
        if cards[next[0]].symbol == cards[next[1]].symbol {
            matched.formUnion(next)
            selected = []
        } else {
            isLocked = true
            Task { @MainActor in
                try? await Task.sleep(nanoseconds: 700_000_000)
                selected = []
                isLocked = false
            }
        }
    }

    private func restart() {
        cards = Self.makeCards()
        selected = []
        matched = []
        moves = 0
        startedAt = nil
        isLocked = false
    }

    private static func makeCards() -> [MemoryCard] {
        let symbols = ["🐬", "🐟", "🐙", "🐢", "🦀", "🐳", "🪼", "🦭"]
        return (symbols + symbols).shuffled().enumerated().map { MemoryCard(id: $0.offset, symbol: $0.element) }
    }
}

private enum MoveDirection { case left, right, up, down }

private struct Game2048View: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    private static let goalTargets = [1024, 2048, 4096, 8192, 16384]
    let onShare: (String) -> Void
    @State private var board = Self.newBoard()
    @State private var score = 0
    @State private var ended = false
    @State private var won = false
    @State private var target = 2048

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(String(target)).font(.system(size: 20, weight: .bold)).foregroundStyle(Color.irukaInk)
                    Text(L("矢印キーまたは画面のボタンで数字を合わせ、目標の数字を目指しましょう。"))
                        .font(.system(size: 13)).foregroundStyle(Color.irukaSecondary)
                }
                Spacer()
                Button(action: restart) { Image(systemName: "arrow.clockwise").frame(width: 42, height: 42) }
                .buttonStyle(.bordered).accessibilityLabel(L("新しいゲーム"))
            }
            Menu {
                Picker(L("目標"), selection: $target) {
                    ForEach(Self.goalTargets, id: \.self) { value in
                        Text(String(value)).tag(value)
                    }
                }
            } label: {
                Label("\(L("目標"))  \(target)", systemImage: "chevron.down")
                    .font(.system(size: 14, weight: .semibold))
            }
            HStack {
                Text("\(L("スコア"))  \(score)").font(.system(size: 16, weight: .semibold)).monospacedDigit()
                Spacer()
                DirectionControls { move($0) }
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 4), spacing: 6) {
                ForEach(0..<16, id: \.self) { index in
                    let value = board[index / 4][index % 4]
                    Text(value == 0 ? "" : String(value))
                        .font(.system(size: value >= 1024 ? 18 : 23, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(value >= 8 ? Color.white : Color(red: 0.46, green: 0.42, blue: 0.38))
                        .frame(maxWidth: .infinity).aspectRatio(1, contentMode: .fit)
                        .background(tileColor(value), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel(value == 0 ? "" : String(value))
                }
            }
            .padding(7)
            .background(Color(red: 0.73, green: 0.68, blue: 0.62), in: RoundedRectangle(cornerRadius: 13))
            if ended {
                VStack(spacing: 9) {
                    Text(L(won ? "目標を達成しました！" : "ゲームオーバー"))
                        .font(.system(size: 17, weight: .bold))
                    Text("\(L("スコア"))  \(score)").font(.system(size: 14)).foregroundStyle(Color.irukaSecondary)
                    Button { onShare("\(target) \(L("スコア")) \(score)") } label: {
                        Label(L("結果を投稿で共有"), systemImage: "square.and.arrow.up")
                            .frame(maxWidth: .infinity, minHeight: 42)
                    }
                    .buttonStyle(.borderedProminent).tint(Color.irukaBlue)
                    Button(L("もう一度遊ぶ"), action: restart).font(.system(size: 14, weight: .semibold))
                }
                .frame(maxWidth: .infinity).padding(12)
                .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 14))
            }
        }
        .onChange(of: target) { _, _ in restart() }
    }

    private func move(_ direction: MoveDirection) {
        guard !ended else { return }
        var next = board
        var gained = 0
        for outer in 0..<4 {
            let coordinates: [(Int, Int)] = (0..<4).map { inner in
                switch direction {
                case .left: (outer, inner)
                case .right: (outer, 3 - inner)
                case .up: (inner, outer)
                case .down: (3 - inner, outer)
                }
            }
            let result = Self.merge(coordinates.map { board[$0.0][$0.1] })
            gained += result.gained
            for (index, coordinate) in coordinates.enumerated() { next[coordinate.0][coordinate.1] = result.line[index] }
        }
        guard next != board else { return }
        next = Self.addTile(to: next)
        board = next
        score += gained
        if next.flatMap({ $0 }).contains(where: { $0 >= target }) {
            won = true
            ended = true
        } else if !Self.canMove(next) {
            ended = true
        }
    }

    private func restart() { board = Self.newBoard(); score = 0; ended = false; won = false }

    private static func merge(_ line: [Int]) -> (line: [Int], gained: Int) {
        var values = line.filter { $0 > 0 }
        var output: [Int] = []
        var gained = 0
        var index = 0
        while index < values.count {
            if index + 1 < values.count, values[index] == values[index + 1] {
                let doubled = values[index] * 2
                output.append(doubled)
                gained += doubled
                index += 2
            } else {
                output.append(values[index])
                index += 1
            }
        }
        return (output + Array(repeating: 0, count: 4 - output.count), gained)
    }

    private static func addTile(to board: [[Int]]) -> [[Int]] {
        var next = board
        let empty = (0..<4).flatMap { row in (0..<4).compactMap { col -> (Int, Int)? in next[row][col] == 0 ? (row, col) : nil } }
        guard let position = empty.randomElement() else { return next }
        next[position.0][position.1] = Int.random(in: 0..<10) == 0 ? 4 : 2
        return next
    }

    private static func newBoard() -> [[Int]] {
        addTile(to: addTile(to: Array(repeating: Array(repeating: 0, count: 4), count: 4)))
    }

    private static func canMove(_ board: [[Int]]) -> Bool {
        if board.contains(where: { $0.contains(0) }) { return true }
        for row in 0..<4 { for col in 0..<4 {
            if col < 3 && board[row][col] == board[row][col + 1] { return true }
            if row < 3 && board[row][col] == board[row + 1][col] { return true }
        } }
        return false
    }

    private func tileColor(_ value: Int) -> Color {
        switch value {
        case 0: Color(red: 0.80, green: 0.76, blue: 0.71)
        case 2: Color(red: 0.93, green: 0.89, blue: 0.84)
        case 4: Color(red: 0.93, green: 0.88, blue: 0.78)
        case 8: Color(red: 0.95, green: 0.70, blue: 0.47)
        case 16: Color(red: 0.96, green: 0.58, blue: 0.39)
        case 32: Color(red: 0.96, green: 0.48, blue: 0.37)
        case 64: Color(red: 0.96, green: 0.37, blue: 0.23)
        case 1024, 2048: Color(red: 0.93, green: 0.77, blue: 0.35)
        case 4096: Color(red: 0.91, green: 0.74, blue: 0.20)
        case 8192: Color(red: 0.90, green: 0.70, blue: 0.17)
        case 16384: Color(red: 0.88, green: 0.65, blue: 0.13)
        default: Color(red: 0.88, green: 0.65, blue: 0.13)
        }
    }
}

private struct DirectionControls: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    let onMove: (MoveDirection) -> Void

    var body: some View {
        VStack(spacing: 3) {
            button("up", label: L("上"), direction: .up)
            HStack(spacing: 3) {
                button("left", label: L("左"), direction: .left)
                button("down", label: L("下"), direction: .down)
                button("right", label: L("右"), direction: .right)
            }
        }
    }

    private func button(_ icon: String, label: String, direction: MoveDirection) -> some View {
        Button { onMove(direction) } label: {
            Image(systemName: "arrow.\(icon)")
                .font(.system(size: 13, weight: .bold))
                .frame(width: 34, height: 28)
                .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 7))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}
