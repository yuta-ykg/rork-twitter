import Foundation
import Testing
@testable import Yytblue

@MainActor
struct UserListTests {
    @Test func decodesLegacyAndPublicListVisibility() throws {
        let id = "00000000-0000-4000-8000-000000000001"
        let legacy = Data("{\"id\":\"\(id)\",\"name\":\"Legacy\",\"description\":\"\",\"members\":[]}".utf8)
        #expect(try JSONDecoder().decode(UserList.self, from: legacy).isPublic == nil)
        let shared = Data("{\"id\":\"\(id)\",\"name\":\"Public\",\"description\":\"\",\"members\":[],\"is_public\":true,\"owner_id\":\"alice\"}".utf8)
        let decoded = try JSONDecoder().decode(UserList.self, from: shared)
        #expect(decoded.isPublic == true)
        #expect(decoded.ownerId == "alice")
    }
    @Test func guestListLifecycleAndIsolation() async throws {
        DevelopmentData.startGuest()
        defer { DevelopmentData.clearGuestData() }
        let userId = DevelopmentData.userId
        let store = UserListStore()
        store.configure(userId: userId)
        #expect(await store.perform("create", name: "  Friends  ", description: "People"))
        let list = try #require(store.lists.first)
        #expect(list.name == "Friends")
        #expect(!(await store.perform("publish", id: list.id)))
        #expect(store.lists.first?.isPublic != true)
        let member = ListMember(id: userId, name: "Guest", handle: "guest")
        #expect(await store.perform("add", id: list.id, member: member))
        #expect(await store.perform("add", id: list.id, member: member))
        #expect(store.lists.first?.members.count == 1)
        let reloaded = UserListStore()
        reloaded.configure(userId: userId)
        await reloaded.refresh()
        #expect(reloaded.lists.first?.id == list.id)
        #expect(await store.perform("update", id: list.id, name: "Close friends"))
        #expect(store.lists.first?.name == "Close friends")
        #expect(!(await store.perform("update", id: list.id, name: String(repeating: "😀", count: 41))))
        #expect(await store.perform("remove", id: list.id, member: member))
        #expect(store.lists.first?.members.isEmpty == true)
        #expect(await store.perform("delete", id: list.id))
        #expect(store.lists.isEmpty)
        store.configure(userId: "another-user")
        #expect(!(await store.perform("create", name: "Unauthorized")))
        #expect(store.lists.isEmpty)
    }
}
