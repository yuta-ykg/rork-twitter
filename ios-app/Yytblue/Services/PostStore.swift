import Foundation
import Observation
import PostgREST
import Supabase

@MainActor
@Observable
final class PostStore {
    private(set) var posts: [Post] = []
    private var pendingLikes: Set<UUID> = []
    var likeError: String?
    var composeError: String?
    private var currentUserId: String?

    var timeline: [Post] {
        posts.sorted { $0.createdAt > $1.createdAt }
    }

    var mine: [Post] {
        timeline.filter(\.isMine)
    }

    var thisWeekCount: Int {
        let calendar = Calendar.current
        guard let start = calendar.dateInterval(of: .weekOfYear, for: Date())?.start else {
            return mine.count
        }
        return mine.filter { $0.createdAt >= start }.count
    }

    func add(body: String, poll: PollDraft? = nil, diagnosis: DiagnosisDraft? = nil, user: AuthManager.User) {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.count <= PostLimits.maxCharacters,
              poll?.isValid ?? true, diagnosis?.isValid ?? true,
              poll == nil || diagnosis == nil else { return }
        Task { await insert(trimmed, poll: poll, diagnosis: diagnosis, user: user) }
    }

    func createGameResultPost(_ body: String, user: AuthManager.User) async throws {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.unicodeScalars.count <= PostLimits.maxCharacters else {
            throw NSError(domain: "Game", code: 1)
        }
        if DevelopmentData.isActive {
            guard user.id == DevelopmentData.userId else { throw NSError(domain: "Game", code: 2) }
            let profile = DevelopmentData.profile()
            let post = Post(id: UUID(), authorName: profile.name, handle: "@" + (profile.handle ?? "developer"),
                initial: String(profile.name.prefix(1)), body: trimmed, createdAt: Date(), isMine: true,
                avatarIndex: 0, userId: DevelopmentData.userId, avatarUrl: profile.avatarUrl)
            posts.insert(post, at: 0)
            DevelopmentData.save(posts: posts)
            return
        }
        await syncProfile(user)
        guard currentUserId == user.id else { throw CancellationError() }
        let postId = UUID()
        let rows: [PostRow] = try await IrukaDatabase.client
            .rpc("create_post", params: CreatePostParams(
                post_id: postId, post_body: trimmed, expected_user_id: user.id
            )).execute().value
        guard let row = rows.first else { throw NSError(domain: "Game", code: 3) }
        guard currentUserId == user.id else { return }
        let post = Post(id: row.id, authorName: row.authorName, handle: row.handle, initial: row.initial,
            body: row.body, createdAt: row.createdAt, isMine: true, avatarIndex: row.avatarIndex,
            userId: row.userId, parentId: row.parentId, avatarUrl: user.picture)
        posts.removeAll { $0.id == post.id }
        posts.insert(post, at: 0)
    }

    func searchDiagnoses(_ query: String, userId: String?, limit: Int = 24) async throws -> [PostDiagnosisRow] {
        let term = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard term.count <= 100 else { throw NSError(domain: "Diagnosis", code: 4) }
        if DevelopmentData.isActive {
            var seen = Set<UUID>()
            let matches = DevelopmentData.timeline().sorted { $0.createdAt > $1.createdAt }.compactMap { post -> PostDiagnosisRow? in
                guard let diagnosis = post.diagnosis, seen.insert(diagnosis.id).inserted else { return nil }
                let searchable = ([diagnosis.title, diagnosis.diagnosisDescription]
                    + diagnosis.outcomes.flatMap { [$0.title, $0.description] }
                    + diagnosis.questions.flatMap { [$0.prompt] + $0.options.map(\.text) }).joined(separator: " ")
                guard term.isEmpty || searchable.localizedCaseInsensitiveContains(term) else { return nil }
                let playable = PostDiagnosis(id: diagnosis.id, creatorId: diagnosis.creatorId, title: diagnosis.title,
                    diagnosisDescription: diagnosis.diagnosisDescription, outcomes: diagnosis.outcomes,
                    questions: diagnosis.questions, resultIndex: nil, result: nil)
                return PostDiagnosisRow(postId: post.id, diagnosis: playable)
            }
            return Array(matches.prefix(min(max(limit, 1), 50)))
        }
        let rows: [PostDiagnosisRow] = try await IrukaDatabase.client
            .rpc("search_user_diagnoses", params: SearchUserDiagnosesParams(
                search_query: term.isEmpty ? nil : term,
                expected_user_id: userId,
                result_limit: min(max(limit, 1), 50)
            )).execute().value
        return rows.map { row in
            let diagnosis = row.diagnosis
            return PostDiagnosisRow(postId: row.postId, diagnosis: PostDiagnosis(
                id: diagnosis.id, creatorId: diagnosis.creatorId, title: diagnosis.title,
                diagnosisDescription: diagnosis.diagnosisDescription, outcomes: diagnosis.outcomes,
                questions: diagnosis.questions, resultIndex: nil, result: nil
            ))
        }
    }

    func shareDiagnosisResult(_ diagnosis: PostDiagnosis, resultIndex: Int, user: AuthManager.User) async throws -> Post {
        guard diagnosis.outcomes.indices.contains(resultIndex) else { throw NSError(domain: "Diagnosis", code: 1) }
        let outcome = diagnosis.outcomes[resultIndex]
        let shareText = String("診断結果：\(outcome.title)（\(diagnosis.title)）".prefix(PostLimits.maxCharacters))
        let postId = UUID()
        if DevelopmentData.isActive {
            let profile = DevelopmentData.profile()
            let post = Post(id: postId, authorName: profile.name, handle: "@" + (profile.handle ?? "developer"),
                initial: String(profile.name.prefix(1)), body: shareText, createdAt: Date(), isMine: true,
                avatarIndex: 0, userId: DevelopmentData.userId, avatarUrl: profile.avatarUrl,
                diagnosis: diagnosis.withResult(resultIndex))
            posts.insert(post, at: 0)
            DevelopmentData.save(posts: posts)
            return post
        }
        guard currentUserId == user.id else { throw NSError(domain: "Diagnosis", code: 2) }
        let rows: [PostRow] = try await IrukaDatabase.client
            .rpc("create_diagnosis_result_post", params: CreateDiagnosisResultPostParams(
                post_id: postId, post_body: shareText, diagnosis_id: diagnosis.id,
                result_index: resultIndex, expected_user_id: user.id
            )).execute().value
        guard let row = rows.first else { throw NSError(domain: "Diagnosis", code: 3) }
        await refresh(userId: user.id)
        if let post = posts.first(where: { $0.id == postId }) { return post }
        let post = Post(id: row.id, authorName: user.displayName, handle: user.handle, initial: user.initial,
            body: row.body, createdAt: row.createdAt, isMine: true, avatarIndex: row.avatarIndex,
            userId: row.userId, parentId: row.parentId, avatarUrl: user.picture,
            diagnosis: diagnosis.withResult(resultIndex))
        posts.insert(post, at: 0)
        return post
    }

    func submitPoll(postId: UUID, optionIds: [UUID], userId: String?) async throws -> PostPoll {
        guard let userId, !userId.isEmpty else { throw NSError(domain: "Poll", code: 1) }
        guard let index = posts.firstIndex(where: { $0.id == postId }), let poll = posts[index].poll,
              !poll.hasResponded else { throw NSError(domain: "Poll", code: 2) }
        let choices = Set(optionIds)
        guard !choices.isEmpty, (poll.allowsMultiple || choices.count == 1),
              choices.count == optionIds.count,
              choices.allSatisfy({ id in poll.options.contains(where: { $0.id == id }) }) else {
            throw NSError(domain: "Poll", code: 3)
        }
        if DevelopmentData.isActive {
            let updated = PostPoll(kind: poll.kind, allowsMultiple: poll.allowsMultiple,
                explanation: poll.explanation, responseCount: poll.responseCount + 1, hasResponded: true,
                options: poll.options.map { option in
                    PostPollOption(id: option.id, text: option.text, position: option.position,
                        result: option.result, feedback: option.feedback,
                        voteCount: (option.voteCount ?? 0) + (choices.contains(option.id) ? 1 : 0),
                        selected: choices.contains(option.id))
                })
            posts[index].poll = updated
            DevelopmentData.save(posts: posts)
            return updated
        }
        let rows: [PostPollRow] = try await IrukaDatabase.client
            .rpc("submit_post_poll_response", params: SubmitPostPollResponseParams(
                target_post_id: postId, option_ids: optionIds, expected_user_id: userId
            )).execute().value
        guard currentUserId == userId, let row = rows.first,
              let currentIndex = posts.firstIndex(where: { $0.id == postId }) else { throw CancellationError() }
        posts[currentIndex].poll = row.poll
        return row.poll
    }

    func toggleLike(id: UUID) {
        if DevelopmentData.isActive {
            guard let index = posts.firstIndex(where: { $0.id == id }) else { return }
            let liked = !posts[index].isLiked
            posts[index].likedByMe = liked
            posts[index].storedLikeCount = liked ? 1 : 0
            DevelopmentData.save(posts: posts)
            return
        }
        guard let userId = currentUserId else {
            likeError = "いいねするにはAppleかGoogleでログインしてください。"
            return
        }
        guard !pendingLikes.contains(id),
              let post = posts.first(where: { $0.id == id }) else { return }
        pendingLikes.insert(id)
        Task {
            defer { pendingLikes.remove(id) }
            do {
                let stats: [PostLikeStats] = try await IrukaDatabase.client
                    .rpc("set_post_like", params: SetLikeParams(
                        target_post_id: id, liked: !post.isLiked, expected_user_id: userId
                    ))
                    .execute().value
                guard currentUserId == userId,
                      let stat = stats.first,
                      let index = posts.firstIndex(where: { $0.id == id }) else { return }
                posts[index].likedByMe = stat.isLiked
                posts[index].storedLikeCount = stat.likeCount
                likeError = nil
            } catch {
                if currentUserId == userId {
                    likeError = "いいねを保存できませんでした。もう一度試してください。"
                }
            }
        }
    }

    func refresh(userId: String?) async {
        currentUserId = userId
        likeError = nil
        if DevelopmentData.isActive { posts = DevelopmentData.timeline().filter { RelationshipStore.shared.canView($0.userId) }; return }
        do {
            let rows: [PostRow] = try await IrukaDatabase.client
                .rpc("get_visible_posts", params: VisiblePostsParams(expected_user_id: userId))
                .execute()
                .value
            var stats: [PostLikeStats] = []
            var pollRows: [PostPollRow] = []
            var diagnosisRows: [PostDiagnosisRow] = []
            if !rows.isEmpty {
                // 装飾データ（いいね・投票・診断）は任意。対応RPCのマイグレーションが
                // 未適用でもタイムライン自体は表示されるよう、失敗時は空にフォールバックする。
                stats = (try? await IrukaDatabase.client
                    .rpc("get_post_likes", params: LikeStatsParams(post_ids: rows.map(\.id)))
                    .execute().value) ?? []
                pollRows = (try? await IrukaDatabase.client
                    .rpc("get_post_polls", params: GetPostPollsParams(
                        requested_post_ids: rows.map(\.id), expected_user_id: userId
                    )).execute().value) ?? []
                diagnosisRows = (try? await IrukaDatabase.client
                    .rpc("get_post_diagnoses", params: GetPostDiagnosesParams(
                        requested_post_ids: rows.map(\.id), expected_user_id: userId
                    )).execute().value) ?? []
            }
            let profiles = (try? await ProfileService.fetch(ids: rows.compactMap(\.userId))) ?? []
            guard currentUserId == userId else { return }
            let profileById = Dictionary(uniqueKeysWithValues: profiles.map { ($0.id, $0) })
            let likes = Dictionary(uniqueKeysWithValues: stats.map { ($0.postId, $0) })
            let polls = Dictionary(uniqueKeysWithValues: pollRows.map { ($0.postId, $0.poll) })
            let diagnoses = Dictionary(uniqueKeysWithValues: diagnosisRows.map { ($0.postId, $0.diagnosis) })
            posts = rows.map { row in
                let profile = row.userId.flatMap { profileById[$0] }
                var post = Post(
                    id: row.id,
                    authorName: profile?.name ?? row.authorName,
                    handle: profile?.handle.map { "@" + $0 } ?? row.handle,
                    initial: profile.map { String($0.name.prefix(1)) } ?? row.initial,
                    body: row.body,
                    createdAt: row.createdAt,
                    isMine: userId != nil && row.userId == userId,
                    avatarIndex: row.avatarIndex,
                    userId: row.userId,
                    parentId: row.parentId,
                    avatarUrl: profile?.avatarUrl
                )
                if let like = likes[row.id] {
                    post.likedByMe = userId != nil && like.isLiked
                    post.storedLikeCount = like.likeCount
                }
                post.poll = polls[row.id]
                post.diagnosis = diagnoses[row.id]
                return post
            }
        } catch {
            guard currentUserId == userId else { return }
            likeError = "投稿またはいいねを読み込めませんでした。"
        }
    }

    func syncProfile(_ user: AuthManager.User) async {
        try? await ProfileService.ensure(user)
    }

    private func insert(_ body: String, poll: PollDraft?, diagnosis: DiagnosisDraft?, user: AuthManager.User) async {
        if user.id == DevelopmentData.userId && !DevelopmentData.isActive { return }
        if DevelopmentData.isActive {
            let profile = DevelopmentData.profile()
            let post = Post(id: UUID(), authorName: profile.name, handle: "@" + (profile.handle ?? "developer"),
                            initial: String(profile.name.prefix(1)), body: body, createdAt: Date(),
                            isMine: true, avatarIndex: 0, userId: DevelopmentData.userId, avatarUrl: profile.avatarUrl,
                            poll: poll?.makePoll(), diagnosis: diagnosis?.makeDiagnosis(creatorId: DevelopmentData.userId))
            posts.insert(post, at: 0)
            DevelopmentData.save(posts: posts)
            return
        }
        await syncProfile(user)
        do {
            if let diagnosis {
                let _: [PostRow] = try await IrukaDatabase.client
                    .rpc("create_post_with_diagnosis", params: CreatePostWithDiagnosisParams(
                        post_id: UUID(), post_body: body, diagnosis_id: UUID(),
                        diagnosis_title: diagnosis.title.trimmingCharacters(in: .whitespacesAndNewlines),
                        diagnosis_description: diagnosis.description.trimmingCharacters(in: .whitespacesAndNewlines),
                        diagnosis_outcomes: diagnosis.encodedOutcomes,
                        diagnosis_questions: diagnosis.encodedQuestions,
                        expected_user_id: user.id
                    )).execute().value
            } else if let poll {
                let _: [PostRow] = try await IrukaDatabase.client
                    .rpc("create_post_with_poll", params: CreatePostWithPollParams(
                        post_id: UUID(), post_body: body, poll_kind: poll.kind.rawValue,
                        poll_allows_multiple: poll.permitsMultipleAnswers,
                        poll_explanation: poll.kind == .quiz ? poll.explanation.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty : nil,
                        poll_options: poll.options.map { option in
                            PollOptionInsert(text: option.text.trimmingCharacters(in: .whitespacesAndNewlines),
                                result: option.result,
                                feedback: poll.kind == .quiz ? option.feedback.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty : nil)
                        }, expected_user_id: user.id
                    )).execute().value
            } else {
                let _: [PostRow] = try await IrukaDatabase.client
                    .rpc("create_post", params: CreatePostParams(
                        post_id: UUID(), post_body: body, expected_user_id: user.id
                    )).execute().value
            }
            await refresh(userId: user.id)
        } catch {
            guard currentUserId == user.id else { return }
            composeError = "投稿できませんでした。もう一度試してください。"
        }
    }

    func createReply(body: String, parentId: UUID, replyId: UUID, user: AuthManager.User) async throws {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.unicodeScalars.count <= PostLimits.maxCharacters else {
            throw NSError(domain: "Reply", code: 1)
        }
        if DevelopmentData.isActive {
            guard user.id == DevelopmentData.userId, posts.contains(where: { $0.id == parentId }) else {
                throw NSError(domain: "Reply", code: 2)
            }
            if posts.contains(where: { $0.id == replyId }) { return }
            let profile = DevelopmentData.profile()
            let post = Post(id: replyId, authorName: profile.name, handle: "@" + (profile.handle ?? "developer"),
                initial: String(profile.name.prefix(1)), body: trimmed, createdAt: Date(), isMine: true,
                avatarIndex: 0, userId: user.id, parentId: parentId)
            posts.insert(post, at: 0); DevelopmentData.save(posts: posts); return
        }
        await syncProfile(user)
        let rows: [PostRow] = try await IrukaDatabase.client.rpc("create_reply", params: CreateReplyParams(
            reply_id: replyId, target_post_id: parentId, reply_body: trimmed, expected_user_id: user.id
        )).execute().value
        guard currentUserId == user.id, let row = rows.first else { throw CancellationError() }
        let post = Post(id: row.id, authorName: row.authorName, handle: row.handle, initial: row.initial,
            body: row.body, createdAt: row.createdAt, isMine: true, avatarIndex: row.avatarIndex,
            userId: row.userId, parentId: row.parentId)
        posts.removeAll { $0.id == post.id }; posts.insert(post, at: 0)
    }

}
