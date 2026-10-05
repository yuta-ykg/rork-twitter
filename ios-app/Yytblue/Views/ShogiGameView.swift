import SwiftUI
import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit

private enum ShogiSide: String, CaseIterable, Hashable, Codable, Sendable {
    case sente, gote

    var opponent: ShogiSide { self == .sente ? .gote : .sente }
    var forward: Int { self == .sente ? -1 : 1 }
    var label: String { self == .sente ? L("先手") : L("後手") }
}

private enum ShogiKind: String, CaseIterable, Hashable, Codable, Sendable {
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

private struct ShogiPiece: Equatable, Codable, Sendable {
    let side: ShogiSide
    let kind: ShogiKind
    var promoted = false
    var glyph: String { kind.glyph(promoted: promoted) }
}

private struct ShogiPosition: Hashable, Codable, Sendable {
    let row: Int
    let col: Int
}

private struct ShogiAction: Hashable, Codable, Sendable {
    let from: ShogiPosition?
    let to: ShogiPosition
    var drop: ShogiKind? = nil
    var promote = false
}

private enum ShogiHandCodingKey: String, CodingKey { case sente, gote }

private struct ShogiState: Codable, Sendable {
    var board: [[ShogiPiece?]]
    var hands: [ShogiSide: [ShogiKind]]
    var turn: ShogiSide

    private enum CodingKeys: String, CodingKey { case board, hands, turn }
    init(board: [[ShogiPiece?]], hands: [ShogiSide: [ShogiKind]], turn: ShogiSide) {
        self.board = board; self.hands = hands; self.turn = turn
    }
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        board = try container.decode([[ShogiPiece?]].self, forKey: .board)
        turn = try container.decode(ShogiSide.self, forKey: .turn)
        let handContainer = try container.nestedContainer(keyedBy: ShogiHandCodingKey.self, forKey: .hands)
        hands = [
            .sente: try handContainer.decode([ShogiKind].self, forKey: .sente),
            .gote: try handContainer.decode([ShogiKind].self, forKey: .gote),
        ]
    }
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(board, forKey: .board)
        try container.encode(turn, forKey: .turn)
        var handContainer = container.nestedContainer(keyedBy: ShogiHandCodingKey.self, forKey: .hands)
        try handContainer.encode(hands[.sente, default: []], forKey: .sente)
        try handContainer.encode(hands[.gote, default: []], forKey: .gote)
    }
}

private struct ShogiRoomSnapshot: Decodable, Sendable {
    let id: UUID
    let roomKey: String
    let senteUserId: String
    let goteUserId: String?
    let gameState: ShogiState
    let revision: Int
    let status: String
    enum CodingKeys: String, CodingKey {
        case id, status, revision
        case roomKey = "room_key"
        case senteUserId = "sente_user_id"
        case goteUserId = "gote_user_id"
        case gameState = "game_state"
    }
}

private struct ShogiEnsureProfileParams: Encodable, Sendable {
    let expected_user_id: String
    let profile_email: String
    let profile_name: String
    let profile_avatar: String
}
private struct ShogiCreateRoomParams: Encodable, Sendable { let room_key: String; let expected_user_id: String }
private struct ShogiRoomKeyParams: Encodable, Sendable { let target_room_key: String; let expected_user_id: String }
private struct ShogiMoveParams: Encodable, Sendable {
    let target_room_key: String
    let expected_revision: Int
    let move_action: ShogiAction
    let next_state: ShogiState
    let expected_user_id: String
}

private enum ShogiRoomAPI {
    static let alphabet = Array("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
    static func newKey() -> String { String((0..<6).compactMap { _ in alphabet.randomElement() }) }

    static func create(user: AuthManager.User) async throws -> ShogiRoomSnapshot {
        try await ensureProfile(user)
        return try await IrukaDatabase.client.rpc("create_shogi_room", params: ShogiCreateRoomParams(
            room_key: newKey(), expected_user_id: user.id
        )).execute().value
    }

    static func join(key: String, user: AuthManager.User) async throws -> ShogiRoomSnapshot? {
        try await ensureProfile(user)
        return try await IrukaDatabase.client.rpc("join_shogi_room", params: ShogiRoomKeyParams(
            target_room_key: key.uppercased(), expected_user_id: user.id
        )).execute().value
    }

    static func fetch(key: String, userId: String) async throws -> ShogiRoomSnapshot? {
        try await IrukaDatabase.client.rpc("get_shogi_room", params: ShogiRoomKeyParams(
            target_room_key: key.uppercased(), expected_user_id: userId
        )).execute().value
    }

    static func submit(room: ShogiRoomSnapshot, userId: String, action: ShogiAction, state: ShogiState) async throws -> ShogiRoomSnapshot {
        try await IrukaDatabase.client.rpc("submit_shogi_move", params: ShogiMoveParams(
            target_room_key: room.roomKey, expected_revision: room.revision, move_action: action,
            next_state: state, expected_user_id: userId
        )).execute().value
    }

    private static func ensureProfile(_ user: AuthManager.User) async throws {
        try await IrukaDatabase.client.rpc("ensure_profile", params: ShogiEnsureProfileParams(
            expected_user_id: user.id, profile_email: user.email, profile_name: user.displayName, profile_avatar: user.picture ?? ""
        )).execute()
    }
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
    let user: AuthManager.User?
    let onShare: (String) -> Void
    let onRequestSignIn: () -> Void
    @State private var game = ShogiRules.initialState()
    @State private var isCpuGame = true
    @State private var humanSide: ShogiSide = .sente
    @State private var isThinking = false
    @State private var isRoomBusy = false
    @State private var room: ShogiRoomSnapshot?
    @State private var roomKeyInput = ""
    @State private var roomError = ""
    @State private var cpuTaskID = UUID()
    @State private var selectedSquare: ShogiPosition?
    @State private var selectedHand: ShogiKind?
    @State private var promotionActions: [ShogiAction]?
    @State private var winner: ShogiSide?

    private var onlineSide: ShogiSide? {
        guard let room, let user else { return nil }
        if user.id == room.senteUserId { return .sente }
        if user.id == room.goteUserId { return .gote }
        return nil
    }

    private var canHumanPlay: Bool {
        winner == nil && !isThinking && !isRoomBusy
            && (isCpuGame ? game.turn == humanSide : room?.status == "playing" && onlineSide == game.turn)
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
            Text(L("CPUまたはQRコード・部屋キーで招待した相手とオンライン対局できます。合法手・成り・持ち駒・王手と詰みを判定します。"))
                .font(.system(size: 13)).foregroundStyle(Color.irukaSecondary)
            Picker(L("対局モード"), selection: $isCpuGame) {
                Text(L("CPU対戦")).tag(true)
                Text(L("部屋対局")).tag(false)
            }
            .pickerStyle(.segmented)
            .onChange(of: isCpuGame) { _, isCpu in changeMode(isCpu: isCpu) }
            if !isCpuGame { roomLobby }
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
                if isCpuGame {
                    Button(action: restart) { Image(systemName: "arrow.clockwise").frame(width: 42, height: 42) }
                    .buttonStyle(.bordered).accessibilityLabel(L("新しいゲーム"))
                }
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
        .task(id: "\(isCpuGame)-\(room?.roomKey ?? "")") { await watchRoom() }
    }

    private var statusText: String {
        if let winner { return winnerLabel(winner) }
        if isThinking { return L("CPUが考えています…") }
        if !isCpuGame, room?.status == "waiting" { return L("相手の参加を待っています。") }
        if !isCpuGame, room?.status == "playing", let onlineSide {
            let turnLabel = onlineSide == game.turn ? L("あなたの番") : L("相手の番")
            return turnLabel + (ShogiRules.isInCheck(game, side: game.turn) ? " · \(L("王手"))" : "")
        }
        let player = isCpuGame ? "\(L(game.turn == humanSide ? "あなた" : "CPU")) · " : ""
        return player + L(game.turn == .sente ? "先手の番" : "後手の番") + (ShogiRules.isInCheck(game, side: game.turn) ? " · \(L("王手"))" : "")
    }

    private func winnerLabel(_ side: ShogiSide) -> String {
        if isCpuGame && side != humanSide { return L("CPUの勝ち") }
        if !isCpuGame, let onlineSide { return side == onlineSide ? L("あなたの勝ち") : L("相手の勝ち") }
        return L(side == .sente ? "先手の勝ち" : "後手の勝ち")
    }

    private var roomLobby: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let room {
                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(L("部屋キー")).font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.irukaSecondary)
                        Text(room.roomKey).font(.system(size: 23, weight: .bold, design: .monospaced)).tracking(3)
                            .accessibilityLabel("\(L("部屋キー")) \(room.roomKey)")
                        HStack(spacing: 8) {
                            Button {
                                UIPasteboard.general.string = room.roomKey
                                roomError = L("部屋キーをコピーしました。")
                            } label: { Label(L("部屋キーをコピー"), systemImage: "doc.on.doc") }
                                .buttonStyle(.bordered)
                            ShareLink(item: room.roomKey) { Label(L("共有"), systemImage: "square.and.arrow.up") }
                                .buttonStyle(.bordered)
                        }
                    }
                    Spacer(minLength: 0)
                    ShogiRoomQR(value: room.roomKey)
                        .frame(width: 108, height: 108)
                        .accessibilityLabel(L("部屋キーのQRコード"))
                }
                Text(room.status == "waiting" ? L("相手の参加を待っています。") : L("対局中です。相手の手を待っています。"))
                    .font(.system(size: 13)).foregroundStyle(Color.irukaSecondary)
                if room.status == "playing", let onlineSide {
                    Text("\(L("あなたの手番")) · \(onlineSide.label)")
                        .font(.system(size: 13, weight: .semibold)).foregroundStyle(Color.irukaInk)
                }
                Button(L("別の部屋に参加")) {
                    self.room = nil
                    game = ShogiRules.initialState()
                    winner = nil
                    roomError = ""
                }
                .font(.system(size: 13, weight: .medium))
            } else {
                if user == nil {
                    Text(L("オンライン対局にはログインが必要です。"))
                        .font(.system(size: 13)).foregroundStyle(Color.irukaSecondary)
                    Button(L("ログイン"), action: onRequestSignIn)
                        .buttonStyle(.borderedProminent).tint(Color.irukaBlue)
                } else {
                    HStack(spacing: 8) {
                        TextField(L("部屋キーを入力"), text: $roomKeyInput)
                            .textInputAutocapitalization(.characters)
                            .autocorrectionDisabled()
                            .font(.system(.body, design: .monospaced))
                            .padding(.horizontal, 11).frame(minHeight: 42)
                            .background(Color.white, in: RoundedRectangle(cornerRadius: 9))
                            .onChange(of: roomKeyInput) { _, value in
                                roomKeyInput = String(value.uppercased().filter { ShogiRoomAPI.alphabet.contains($0) }.prefix(6))
                            }
                        Button(action: joinRoom) {
                            if isRoomBusy { ProgressView().frame(width: 72, height: 40) }
                            else { Text(L("部屋に参加")).frame(minWidth: 72, minHeight: 40) }
                        }
                        .buttonStyle(.borderedProminent).tint(Color.irukaBlue)
                        .disabled(isRoomBusy || roomKeyInput.count != 6)
                    }
                    Button(action: createRoom) {
                        Label(isRoomBusy ? L("作成中…") : L("部屋を作成"), systemImage: "plus.circle")
                            .frame(maxWidth: .infinity, minHeight: 40)
                    }
                    .buttonStyle(.bordered).disabled(isRoomBusy)
                }
            }
            if !roomError.isEmpty {
                Text(roomError).font(.system(size: 12)).foregroundStyle(Color.irukaBlue)
                    .accessibilityLiveRegion(.polite)
            }
        }
        .padding(10)
        .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 12))
    }

    private func createRoom() {
        guard let user else { onRequestSignIn(); return }
        guard !isRoomBusy else { return }
        isRoomBusy = true
        roomError = ""
        Task {
            do {
                let created = try await ShogiRoomAPI.create(user: user)
                applyRoom(created)
            } catch {
                roomError = L("対局部屋を作成できませんでした。もう一度お試しください。")
            }
            isRoomBusy = false
        }
    }

    private func joinRoom() {
        guard let user else { onRequestSignIn(); return }
        guard !isRoomBusy, roomKeyInput.count == 6 else { return }
        isRoomBusy = true
        roomError = ""
        Task {
            do {
                guard let joined = try await ShogiRoomAPI.join(key: roomKeyInput, user: user) else {
                    roomError = L("部屋が見つからないか、有効期限が切れています。")
                    isRoomBusy = false
                    return
                }
                applyRoom(joined)
                roomKeyInput = joined.roomKey
            } catch {
                let message = error.localizedDescription.localizedLowercase
                roomError = message.contains("full") ? L("この部屋は満員です。") : L("部屋が見つからないか、参加できませんでした。")
            }
            isRoomBusy = false
        }
    }

    private func watchRoom() async {
        guard !isCpuGame, let room, let user else { return }
        let key = room.roomKey
        while !Task.isCancelled, !isCpuGame {
            do {
                try await Task.sleep(nanoseconds: 1_500_000_000)
                guard !Task.isCancelled else { return }
                guard let latest = try await ShogiRoomAPI.fetch(key: key, userId: user.id) else {
                    roomError = L("部屋が見つからないか、有効期限が切れています。")
                    continue
                }
                if latest.revision != self.room?.revision || latest.status != self.room?.status {
                    applyRoom(latest)
                }
            } catch is CancellationError {
                return
            } catch {
                if Task.isCancelled { return }
            }
        }
    }

    private func applyRoom(_ snapshot: ShogiRoomSnapshot) {
        room = snapshot
        game = snapshot.gameState
        winner = ShogiRules.isCheckmate(snapshot.gameState) ? snapshot.gameState.turn.opponent : nil
        selectedSquare = nil
        selectedHand = nil
        promotionActions = nil
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
        if !isCpuGame {
            guard !isRoomBusy else { return }
            isRoomBusy = true
            Task { await submitOnlineMove(action) }
            return
        }
        let next = ShogiRules.apply(game, action)
        winner = ShogiRules.isCheckmate(next) ? game.turn : nil
        game = next
        selectedSquare = nil
        selectedHand = nil
        promotionActions = nil
        DispatchQueue.main.async { scheduleCpuMove() }
    }

    private func submitOnlineMove(_ action: ShogiAction) async {
        guard let room, let user else { isRoomBusy = false; return }
        roomError = ""
        let next = ShogiRules.apply(game, action)
        do {
            let updated = try await ShogiRoomAPI.submit(room: room, userId: user.id, action: action, state: next)
            applyRoom(updated)
        } catch {
            roomError = L("手を保存できませんでした。盤面を更新して再度お試しください。")
            do {
                if let latest = try await ShogiRoomAPI.fetch(key: room.roomKey, userId: user.id) { applyRoom(latest) }
            } catch { }
        }
        isRoomBusy = false
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

    private func changeMode(isCpu: Bool) {
        selectedSquare = nil
        selectedHand = nil
        promotionActions = nil
        winner = nil
        isThinking = false
        cpuTaskID = UUID()
        if isCpu {
            room = nil
            roomError = ""
            game = ShogiRules.initialState()
            DispatchQueue.main.async { scheduleCpuMove() }
        } else if let room {
            applyRoom(room)
        } else {
            game = ShogiRules.initialState()
        }
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

private struct ShogiRoomQR: View {
    let value: String
    private var image: UIImage? {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(value.utf8)
        filter.correctionLevel = "M"
        guard let output = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 8, y: 8)),
              let cgImage = CIContext().createCGImage(output, from: output.extent) else { return nil }
        return UIImage(cgImage: cgImage)
    }
    var body: some View {
        Group {
            if let image {
                Image(uiImage: image).interpolation(.none).resizable().scaledToFit()
                    .padding(5).background(.white, in: RoundedRectangle(cornerRadius: 8))
            } else {
                Image(systemName: "qrcode").resizable().scaledToFit().padding(20).background(.white, in: RoundedRectangle(cornerRadius: 8))
            }
        }
    }
}
