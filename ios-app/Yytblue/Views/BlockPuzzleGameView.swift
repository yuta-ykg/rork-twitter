import SwiftUI

private struct PuzzlePiece {
    let name: String
    let cells: [(Int, Int)]
    var width: Int { (cells.map { $0.1 }.max() ?? 0) + 1 }
    var height: Int { (cells.map { $0.0 }.max() ?? 0) + 1 }
}

private struct BlockPuzzleState {
    static let pieces: [PuzzlePiece] = [
        .init(name: "1", cells: [(0, 0)]),
        .init(name: "2横", cells: [(0, 0), (0, 1)]),
        .init(name: "2縦", cells: [(0, 0), (1, 0)]),
        .init(name: "3横", cells: [(0, 0), (0, 1), (0, 2)]),
        .init(name: "3縦", cells: [(0, 0), (1, 0), (2, 0)]),
        .init(name: "L", cells: [(0, 0), (1, 0), (1, 1)]),
        .init(name: "逆L", cells: [(0, 0), (0, 1), (1, 1)]),
        .init(name: "2×2", cells: [(0, 0), (0, 1), (1, 0), (1, 1)]),
        .init(name: "T", cells: [(0, 0), (0, 1), (0, 2), (1, 1)]),
        .init(name: "3×3", cells: [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2), (2, 0), (2, 1), (2, 2)])
    ]

    private(set) var board = Array(repeating: false, count: 64)
    private(set) var tray: [Int?] = (0..<3).map { _ in Int.random(in: 0..<pieces.count) }
    private(set) var score = 0
    private(set) var lines = 0
    private(set) var ended = false

    func canPlace(_ piece: PuzzlePiece, row: Int, col: Int) -> Bool {
        piece.cells.allSatisfy { offset in
            let (dr, dc) = offset
            let r = row + dr
            let c = col + dc
            return (0..<8).contains(r) && (0..<8).contains(c) && !board[r * 8 + c]
        }
    }

    private var hasMove: Bool {
        tray.compactMap { $0 }.contains { index in
            (0..<64).contains { point in canPlace(Self.pieces[index], row: point / 8, col: point % 8) }
        }
    }

    @discardableResult mutating func place(trayIndex: Int, row: Int, col: Int) -> Bool {
        guard !ended, tray.indices.contains(trayIndex), let pieceIndex = tray[trayIndex] else { return false }
        let piece = Self.pieces[pieceIndex]
        guard canPlace(piece, row: row, col: col) else { return false }
        for (dr, dc) in piece.cells { board[(row + dr) * 8 + col + dc] = true }
        let fullRows = (0..<8).filter { r in (0..<8).allSatisfy { c in board[r * 8 + c] } }
        let fullCols = (0..<8).filter { c in (0..<8).allSatisfy { r in board[r * 8 + c] } }
        for r in fullRows { for c in 0..<8 { board[r * 8 + c] = false } }
        for c in fullCols { for r in 0..<8 { board[r * 8 + c] = false } }
        let cleared = fullRows.count + fullCols.count
        score += piece.cells.count + cleared * 10
        lines += cleared
        tray[trayIndex] = nil
        if tray.allSatisfy({ $0 == nil }) {
            tray = (0..<3).map { _ in Int.random(in: 0..<Self.pieces.count) }
        }
        ended = !hasMove
        return true
    }
}

struct BlockPuzzleGameView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @State private var game = BlockPuzzleState()
    @State private var selected = 0
    @State private var notice = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(L("ブロックパズル")).font(.system(size: 20, weight: .bold))
            Text(L("ピースを選び、盤面の置きたい位置をタップ。行か列を埋めると消えます。"))
                .font(.system(size: 13)).foregroundStyle(.secondary)
            HStack {
                Text("\(L("スコア"))  \(game.score)").bold()
                Spacer()
                Text("\(L("消したライン"))  \(game.lines)").bold()
            }
            .font(.system(size: 14))
            .padding(10)
            .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 12))

            GeometryReader { geometry in
                let side = (geometry.size.width - 31) / 8
                LazyVGrid(columns: Array(repeating: GridItem(.fixed(side), spacing: 3), count: 8), spacing: 3) {
                    ForEach(0..<64, id: \.self) { index in
                        Button { place(index) } label: {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(game.board[index] ? Color.cyan : Color(red: 0.25, green: 0.33, blue: 0.44))
                                .frame(width: side, height: side)
                        }
                        .buttonStyle(.plain)
                        .disabled(game.ended)
                        .accessibilityLabel("\(index / 8 + 1)\(L("行"))\(index % 8 + 1)\(L("列"))、\(L(game.board[index] ? "ブロックあり" : "空き"))")
                    }
                }
                .padding(5)
                .background(Color(red: 0.08, green: 0.13, blue: 0.2), in: RoundedRectangle(cornerRadius: 10))
            }
            .aspectRatio(1, contentMode: .fit)

            Text(L("ピースを選択")).font(.system(size: 14, weight: .semibold))
            HStack(spacing: 8) {
                ForEach(0..<3, id: \.self) { index in
                    Button { selected = index } label: {
                        Group {
                            if let pieceIndex = game.tray[index] {
                                let piece = BlockPuzzleState.pieces[pieceIndex]
                                VStack(spacing: 2) {
                                    ForEach(0..<piece.height, id: \.self) { row in
                                        HStack(spacing: 2) {
                                            ForEach(0..<piece.width, id: \.self) { col in
                                                RoundedRectangle(cornerRadius: 2)
                                                    .fill(piece.cells.contains { $0.0 == row && $0.1 == col } ? Color.cyan : Color.clear)
                                                    .frame(width: 13, height: 13)
                                            }
                                        }
                                    }
                                }
                            } else {
                                Text("—").foregroundStyle(.secondary)
                            }
                        }
                        .frame(maxWidth: .infinity, minHeight: 72)
                        .background(selected == index ? Color.cyan.opacity(0.18) : Color.irukaField,
                                    in: RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(selected == index ? Color.cyan : Color.clear, lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                    .disabled(game.tray[index] == nil || game.ended)
                    .accessibilityLabel("\(L("ピース")) \(index + 1)")
                    .accessibilityAddTraits(selected == index ? .isSelected : [])
                }
            }
            if !notice.isEmpty { Text(notice).font(.system(size: 13)).foregroundStyle(.red) }
            if game.ended { Text(L("置ける場所がありません。ゲーム終了です。")).font(.system(size: 15, weight: .bold)) }
            Button(L("新しいゲーム")) {
                game = BlockPuzzleState()
                selected = 0
                notice = ""
            }
            .buttonStyle(.bordered)
            .frame(maxWidth: .infinity)
        }
    }

    private func place(_ index: Int) {
        if game.place(trayIndex: selected, row: index / 8, col: index % 8) {
            notice = ""
            if let next = game.tray.firstIndex(where: { $0 != nil }) { selected = next }
        } else {
            notice = L("ここには置けません。")
        }
    }
}
