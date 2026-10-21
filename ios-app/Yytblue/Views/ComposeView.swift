import PhotosUI
import SwiftUI

/// 70字までの本文だけを書く投稿画面。
struct ComposeView: View {
    @Environment(AuthManager.self) private var auth
    @Environment(PostStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue

    var quoting: Post? = nil
    var replying: Post? = nil

    @State private var draft = ""
    @State private var pickerItem: PhotosPickerItem?
    @State private var imageData: Data?
    @State private var pollOn = false
    @State private var pollOptions: [String] = ["", ""]
    @State private var pollMinutes = 1440
    @State private var customDuration = false
    @State private var customDays = "1"
    @State private var customHours = "0"
    @State private var customMinutes = "0"
    @FocusState private var isFocused: Bool

    private let durations: [(minutes: Int, label: String)] = [(60, "1時間"), (1440, "1日"), (4320, "3日"), (10080, "7日")]
    private var effectiveMinutes: Int {
        guard customDuration else { return pollMinutes }
        return (Int(customDays) ?? 0) * 1440 + (Int(customHours) ?? 0) * 60 + (Int(customMinutes) ?? 0)
    }
    private var durationValid: Bool { (5...10080).contains(effectiveMinutes) }
    private var filledOptions: [String] {
        pollOptions.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
    }

    private var count: Int { draft.count }
    private var canPost: Bool {
        let trimmed = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmed.isEmpty && count <= PostLimits.maxCharacters && (!pollOn || (filledOptions.count >= 2 && durationValid))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let replying {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 6) {
                        AvatarView(initial: replying.initial, index: replying.avatarIndex, url: replying.avatarUrl, size: 22)
                        Text(replying.authorName).appTextFont(size: 14, weight: .bold).foregroundStyle(Color.irukaInk).lineLimit(1)
                        Text(replying.handle).appTextFont(size: 14).foregroundStyle(Color.irukaSecondary).lineLimit(1)
                    }
                    Text(replying.body).appTextFont(size: 15).foregroundStyle(Color.irukaInk)
                        .fixedSize(horizontal: false, vertical: true)
                    if let urlString = replying.imageUrl, let url = URL(string: urlString) {
                        Color(.secondarySystemBackground)
                            .frame(height: 120)
                            .overlay {
                                AsyncImage(url: url) { $0.resizable().aspectRatio(contentMode: .fill) } placeholder: { ProgressView() }
                                    .allowsHitTesting(false)
                            }
                            .clipShape(.rect(cornerRadius: 12))
                    }
                    Text("\(L("返信先")) \(replying.handle)")
                        .appTextFont(size: 14).foregroundStyle(Color.irukaSecondary)
                        .padding(.top, 2)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.irukaField.opacity(0.6), in: RoundedRectangle(cornerRadius: 16))
                .overlay { RoundedRectangle(cornerRadius: 16).stroke(Color.irukaHairline, lineWidth: 1) }
            }
            HStack(alignment: .top, spacing: 12) {
                AvatarView(initial: auth.user?.initial ?? "あ", index: 0, url: auth.user?.picture, size: 40)
                ZStack(alignment: .topLeading) {
                    if draft.isEmpty {
                        Text(L(replying == nil ? "今の気持ちを、70字まで。" : "返信を投稿"))
                            .appTextFont(size: 18)
                            .foregroundStyle(Color.irukaSecondary)
                            .padding(.top, 8)
                            .allowsHitTesting(false)
                    }
                    TextEditor(text: $draft)
                        .appTextFont(size: 18)
                        .foregroundStyle(Color.irukaInk)
                        .scrollContentBackground(.hidden)
                        .focused($isFocused)
                        .frame(minHeight: 160)
                        .onChange(of: draft) { _, newValue in
                            if newValue.count > PostLimits.maxCharacters {
                                draft = String(newValue.prefix(PostLimits.maxCharacters))
                            }
                        }
                }
            }
            if let imageData, let preview = UIImage(data: imageData) {
                Color.clear
                    .frame(height: 220)
                    .overlay { Image(uiImage: preview).resizable().aspectRatio(contentMode: .fill).allowsHitTesting(false) }
                    .clipShape(.rect(cornerRadius: 16))
                    .overlay(alignment: .topTrailing) {
                        Button {
                            self.imageData = nil
                            pickerItem = nil
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 30, height: 30)
                                .background(.black.opacity(0.65), in: Circle())
                                .frame(width: 44, height: 44)
                        }
                        .accessibilityLabel(L("画像を外す"))
                    }
                    .padding(.leading, 52)
            }
            if pollOn { pollEditor }
            if let quoting {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        AvatarView(initial: quoting.initial, index: quoting.avatarIndex, url: quoting.avatarUrl, size: 18)
                        Text(quoting.authorName).appTextFont(size: 14, weight: .bold).foregroundStyle(Color.irukaInk).lineLimit(1)
                        Text(quoting.handle).appTextFont(size: 14).foregroundStyle(Color.irukaSecondary).lineLimit(1)
                    }
                    Text(quoting.body).appTextFont(size: 14).foregroundStyle(Color.irukaInk)
                }
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .overlay { RoundedRectangle(cornerRadius: 16).stroke(Color.irukaHairline, lineWidth: 1) }
                .padding(.leading, 52)
            }
            Spacer(minLength: 0)
            HStack {
                PhotosPicker(selection: $pickerItem, matching: .images) {
                    Image(systemName: "photo.badge.plus")
                        .font(.system(size: 22))
                        .foregroundStyle(Color.irukaBlue)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel(L("画像を追加"))
                if quoting == nil && replying == nil {
                    Button {
                        withAnimation(.snappy) { pollOn.toggle() }
                    } label: {
                        Image(systemName: "chart.bar")
                            .font(.system(size: 22))
                            .foregroundStyle(Color.irukaBlue)
                            .frame(width: 44, height: 44)
                            .background(pollOn ? Color.irukaBlue.opacity(0.12) : .clear, in: Circle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(L("投票を追加"))
                    .accessibilityAddTraits(pollOn ? .isSelected : [])
                }
                Spacer()
                Text("\(count) / \(PostLimits.maxCharacters)")
                    .font(.system(size: 15, weight: .medium, design: .monospaced))
                    .foregroundStyle(count >= PostLimits.maxCharacters ? Color.red : Color.irukaSecondary)
                    .accessibilityLabel("\(count) / \(PostLimits.maxCharacters)")
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .background(Color.irukaBackground)
        .navigationTitle(L(replying == nil ? "新しい投稿" : "返信する"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button(L("キャンセル")) { dismiss() }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button(action: submit) {
                    Text(L(replying == nil ? "投稿する" : "返信する"))
                        .appTextFont(size: 15, weight: .bold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .frame(minHeight: 32)
                        .background(canPost ? Color.irukaBlue : Color.irukaBlue.opacity(0.35), in: Capsule())
                }
                .disabled(!canPost)
                .accessibilityLabel(L("投稿する"))
            }
        }
        .onAppear { isFocused = true }
        .onChange(of: pickerItem) { _, item in
            guard let item else { return }
            Task {
                guard let raw = try? await item.loadTransferable(type: Data.self) else { return }
                imageData = await Task.detached { PostStore.compressedJPEG(from: raw) }.value
            }
        }
    }

    private func submit() {
        guard canPost, let user = auth.user else { return }
        store.add(body: draft, image: imageData, user: user, quoteOf: quoting?.id, replyTo: replying?.id,
                  poll: pollOn ? PollDraft(options: filledOptions, durationMinutes: effectiveMinutes) : nil)
        dismiss()
    }

    private var pollEditor: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(pollOptions.indices, id: \.self) { index in
                HStack(spacing: 8) {
                    TextField("\(L("選択肢")) \(index + 1)", text: Binding(
                        get: { pollOptions[index] },
                        set: { pollOptions[index] = String($0.prefix(Poll.maxOptionCharacters)) }
                    ))
                    .padding(.horizontal, 12)
                    .frame(minHeight: 44)
                    .overlay { RoundedRectangle(cornerRadius: 10).stroke(Color.irukaHairline, lineWidth: 1) }
                    if pollOptions.count > 2 {
                        Button {
                            pollOptions.remove(at: index)
                        } label: {
                            Image(systemName: "xmark")
                                .appTextFont(size: 14, weight: .bold)
                                .foregroundStyle(Color.irukaSecondary)
                                .frame(width: 44, height: 44)
                        }
                        .accessibilityLabel(L("選択肢を削除"))
                    }
                }
            }
            if pollOptions.count < Poll.maxOptions {
                Button {
                    pollOptions.append("")
                } label: {
                    Label(L("選択肢を追加"), systemImage: "plus")
                        .appTextFont(size: 15, weight: .bold)
                        .foregroundStyle(Color.irukaBlue)
                        .frame(minHeight: 44)
                }
            }
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 4) {
                    Text(L("期間")).appTextFont(size: 14).foregroundStyle(Color.irukaSecondary)
                    ForEach(durations, id: \.minutes) { item in
                        let selected = !customDuration && pollMinutes == item.minutes
                        Button {
                            customDuration = false
                            pollMinutes = item.minutes
                        } label: {
                            Text(L(item.label))
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(selected ? .white : Color.irukaInk)
                                .frame(maxWidth: .infinity, minHeight: 36)
                                .background(selected ? Color.irukaBlue : Color.irukaField, in: Capsule())
                        }
                        .buttonStyle(.plain)
                        .accessibilityAddTraits(selected ? .isSelected : [])
                    }
                    Button {
                        if !customDuration {
                            customDays = String(pollMinutes / 1440)
                            customHours = String((pollMinutes % 1440) / 60)
                            customMinutes = String(pollMinutes % 60)
                        }
                        customDuration = true
                    } label: {
                        Text(L("カスタム"))
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(customDuration ? .white : Color.irukaInk)
                            .frame(maxWidth: .infinity, minHeight: 36)
                            .background(customDuration ? Color.irukaBlue : Color.irukaField, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(customDuration ? .isSelected : [])
                }
                if customDuration {
                    HStack(spacing: 8) {
                        durationField(text: $customDays, unit: L("日").trimmingCharacters(in: .whitespaces))
                        durationField(text: $customHours, unit: L("時間").trimmingCharacters(in: .whitespaces))
                        durationField(text: $customMinutes, unit: L("分").trimmingCharacters(in: .whitespaces))
                    }
                    if !durationValid {
                        Text(L("5分〜7日（10080分）の間で設定してください。"))
                            .font(.system(size: 12))
                            .foregroundStyle(Color.red)
                    }
                }
            }
        }
        .padding(12)
        .overlay { RoundedRectangle(cornerRadius: 16).stroke(Color.irukaHairline, lineWidth: 1) }
        .padding(.leading, 52)
    }

    private func durationField(text: Binding<String>, unit: String) -> some View {
        HStack(spacing: 4) {
            TextField("0", text: Binding(
                get: { text.wrappedValue },
                set: { text.wrappedValue = String($0.filter(\.isNumber).prefix(2)) }
            ))
            .keyboardType(.numberPad)
            .multilineTextAlignment(.center)
            .appTextFont(size: 15)
            .frame(maxWidth: .infinity, minHeight: 44)
            .overlay { RoundedRectangle(cornerRadius: 10).stroke(Color.irukaHairline, lineWidth: 1) }
            .accessibilityLabel(unit)
            Text(unit).font(.system(size: 13)).foregroundStyle(Color.irukaSecondary)
        }
    }
}
