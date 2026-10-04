import SwiftUI

private enum ShogiSide: String, CaseIterable, Hashable {
    case sente, gote

    var opponent: ShogiSide { self == .sente ? .gote : .sente }
    var forward: Int { self == .sente ? -1 : 1 }
    var label: String { self == .sente ? L("先手") : L("後手") }
}

private enum ShogiKind: String, CaseIterable, Hashable {
    case pawn, lance, knight, silver, gold, bishop, rook, king

    var glyph: String {
        switch self {
        case .pawn: "歩"
        case .lance: "香"
        case .knight: "桂"
        case .silver: "銀"
        case .gold: "金"
        case .bishop: "角"
        case .rook: "飛"
        case .king: "玉"
        }
    }

    var isPromotable: Bool { self != .gold && self != .king }

    func glyph(promoted: Bool) -> String {
        guard promoted else { return glyph }
        switch self {
        case .pawn: "と"
        case .lance: "杏"
        case .knight: "圭"
        case .silver: "全"
        case .bishop: "馬"
        case .rook: "龍"
        case .gold, .king: glyph
        }
    }
}

private struct ShogiPiece: Equatable {
    let side: ShogiSide
    let kind: ShogiKind
    var promoted = false
    var glyph: String { kind.glyph(promoted: promoted) }
}

private struct ShogiPosition: Hashable {
    let row: Int
    let col: Int
}

private struct ShogiAction: Hashable {
    let from: ShogiPosition?
    let to: ShogiPosition
    var drop: ShogiKind? = nil
    var promote = false
}

private struct ShogiState {
    var board: [[ShogiPiece?]]
    var hands: [ShogiSide: [ShogiKind]]
    var turn: ShogiSide
}

private enum ShogiRules {
    static let handOrder: [ShogiKind] = [.rook, .bishop, .gold, .silver, .knight, .lance, .pawn]

    static func initialState() -> ShogiState {
        var board = Array(repeating: Array<ShogiPiece?>(repeating: nil, count: 9), count: 9)
        let backRank: [ShogiKind] = [.lance, .knight, .silver, .gold, .king, .gold, .silver, .knight, .lance]
        for col in 0..<9 {
            board[0][col] = ShogiPiece(side: .gote, kind: backRank[col])
            board[8][col] = ShogiPiece(side: .sente, kind: backRank[col])
            board[2][col] = ShogiPiece(side: .gote, kind: .pawn)
            board[6][col] = ShogiPiece(side: .sente, kind: .pawn)
        }
        board[1][1] = ShogiPiece(side: .gote, kind: .bishop)
        board[1][7] = ShogiPiece(side: .gote, kind: .rook)
        board[7][1] = ShogiPiece(side: .sente, kind: .rook)
        board[7][7] = ShogiPiece(side: .sente, kind: .bishop)
        return ShogiState(board: board, hands: [.sente: [], .gote: []], turn: .sente)
    }

    static func legalMoves(_ state: ShogiState, row: Int, col: Int) -> [ShogiAction] {
        guard let piece = state.board[row][col], piece.side == state.turn else { return [] }
        var legal: [ShogiAction] = []
        for destination in pseudoDestinations(state.board, row: row, col: col, piece: piece) {
            if state.board[destination.row][destination.col]?.kind == .king { continue }
            let canPromote = !piece.promoted && piece.kind.isPromotable
                && (inPromotionZone(piece.side, row) || inPromotionZone(piece.side, destination.row))
            let promotionOptions: [Bool]
            if mustPromote(piece, destinationRow: destination.row) {
                promotionOptions = [true]
            } else if canPromote {
                promotionOptions = [false, true]
            } else {
                promotionOptions = [false]
            }
            for promote in promotionOptions {
                let action = ShogiAction(from: ShogiPosition(row: row, col: col), to: destination, promote: promote)
                if !isInCheck(apply(state, action), side: piece.side) { legal.append(action) }
            }
        }
        return legal
    }

    static func legalDrops(_ state: ShogiState, kind: ShogiKind, preventPawnDropMate: Bool = true) -> [ShogiAction] {
        guard state.hands[state.turn, default: []].contains(kind) else { return [] }
        var legal: [ShogiAction] = []
        for row in 0..<9 { for col in 0..<9 {
            guard canDrop(state, kind: kind, row: row, col: col) else { continue }
            let action = ShogiAction(from: nil, to: ShogiPosition(row: row, col: col), drop: kind)
            let next = apply(state, action)
            if isInCheck(next, side: state.turn) { continue }
            if preventPawnDropMate, kind == .pawn, isInCheck(next, side: next.turn), !hasLegalAction(next, side: next.turn, preventPawnDropMate: false) { continue }
            legal.append(action)
        } }
        return legal
    }

    static func isInCheck(_ state: ShogiState, side: ShogiSide) -> Bool {
        var king: ShogiPosition?
        for row in 0..<9 { for col in 0..<9 {
            if let piece = state.board[row][col], piece.side == side, piece.kind == .king {
                king = ShogiPosition(row: row, col: col)
            }
        } }
        guard let king else { return true }
        for row in 0..<9 { for col in 0..<9 {
            guard let piece = state.board[row][col], piece.side != side else { continue }
            if pseudoDestinations(state.board, row: row, col: col, piece: piece).contains(king) { return true }
        } }
        return false
    }

    static func isCheckmate(_ state: ShogiState) -> Bool {
        isInCheck(state, side: state.turn) && !hasLegalAction(state, side: state.turn)
    }

    static func chooseCpuAction(_ state: ShogiState) -> ShogiAction? {
        let actions = rankedActions(state, allLegalActions(state), limit: 20)
        guard !actions.isEmpty else { return nil }
        var bestAction = actions[0].action
        var bestScore = Int.min
        for candidate in actions {
            let score = isCheckmate(candidate.next) ? 100_000 : -search(candidate.next, depth: 1, alpha: -100_000, beta: 100_000)
            if score > bestScore {
                bestScore = score
                bestAction = candidate.action
            }
        }
        return bestAction
    }

    private static func allLegalActions(_ state: ShogiState) -> [ShogiAction] {
        var actions: [ShogiAction] = []
        for row in 0..<9 { for col in 0..<9 {
            if state.board[row][col]?.side == state.turn { actions += legalMoves(state, row: row, col: col) }
        } }
        for kind in Set(state.hands[state.turn, default: []]) { actions += legalDrops(state, kind: kind) }
        return actions
    }

    private static func rankedActions(_ state: ShogiState, _ actions: [ShogiAction], limit: Int) -> [(action: ShogiAction, next: ShogiState, score: Int)] {
        actions.map { action in
            let next = apply(state, action)
            return (action, next, isCheckmate(next) ? 100_000 : evaluate(next, perspective: state.turn))
        }
        .sorted { $0.score > $1.score }
        .prefix(limit)
        .map { $0 }
    }

    private static func search(_ state: ShogiState, depth: Int, alpha: Int, beta: Int) -> Int {
        if isCheckmate(state) { return -100_000 - depth }
        if depth == 0 { return evaluate(state, perspective: state.turn) }
        let actions = allLegalActions(state)
        if actions.isEmpty { return isInCheck(state, side: state.turn) ? -100_000 - depth : 0 }
        var currentAlpha = alpha
        var best = Int.min
        for candidate in rankedActions(state, actions, limit: 12) {
            let score = -search(candidate.next, depth: depth - 1, alpha: -beta, beta: -currentAlpha)
            best = max(best, score)
            currentAlpha = max(currentAlpha, score)
            if currentAlpha >= beta { break }
        }
        return best
    }

    private static func evaluate(_ state: ShogiState, perspective: ShogiSide) -> Int {
        func value(_ kind: ShogiKind) -> Int {
            switch kind {
            case .pawn: 100
            case .lance: 260
            case .knight: 300
            case .silver: 420
            case .gold: 520
            case .bishop: 760
            case .rook: 900
            case .king: 20_000
            }
        }
        let promotionBonus: [ShogiKind: Int] = [.pawn: 360, .lance: 300, .knight: 280, .silver: 180, .bishop: 180, .rook: 180]
        var score = 0
        for row in 0..<9 { for col in 0..<9 {
            guard let piece = state.board[row][col] else { continue }
            let sign = piece.side == perspective ? 1 : -1
            let advance = piece.kind == .king ? 0 : piece.side == .sente ? 8 - row : row
            let center = piece.kind == .king ? 0 : 4 - abs(4 - col)
            score += sign * (value(piece.kind) + (piece.promoted ? promotionBonus[piece.kind, default: 0] : 0) + advance * 2 + center * 2)
        } }
        for side in ShogiSide.allCases {
            let sign = side == perspective ? 1 : -1
            for kind in state.hands[side, default: []] { score += sign * value(kind) }
            if isInCheck(state, side: side) { score -= sign * 45 }
        }
        return score
    }

    private static func hasLegalAction(_ state: ShogiState, side: ShogiSide, preventPawnDropMate: Bool = true) -> Bool {
        var position = state
        position.turn = side
        for row in 0..<9 { for col in 0..<9 {
            if position.board[row][col]?.side == side, !legalMoves(position, row: row, col: col).isEmpty { return true }
        } }
        for kind in Set(position.hands[side, default: []]) {
            if !legalDrops(position, kind: kind, preventPawnDropMate: preventPawnDropMate).isEmpty { return true }
        }
        return false
    }

    fileprivate static func apply(_ state: ShogiState, _ action: ShogiAction) -> ShogiState {
        var next = state
        var hand = next.hands[state.turn, default: []]
        if let drop = action.drop {
            if let index = hand.firstIndex(of: drop) { hand.remove(at: index) }
            next.board[action.to.row][action.to.col] = ShogiPiece(side: state.turn, kind: drop)
        } else if let from = action.from, var piece = next.board[from.row][from.col] {
            if let captured = next.board[action.to.row][action.to.col], captured.kind != .king {
                hand.append(captured.kind)
            }
            next.board[from.row][from.col] = nil
            piece.promoted = piece.promoted || action.promote
            next.board[action.to.row][action.to.col] = piece
        }
        next.hands[state.turn] = hand
        next.turn = state.turn.opponent
        return next
    }

    private static func canDrop(_ state: ShogiState, kind: ShogiKind, row: Int, col: Int) -> Bool {
        guard state.board[row][col] == nil, state.hands[state.turn, default: []].contains(kind) else { return false }
        let lastRank = state.turn == .sente ? 0 : 8
        if (kind == .pawn || kind == .lance), row == lastRank { return false }
        if kind == .knight && (state.turn == .sente ? row <= 1 : row >= 7) { return false }
        if kind == .pawn {
            for boardRow in 0..<9 {
                if let piece = state.board[boardRow][col], piece.side == state.turn, piece.kind == .pawn, !piece.promoted { return false }
            }
        }
        return true
    }

    private static func inPromotionZone(_ side: ShogiSide, _ row: Int) -> Bool {
        side == .sente ? row <= 2 : row >= 6
    }

    private static func mustPromote(_ piece: ShogiPiece, destinationRow: Int) -> Bool {
        guard !piece.promoted else { return false }
        let lastRank = piece.side == .sente ? 0 : 8
        if piece.kind == .pawn || piece.kind == .lance { return destinationRow == lastRank }
        if piece.kind == .knight { return piece.side == .sente ? destinationRow <= 1 : destinationRow >= 7 }
        return false
    }

    private static func pseudoDestinations(_ board: [[ShogiPiece?]], row: Int, col: Int, piece: ShogiPiece) -> [ShogiPosition] {
        let dir = piece.side.forward
        let promotedGold = piece.promoted && [.pawn, .lance, .knight, .silver].contains(piece.kind)
        let effective: ShogiKind = promotedGold ? .gold : piece.kind
        var moves: [ShogiPosition] = []
        switch effective {
        case .pawn: moves += stepTargets(board, row: row, col: col, side: piece.side, vectors: [(dir, 0)])
        case .lance: moves += slideTargets(board, row: row, col: col, side: piece.side, vectors: [(dir, 0)])
        case .knight: moves += stepTargets(board, row: row, col: col, side: piece.side, vectors: [(2 * dir, -1), (2 * dir, 1)])
        case .silver: moves += stepTargets(board, row: row, col: col, side: piece.side, vectors: [(dir, 0), (dir, -1), (dir, 1), (-dir, -1), (-dir, 1)])
        case .gold: moves += stepTargets(board, row: row, col: col, side: piece.side, vectors: [(dir, 0), (dir, -1), (dir, 1), (0, -1), (0, 1), (-dir, 0)])
        case .king: moves += stepTargets(board, row: row, col: col, side: piece.side, vectors: [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)])
        case .bishop: moves += slideTargets(board, row: row, col: col, side: piece.side, vectors: [(-1, -1), (-1, 1), (1, -1), (1, 1)])
        case .rook: moves += slideTargets(board, row: row, col: col, side: piece.side, vectors: [(-1, 0), (1, 0), (0, -1), (0, 1)])
        }
        if piece.promoted, piece.kind == .bishop { moves += stepTargets(board, row: row, col: col, side: piece.side, vectors: [(-1, 0), (1, 0), (0, -1), (0, 1)]) }
        if piece.promoted, piece.kind == .rook { moves += stepTargets(board, row: row, col: col, side: piece.side, vectors: [(-1, -1), (-1, 1), (1, -1), (1, 1)]) }
        return moves
    }

    private static func stepTargets(_ board: [[ShogiPiece?]], row: Int, col: Int, side: ShogiSide, vectors: [(Int, Int)]) -> [ShogiPosition] {
        vectors.compactMap { vector in
            let nextRow = row + vector.0
            let nextCol = col + vector.1
            guard inBounds(nextRow, nextCol), board[nextRow][nextCol]?.side != side else { return nil }
            return ShogiPosition(row: nextRow, col: nextCol)
        }
    }

    private static func slideTargets(_ board: [[ShogiPiece?]], row: Int, col: Int, side: ShogiSide, vectors: [(Int, Int)]) -> [ShogiPosition] {
        var moves: [ShogiPosition] = []
        for vector in vectors {
            var nextRow = row + vector.0
            var nextCol = col + vector.1
            while inBounds(nextRow, nextCol) {
                if board[nextRow][nextCol]?.side == side { break }
                moves.append(ShogiPosition(row: nextRow, col: nextCol))
                if board[nextRow][nextCol] != nil { break }
                nextRow += vector.0
                nextCol += vector.1
            }
        }
        return moves
    }

    private static func inBounds(_ row: Int, _ col: Int) -> Bool { (0..<9).contains(row) && (0..<9).contains(col) }
}

struct ShogiGameView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    let onShare: (String) -> Void
    @State private var game = ShogiRules.initialState()
    @State private var isCpuGame = true
    @State private var humanSide: ShogiSide = .sente
    @State private var isThinking = false
    @State private var cpuTaskID = UUID()
    @State private var selectedSquare: ShogiPosition?
    @State private var selectedHand: ShogiKind?
    @State private var promotionActions: [ShogiAction]?
    @State private var winner: ShogiSide?

    private var canHumanPlay: Bool {
        winner == nil && !isThinking && (!isCpuGame || game.turn == humanSide)
    }

    private var selectedActions: [ShogiAction] {
        guard canHumanPlay else { return [] }
        if let selectedSquare { return ShogiRules.legalMoves(game, row: selectedSquare.row, col: selectedSquare.col) }
        if let selectedHand { return ShogiRules.legalDrops(game, kind: selectedHand) }
        return []
    }

    var body: some View {
        let destinationSquares = Set(selectedActions.map(\.to))
        VStack(alignment: .leading, spacing: 10) {
            Text(L("CPUまたは同じ端末の2人で対局できます。合法手・成り・持ち駒・王手と詰みを判定します。"))
                .font(.system(size: 13)).foregroundStyle(Color.irukaSecondary)
            Picker(L("対局モード"), selection: $isCpuGame) {
                Text(L("CPU対戦")).tag(true)
                Text(L("対人戦")).tag(false)
            }
            .pickerStyle(.segmented)
            .onChange(of: isCpuGame) { _, _ in restart() }
            if isCpuGame {
                Picker(L("あなたの手番"), selection: $humanSide) {
                    Text(L("先手")).tag(ShogiSide.sente)
                    Text(L("後手")).tag(ShogiSide.gote)
                }
                .pickerStyle(.segmented)
                .onChange(of: humanSide) { _, _ in restart() }
            }
            handView(.gote)
            HStack {
                Text(statusText).font(.system(size: 14, weight: .semibold)).foregroundStyle(winner == nil ? Color.irukaInk : Color.irukaBlue)
                    .accessibilityLiveRegion(.assertive)
                Spacer()
                Button(action: restart) { Image(systemName: "arrow.clockwise").frame(width: 42, height: 42) }
                    .buttonStyle(.bordered).accessibilityLabel(L("新しいゲーム"))
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 9), spacing: 0) {
                ForEach(0..<81, id: \.self) { index in
                    let row = index / 9
                    let col = index % 9
                    let piece = game.board[row][col]
                    let position = ShogiPosition(row: row, col: col)
                    let selected = selectedSquare == position
                    let isDestination = destinationSquares.contains(position)
                    Button { tapSquare(row: row, col: col) } label: {
                        ZStack {
                            Color(red: 0.91, green: 0.81, blue: 0.61)
                            if let piece {
                                Text(piece.glyph)
                                    .font(.system(size: 21, weight: .bold, design: .serif))
                                    .foregroundStyle(Color(red: 0.20, green: 0.14, blue: 0.09))
                                    .rotationEffect(.degrees(piece.side == .gote ? 180 : 0))
                            } else if isDestination {
                                Circle().fill(Color.green.opacity(0.65)).frame(width: 8, height: 8)
                            }
                            if selected {
                                Rectangle().stroke(Color.orange, lineWidth: 3)
                            } else if isDestination, piece != nil {
                                Circle().stroke(Color.green.opacity(0.8), lineWidth: 2).padding(2)
                            }
                        }
                        .frame(maxWidth: .infinity).aspectRatio(1, contentMode: .fit)
                        .overlay(Rectangle().stroke(Color(red: 0.61, green: 0.46, blue: 0.27), lineWidth: 0.5))
                    }
                    .buttonStyle(.plain)
                    .disabled(!canHumanPlay || promotionActions != nil)
                    .accessibilityLabel("\(row + 1) \(col + 1) \(piece?.glyph ?? L("空きマス"))")
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
            .padding(3)
            .background(Color(red: 0.61, green: 0.46, blue: 0.27), in: RoundedRectangle(cornerRadius: 7))
            handView(.sente)
            if let promotionActions {
                VStack(alignment: .leading, spacing: 8) {
                    Text(L("成りますか？")).font(.system(size: 14, weight: .semibold))
                    HStack {
                        ForEach(promotionActions, id: \.self) { action in
                            Button(L(action.promote ? "成る" : "成らない")) { commit(action) }
                                .buttonStyle(.bordered).frame(maxWidth: .infinity)
                        }
                    }
                }
                .padding(10).background(Color.irukaField, in: RoundedRectangle(cornerRadius: 12))
            }
            if let winner {
                VStack(spacing: 8) {
                    Text(winnerLabel(winner)).font(.system(size: 16, weight: .bold))
                    Button { onShare("\(winnerLabel(winner)) · \(L("将棋"))") } label: {
                        Label(L("結果を投稿で共有"), systemImage: "square.and.arrow.up")
                            .frame(maxWidth: .infinity, minHeight: 42)
                    }
                    .buttonStyle(.borderedProminent).tint(Color.irukaBlue)
                }
                .frame(maxWidth: .infinity).padding(10).background(Color.irukaField, in: RoundedRectangle(cornerRadius: 12))
            }
        }
        .onAppear(perform: scheduleCpuMove)
    }

    private var statusText: String {
        if let winner { return winnerLabel(winner) }
        if isThinking { return L("CPUが考えています…") }
        let player = isCpuGame ? "\(L(game.turn == humanSide ? "あなた" : "CPU")) · " : ""
        return player + L(game.turn == .sente ? "先手の番" : "後手の番") + (ShogiRules.isInCheck(game, side: game.turn) ? " · \(L("王手"))" : "")
    }

    private func winnerLabel(_ side: ShogiSide) -> String {
        if isCpuGame && side != humanSide { return L("CPUの勝ち") }
        return L(side == .sente ? "先手の勝ち" : "後手の勝ち")
    }

    private func handView(_ side: ShogiSide) -> some View {
        let pieces = game.hands[side, default: []]
        let displayedKinds = ShogiRules.handOrder.filter(pieces.contains)
        return VStack(alignment: .leading, spacing: 4) {
            Text("\(side.label) · \(L("持ち駒"))").font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.irukaSecondary)
            HStack(spacing: 5) {
                if displayedKinds.isEmpty {
                    Text("—").font(.system(size: 14)).foregroundStyle(Color.irukaSecondary).frame(minHeight: 34)
                } else {
                    ForEach(displayedKinds, id: \.self) { kind in
                        let count = pieces.filter { $0 == kind }.count
                        Button { selectHand(kind) } label: {
                            HStack(spacing: 2) {
                                Text(kind.glyph).font(.system(size: 16, weight: .bold))
                                if count > 1 { Text(String(count)).font(.system(size: 10, weight: .bold)) }
                            }
                            .frame(minWidth: 35, minHeight: 34)
                            .background(selectedHand == kind && game.turn == side ? Color.irukaBlue.opacity(0.18) : Color.irukaField, in: RoundedRectangle(cornerRadius: 7))
                        }
                        .buttonStyle(.plain)
                        .disabled(!canHumanPlay || game.turn != side || promotionActions != nil)
                        .accessibilityLabel("\(side.label) \(L("持ち駒")) \(kind.glyph) \(count)")
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 7).padding(.vertical, 4)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 10))
        }
    }

    private func tapSquare(row: Int, col: Int) {
        guard canHumanPlay, promotionActions == nil else { return }
        let destination = ShogiPosition(row: row, col: col)
        let choices = selectedActions.filter { $0.to == destination }
        if !choices.isEmpty {
            if choices.count > 1 { promotionActions = choices }
            else { commit(choices[0]) }
            return
        }
        if game.board[row][col]?.side == game.turn {
            selectedSquare = destination
            selectedHand = nil
        } else {
            selectedSquare = nil
            selectedHand = nil
        }
    }

    private func selectHand(_ kind: ShogiKind) {
        guard canHumanPlay, promotionActions == nil, game.hands[game.turn, default: []].contains(kind) else { return }
        selectedHand = selectedHand == kind ? nil : kind
        selectedSquare = nil
    }

    private func commit(_ action: ShogiAction) {
        let next = ShogiRules.apply(game, action)
        winner = ShogiRules.isCheckmate(next) ? game.turn : nil
        game = next
        selectedSquare = nil
        selectedHand = nil
        promotionActions = nil
        DispatchQueue.main.async { scheduleCpuMove() }
    }

    private func restart() {
        game = ShogiRules.initialState()
        selectedSquare = nil
        selectedHand = nil
        promotionActions = nil
        cpuTaskID = UUID()
        isThinking = false
        winner = nil
        DispatchQueue.main.async { scheduleCpuMove() }
    }

    private func scheduleCpuMove() {
        guard isCpuGame, game.turn != humanSide, winner == nil else {
            isThinking = false
            return
        }
        let taskID = UUID()
        cpuTaskID = taskID
        let position = game
        isThinking = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.32) {
            guard cpuTaskID == taskID, isCpuGame, game.turn == position.turn, game.turn != humanSide, winner == nil else { return }
            guard let action = ShogiRules.chooseCpuAction(position) else {
                winner = humanSide
                isThinking = false
                return
            }
            let next = ShogiRules.apply(position, action)
            winner = ShogiRules.isCheckmate(next) ? position.turn : nil
            game = next
            selectedSquare = nil
            selectedHand = nil
            promotionActions = nil
            isThinking = false
        }
    }
}
