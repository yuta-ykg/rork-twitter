import SwiftUI

/// 投稿に付いた投票。投票後・終了後は結果をバーで表示する。
struct PollView: View {
    let poll: Poll
    let onVote: (Int) -> Void

    private var showsResults: Bool { poll.isClosed || poll.myVote != nil }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(poll.options.indices, id: \.self) { index in
                if showsResults { resultRow(index) } else { voteButton(index) }
            }
            Text("\(poll.totalVotes)\(L("票")) · \(remainingText)")
                .font(.system(size: 13))
                .foregroundStyle(Color.irukaSecondary)
        }
    }

    private func voteButton(_ index: Int) -> some View {
        Button {
            onVote(index)
        } label: {
            Text(poll.options[index])
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(Color.irukaBlue)
                .frame(maxWidth: .infinity, minHeight: 44)
                .overlay { Capsule().stroke(Color.irukaBlue, lineWidth: 1) }
                .contentShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func resultRow(_ index: Int) -> some View {
        let count = index < poll.counts.count ? poll.counts[index] : 0
        let fraction = poll.totalVotes > 0 ? Double(count) / Double(poll.totalVotes) : 0
        let isTop = count > 0 && count == (poll.counts.max() ?? 0)
        let mine = poll.myVote == index
        return HStack(spacing: 6) {
            Text(poll.options[index])
                .font(.system(size: 15, weight: mine ? .bold : .regular))
                .foregroundStyle(Color.irukaInk)
                .lineLimit(1)
            if mine { Image(systemName: "checkmark").font(.system(size: 12, weight: .bold)).foregroundStyle(Color.irukaInk) }
            Spacer(minLength: 8)
            Text("\(Int((fraction * 100).rounded()))%")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(Color.irukaInk)
        }
        .padding(.horizontal, 12)
        .frame(minHeight: 40)
        .background(alignment: .leading) {
            GeometryReader { proxy in
                Rectangle()
                    .fill(Color.irukaBlue.opacity(isTop ? 0.35 : 0.15))
                    .frame(width: proxy.size.width * fraction)
                    .animation(.easeOut(duration: 0.5), value: fraction)
            }
        }
        .background(Color.irukaField)
        .clipShape(.rect(cornerRadius: 8))
        .accessibilityElement(children: .combine)
    }

    private var remainingText: String {
        let seconds = poll.endsAt.timeIntervalSinceNow
        if seconds <= 0 { return L("終了") }
        let minutes = Int((seconds / 60).rounded(.up))
        if minutes < 60 { return "\(L("残り")) \(minutes)\(L("分"))" }
        let hours = Int((Double(minutes) / 60).rounded(.up))
        if hours < 48 { return "\(L("残り")) \(hours)\(L("時間"))" }
        return "\(L("残り")) \(Int((Double(hours) / 24).rounded(.up)))\(L("日"))"
    }
}
