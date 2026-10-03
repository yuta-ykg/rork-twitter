import Foundation
import Testing
@testable import Yytblue

@MainActor
struct CommunityTests {
    @Test func validatesUnicodeNameAndDescriptionLimits() {
        #expect(CommunityStore.valid(name: String(repeating: "😀", count: 40), description: String(repeating: "あ", count: 160)))
        #expect(!CommunityStore.valid(name: "   ", description: ""))
        #expect(!CommunityStore.valid(name: String(repeating: "😀", count: 41), description: ""))
        #expect(!CommunityStore.valid(name: "Valid", description: String(repeating: "あ", count: 161)))
    }
    @Test func decodesPublicSnapshotAndMembership() throws {
        let data = Data(#"{"community":{"id":"00000000-0000-4000-8000-000000000001","owner_id":"alice","name":"Readers","description":"Books","member_count":1,"is_member":true},"membership":"joined","members":[{"id":"alice","name":"Alice","handle":"alice","status":"joined","is_owner":true}],"posts":[],"has_more":false}"#.utf8)
        let snapshot = try JSONDecoder().decode(CommunitySnapshot.self, from: data)
        #expect(snapshot.community.memberCount == 1)
        #expect(snapshot.membership == "joined")
        #expect(snapshot.members.first?.isOwner == true)
        #expect(!snapshot.hasMore)
    }
}
