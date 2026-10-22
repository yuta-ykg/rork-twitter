import SwiftUI

/// テーマと言語の設定画面。
struct SettingsView: View {
    @AppStorage("iruka-language") private var language = AppLanguage.ja.rawValue
    @AppStorage("iruka-theme") private var theme = "system"
    @AppStorage("iruka-text-size") private var textSize = AppTextSize.standard.rawValue
    @AppStorage("iruka-speech-speed") private var speechSpeed = PostSpeechSpeed.standard.rawValue
    @Environment(PostStore.self) private var store
    @Environment(AuthManager.self) private var auth
    @State private var relations: [RelationshipRow] = []
    @State private var confirmsSignOut = false
    @State private var confirmsDelete = false
    @State private var isDeleting = false
    @State private var deleteFailed = false
    @State private var showsAddAccount = false
    @State private var switchFailed = false
    @State private var switchingId: String?
    @State private var showsCreateSub = false
    @State private var subName = ""
    @State private var subHandle = ""
    @State private var isCreatingSub = false
    @State private var subError: String?
    @State private var subToDelete: SubAccount?
    @State private var handleTaken = false
    @State private var isCheckingHandle = false
    @State private var handleVerified = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                section(L("テーマ")) {
                    Picker(L("テーマ"), selection: $theme) {
                        Text(L("ライト")).tag("light")
                        Text(L("ダーク")).tag("dark")
                        Text(L("システム")).tag("system")
                    }
                    .pickerStyle(.segmented)
                    Text(L("システムを選ぶと端末の外観設定に合わせて切り替わります。"))
                        .appTextFont(size: 13)
                        .foregroundStyle(Color.irukaSecondary)
                }
                section(L("文字サイズ")) {
                    Picker(L("文字サイズ"), selection: $textSize) {
                        ForEach(AppTextSize.allCases) { size in
                            Text(L(size.label)).tag(size.rawValue)
                        }
                    }
                    .pickerStyle(.segmented)
                    .frame(minHeight: 44)
                    Text(L("この大きさで投稿やメニューを表示します。"))
                        .appTextFont(size: 15)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.irukaField, in: RoundedRectangle(cornerRadius: 12))
                    Text(L("文字サイズはこの端末に保存されます。"))
                        .appTextFont(size: 13)
                        .foregroundStyle(Color.irukaSecondary)
                }
                section(L("読み上げ速度")) {
                    Picker(L("読み上げ速度"), selection: $speechSpeed) {
                        ForEach(PostSpeechSpeed.allCases) { speed in
                            Text(L(speed.label)).tag(speed.rawValue)
                        }
                    }
                    .pickerStyle(.segmented)
                    .frame(minHeight: 44)
                    Text(L("読み上げ速度はこの端末に保存され、次の読み上げから適用されます。"))
                        .appTextFont(size: 13)
                        .foregroundStyle(Color.irukaSecondary)
                }
                section(L("言語")) {
                    Picker(L("言語"), selection: $language) {
                        Text("日本語").tag(AppLanguage.ja.rawValue)
                        Text("English").tag(AppLanguage.en.rawValue)
                    }
                    .pickerStyle(.segmented)
                }
                if let userId = auth.user?.id {
                    section(L("現在のプラン")) {
                        AccountPlanStatusView(userId: userId).id(userId)
                    }
                }
                section(L("サブアカウント")) { subAccountsSection }
                section(L("アカウントの切り替え")) { accountSwitcher }
                do {
                    section(L("ミュート・ブロック中のアカウント")) {
                        if relations.isEmpty {
                            Text(L("まだありません"))
                                .appTextFont(size: 14)
                                .foregroundStyle(Color.irukaSecondary)
                        } else {
                            VStack(spacing: 0) {
                                ForEach(relations) { r in
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(r.targetName).appTextFont(size: 15, weight: .bold).foregroundStyle(Color.irukaInk).lineLimit(1)
                                            Text((r.targetHandle.map { "@\($0) · " } ?? "") + L(r.kind == "block" ? "ブロック" : "ミュート"))
                                                .appTextFont(size: 13).foregroundStyle(Color.irukaSecondary).lineLimit(1)
                                        }
                                        Spacer()
                                        Button(L("解除")) {
                                            Task {
                                                await store.setRelationship(targetId: r.targetId, kind: r.kind, active: false)
                                                relations = await store.relationships()
                                            }
                                        }
                                        .appTextFont(size: 14, weight: .bold)
                                        .buttonStyle(.bordered)
                                        .frame(minHeight: 44)
                                    }
                                    .padding(.vertical, 4)
                                    Rectangle().fill(Color.irukaHairline).frame(height: 1)
                                }
                            }
                        }
                    }
                }
                section(L("規約")) {
                    Link(destination: URL(string: "https://yytblue.com/terms")!) {
                        HStack {
                            Text(L("利用規約"))
                            Spacer()
                            Image(systemName: "arrow.up.right")
                        }
                        .appTextFont(size: 16, weight: .semibold)
                        .frame(minHeight: 44)
                    }
                    .foregroundStyle(Color.irukaInk)
                    Link(destination: URL(string: "https://yytblue.com/privacy")!) {
                        HStack {
                            Text(L("プライバシーポリシー"))
                            Spacer()
                            Image(systemName: "arrow.up.right")
                        }
                        .appTextFont(size: 16, weight: .semibold)
                        .frame(minHeight: 44)
                    }
                    .foregroundStyle(Color.irukaInk)
                }
                section(L("アカウント")) {
                    Button(L("ログアウト")) { confirmsSignOut = true }
                        .appTextFont(size: 16, weight: .semibold)
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .buttonStyle(.bordered)
                    if auth.isMainPersona {
                    Button(role: .destructive) { confirmsDelete = true } label: {
                        Text(isDeleting ? L("削除中…") : L("アカウントを削除"))
                            .appTextFont(size: 16, weight: .semibold)
                            .frame(maxWidth: .infinity, minHeight: 48)
                    }
                    .buttonStyle(.bordered)
                    .disabled(isDeleting)
                    }
                }
            }
            .padding(16)
        }
        .alert(L("ログアウトしますか？"), isPresented: $confirmsSignOut) {
            Button(L("キャンセル"), role: .cancel) {}
            Button(L("ログアウト")) { Task { await auth.signOut() } }
        } message: { Text(L("この端末からサインアウトします。もう一度ログインできます。")) }
        .alert(L("アカウントを削除しますか？"), isPresented: $confirmsDelete) {
            Button(L("キャンセル"), role: .cancel) {}
            Button(L("削除する"), role: .destructive) {
                Task {
                    isDeleting = true
                    do {
                        for sub in auth.subAccounts { try await SubAccountService.delete(id: sub.id) }
                    } catch {
                        isDeleting = false
                        deleteFailed = true
                        return
                    }
                    auth.switchPersona(nil)
                    let ok = await store.deleteAccount()
                    isDeleting = false
                    if ok { await auth.signOut() } else { deleteFailed = true }
                }
            }
        } message: { Text(L("投稿、プロフィール、いいね、ブックマーク、通知が削除されます。この操作は取り消せません。")) }
        .alert(L("アカウントを削除できませんでした。"), isPresented: $deleteFailed) {
            Button("OK") {}
        }
        .alert(L("アカウントを切り替えられませんでした。もう一度ログインしてください。"), isPresented: $switchFailed) {
            Button("OK") {}
        }
        .confirmationDialog(L("アカウントを追加"), isPresented: $showsAddAccount, titleVisibility: .visible) {
            Button(L("Googleで続ける")) { Task { await auth.signIn(provider: "google") } }
            Button(L("Appleで続ける")) { Task { await auth.signIn(provider: "apple") } }
            Button(L("キャンセル"), role: .cancel) {}
        } message: { Text(L("別のGoogle／Appleアカウントでログインすると、新しいアカウントとして追加されます。")) }
        .alert(L("サブアカウントを削除しますか？"), isPresented: Binding(get: { subToDelete != nil }, set: { if !$0 { subToDelete = nil } })) {
            Button(L("キャンセル"), role: .cancel) {}
            Button(L("削除する"), role: .destructive) {
                guard let sub = subToDelete else { return }
                Task {
                    do {
                        try await SubAccountService.delete(id: sub.id)
                        if auth.user?.id == sub.id { auth.switchPersona(nil) }
                        await auth.reloadSubAccounts()
                    } catch {
                        subError = L("サブアカウントを削除できませんでした。")
                    }
                }
            }
        } message: { Text(L("このサブアカウントの投稿、プロフィール、いいね、ブックマーク、通知が削除されます。この操作は取り消せません。")) }
        .alert(subError ?? "", isPresented: Binding(get: { subError != nil }, set: { if !$0 { subError = nil } })) {
            Button("OK") {}
        }
        .task {
            relations = await store.relationships()
            await auth.reloadSubAccounts()
        }
        .background(Color.irukaBackground)
        .navigationTitle(L("設定"))
        .navigationBarTitleDisplayMode(.inline)
    }

    private var subHandleValid: Bool {
        let h = subHandle.trimmingCharacters(in: .whitespaces).lowercased()
        return h.count >= 3 && h.count <= 25 && h.allSatisfy { ($0.isASCII && ($0.isLetter || $0.isNumber)) || $0 == "_" }
    }

    private func personaRow(id: String, title: String, subtitle: String, picture: String?, current: Bool, pick: @escaping () -> Void, delete: (() -> Void)? = nil) -> some View {
        HStack(spacing: 12) {
            Button(action: pick) {
                HStack(spacing: 12) {
                    AvatarView(initial: String(title.prefix(1)), index: 0, url: picture, size: 36)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title).appTextFont(size: 15, weight: .bold).foregroundStyle(Color.irukaInk).lineLimit(1)
                        Text(subtitle).appTextFont(size: 13).foregroundStyle(Color.irukaSecondary).lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    if current {
                        Image(systemName: "checkmark").foregroundStyle(Color.irukaBlue).accessibilityLabel(L("使用中"))
                    }
                }
                .frame(minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(current)
            if let delete {
                Button(L("削除"), action: delete)
                    .appTextFont(size: 13, weight: .bold)
                    .buttonStyle(.bordered)
                    .frame(minHeight: 44)
            }
        }
        .padding(.vertical, 4)
    }

    private var subAccountsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            if let owner = auth.owner {
                personaRow(id: owner.id, title: owner.displayName, subtitle: L("メインアカウント"), picture: owner.picture, current: auth.isMainPersona) {
                    auth.switchPersona(nil)
                }
                Rectangle().fill(Color.irukaHairline).frame(height: 1)
            }
            ForEach(auth.subAccounts) { sub in
                personaRow(id: sub.id, title: sub.name, subtitle: sub.handle.map { "@" + $0 } ?? "", picture: sub.avatarUrl, current: auth.user?.id == sub.id, pick: {
                    auth.switchPersona(sub)
                }, delete: { subToDelete = sub })
                Rectangle().fill(Color.irukaHairline).frame(height: 1)
            }
            if showsCreateSub {
                VStack(spacing: 8) {
                    TextField(L("名前"), text: $subName)
                        .textFieldStyle(.roundedBorder)
                        .frame(minHeight: 44)
                    TextField(L("ユーザーID（英数字と_、3〜25字）"), text: $subHandle)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .frame(minHeight: 44)
                        .onChange(of: subHandle) { _, _ in handleTaken = false; handleVerified = false }
                        .task(id: subHandle) {
                            guard subHandleValid else { isCheckingHandle = false; return }
                            isCheckingHandle = true
                            try? await Task.sleep(for: .milliseconds(350))
                            guard !Task.isCancelled else { return }
                            let value = subHandle.trimmingCharacters(in: .whitespaces).lowercased()
                            let ok = await SubAccountService.isHandleAvailable(value)
                            guard !Task.isCancelled else { return }
                            handleTaken = !ok
                            handleVerified = ok
                            isCheckingHandle = false
                        }
                    if handleTaken {
                        Text(L("このIDはすでに使われています。"))
                            .appTextFont(size: 13).foregroundStyle(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    if handleVerified && !handleTaken && !isCheckingHandle && subHandleValid {
                        Text(L("このIDは使えます。"))
                            .appTextFont(size: 13).foregroundStyle(.green)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    HStack(spacing: 8) {
                        Button(L("キャンセル")) { showsCreateSub = false }
                            .buttonStyle(.bordered)
                            .frame(maxWidth: .infinity, minHeight: 44)
                        Button(isCreatingSub ? L("作成中…") : L("作成")) { Task { await createSub() } }
                            .buttonStyle(.borderedProminent)
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .disabled(isCreatingSub || subName.trimmingCharacters(in: .whitespaces).isEmpty || !subHandleValid || handleTaken || isCheckingHandle)
                    }
                }
                .padding(.top, 10)
            } else if auth.subAccounts.count < SubAccountService.maxCount {
                Button { showsCreateSub = true } label: {
                    Label(L("サブアカウントを作成"), systemImage: "plus")
                        .appTextFont(size: 16, weight: .semibold)
                        .frame(maxWidth: .infinity, minHeight: 48)
                }
                .buttonStyle(.bordered)
                .padding(.top, 10)
            } else {
                Text(L("サブアカウントは最大5つまでです。"))
                    .appTextFont(size: 13).foregroundStyle(Color.irukaSecondary).padding(.top, 8)
            }
            Text(L("サブアカウントは投稿・フォロー・通知・いいねがすべて別になり、他のユーザーには別人として表示されます。"))
                .appTextFont(size: 13).foregroundStyle(Color.irukaSecondary).padding(.top, 8)
        }
    }

    private func createSub() async {
        isCreatingSub = true
        defer { isCreatingSub = false }
        do {
            let sub = try await SubAccountService.create(
                name: subName.trimmingCharacters(in: .whitespaces),
                handle: subHandle.trimmingCharacters(in: .whitespaces).lowercased())
            await auth.reloadSubAccounts()
            subName = ""
            subHandle = ""
            showsCreateSub = false
            auth.switchPersona(sub)
        } catch {
            let message = "\(error)"
            if message.contains("23505") || message.contains("Handle taken") {
                subError = L("このIDはすでに使われています。")
            } else if message.contains("P0001") || message.contains("limit") {
                subError = L("サブアカウントは最大5つまでです。")
            } else {
                subError = L("サブアカウントを作成できませんでした。")
            }
        }
    }

    private var accountSwitcher: some View {
        VStack(spacing: 0) {
            ForEach(auth.accounts, id: \.id) { account in
                let current = account.id == auth.owner?.id
                HStack(spacing: 12) {
                    Button {
                        guard !current, switchingId == nil else { return }
                        Task {
                            switchingId = account.id
                            let ok = await auth.switchAccount(to: account.id)
                            switchingId = nil
                            if !ok { switchFailed = true }
                        }
                    } label: {
                        HStack(spacing: 12) {
                            AvatarView(initial: account.initial, index: 0, url: account.picture, size: 36)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(account.displayName).appTextFont(size: 15, weight: .bold).foregroundStyle(Color.irukaInk).lineLimit(1)
                                Text(account.email).appTextFont(size: 13).foregroundStyle(Color.irukaSecondary).lineLimit(1)
                            }
                            Spacer(minLength: 0)
                            if current {
                                Image(systemName: "checkmark").foregroundStyle(Color.irukaBlue).accessibilityLabel(L("使用中"))
                            } else if switchingId == account.id {
                                ProgressView()
                            }
                        }
                        .frame(minHeight: 44)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    if !current {
                        Button(L("外す")) { auth.removeAccount(id: account.id) }
                            .appTextFont(size: 13, weight: .bold)
                            .buttonStyle(.bordered)
                            .frame(minHeight: 44)
                    }
                }
                .padding(.vertical, 4)
                Rectangle().fill(Color.irukaHairline).frame(height: 1)
            }
            Button { showsAddAccount = true } label: {
                Label(L("アカウントを追加"), systemImage: "plus")
                    .appTextFont(size: 16, weight: .semibold)
                    .frame(maxWidth: .infinity, minHeight: 48)
            }
            .buttonStyle(.bordered)
            .padding(.top, 10)
        }
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).appTextFont(size: 13, weight: .bold).foregroundStyle(Color.irukaSecondary)
            content()
        }
    }
}
