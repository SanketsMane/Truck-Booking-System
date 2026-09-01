# Data layer

The database is the single source of truth for anything the user can see offline. The network writes to it; the UI observes it.

## 1. The offline-first shape

```
Network ──write──▶ Room ──observe──▶ Repository ──Flow──▶ ViewModel ──▶ UI
```

```kotlin
fun observeTransactions(): Flow<List<Transaction>> = dao.observeAll().map { it.toDomain() }

suspend fun refresh(): Result<Unit> = safeCall {
    val remote = api.transactions()
    dao.upsertAll(remote.map { it.toEntity() })   // UI updates automatically via the Flow
}
```

Why this and not "fetch then show":
- The screen renders instantly from cache, then updates.
- Offline works with no extra code path.
- One source of truth means two screens can never disagree.
- A failed refresh leaves the last good data on screen, not a blank error.

**Never** have the UI read from the network and the DB separately and try to reconcile them.

## 2. Room

```kotlin
@Entity(
    tableName = "transactions",
    indices = [Index("accountId"), Index(value = ["createdAt"], orders = [DESC])],
)
data class TxnEntity(
    @PrimaryKey val id: String,
    val accountId: String,
    val amountMinor: Long,        // integer minor units — never Double
    val currency: String,
    val status: String,
    val createdAt: Long,
)

@Dao interface TxnDao {
    @Query("SELECT * FROM transactions WHERE accountId = :id ORDER BY createdAt DESC")
    fun observeFor(id: String): Flow<List<TxnEntity>>

    @Upsert suspend fun upsertAll(items: List<TxnEntity>)

    @Transaction
    suspend fun replaceFor(accountId: String, items: List<TxnEntity>) {
        deleteFor(accountId); upsertAll(items)
    }
}
```

- **Index every column you filter, sort or join on.** An unindexed `ORDER BY` on 5,000 rows is visible jank.
- `Flow` return types for reads — Room re-emits on change automatically. `suspend` for writes.
- `@Transaction` for multi-statement operations, and for `@Relation` queries.
- Store money as `Long` minor units plus a currency code. Never `Double`, never a formatted string.
- Store timestamps as epoch millis (`Long`) or ISO-8601; use `@TypeConverter` for `Instant`.
- `@Upsert` beats `@Insert(onConflict = REPLACE)` — `REPLACE` deletes and re-inserts, which fires foreign-key cascades and destroys rows you meant to keep.

## 3. Migrations

**`fallbackToDestructiveMigration()` in a release build is data loss.** It is acceptable only for a pre-launch app.

```kotlin
val MIGRATION_3_4 = object : Migration(3, 4) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE transactions ADD COLUMN note TEXT")
    }
}
```

- Export schemas (`room.schemaLocation`) and **commit them** — they are the input to migration tests.
- Test every migration with `MigrationTestHelper`, including the full chain 1→N. -> `testing.md`
- SQLite cannot drop or alter a column: create the new table, copy, drop, rename.
- `AutoMigration` handles simple additive changes; write a `spec` for renames and deletions.
- Never edit a shipped migration — add a new one.

## 4. DataStore, not SharedPreferences

`SharedPreferences` is synchronous, does main-thread disk I/O, and has no error signalling.

| Need | Use |
| --- | --- |
| Key-value settings | Preferences DataStore |
| Typed settings object | Proto DataStore |
| Tokens, PINs, keys | **EncryptedSharedPreferences / Keystore** — not DataStore -> `security.md` |
| Structured or queryable data | Room |

```kotlin
val themeFlow: Flow<Theme> = dataStore.data
    .catch { e -> if (e is IOException) emit(emptyPreferences()) else throw e }
    .map { Theme.from(it[THEME_KEY]) }
```

That `catch` is required — DataStore surfaces read failures as `IOException` and an uncaught one crashes collection.

## 5. Caching and staleness

Decide per data type, and write it down:

| Data | Policy |
| --- | --- |
| Balance | Always refresh on screen open; show cached immediately with a "last updated" marker |
| Transaction list | Cache + refresh on open and on pull-to-refresh; paginate |
| Transaction detail | Cache indefinitely — a settled transaction is immutable |
| Profile / config | Refresh daily or on app start |
| Offers / rewards | TTL, honour server cache headers |

Track staleness explicitly (`lastSyncedAt` per table or per record) so the UI can say "as of 4:32 pm" rather than pretending fresh. -> `../../mobile-product-engineer/references/fintech-ux.md`

## 6. Pagination

`androidx.paging` when the list is genuinely large:

```kotlin
@OptIn(ExperimentalPagingApi::class)
fun pagedTransactions(): Flow<PagingData<Transaction>> = Pager(
    config = PagingConfig(pageSize = 20, enablePlaceholders = false),
    remoteMediator = TxnRemoteMediator(api, db),   // network → DB
    pagingSourceFactory = { dao.pagingSource() },  // DB → UI
).flow.map { it.map(TxnEntity::toDomain) }
```

`RemoteMediator` keeps the DB as the source of truth while paging from the network. Without it you end up with two competing lists.

For a bounded list (under a few hundred items) plain Room + Flow is simpler and better.

## 7. Sync and conflicts

- **Read-mostly data**: last-write-wins from the server is fine.
- **User-generated data**: queue local mutations, mark rows `pendingSync`, reconcile on success. WorkManager owns the retry. -> `background-work.md`
- **Money**: never resolve a conflict client-side. The server is authoritative; the client reflects it.
- Keep an outbox table for pending writes with an idempotency key per entry, so a retry cannot duplicate. -> `networking.md`
- Delete-while-offline: soft-delete locally, hard-delete on server confirmation.

## 8. Large data and files

- Files go to `filesDir`/`cacheDir` or scoped storage — **paths** in the DB, never blobs. -> `permissions-and-privacy.md`
- `cacheDir` can be cleared by the OS at any time; handle a missing file.
- Encrypt anything sensitive at rest. -> `security.md`
- Room has a ~2 MB cursor window limit; large blobs will crash reads.

## 9. Anti-patterns

- UI reading from network and DB separately
- `fallbackToDestructiveMigration` in release
- Untested migrations, or un-committed exported schemas
- `Double` for money
- Missing indices on filtered/sorted columns
- `@Insert(onConflict = REPLACE)` where `@Upsert` is meant
- `SharedPreferences` for new code; tokens in DataStore
- DataStore reads without an `IOException` catch
- Room entities used directly as UI models
- Paging without a `RemoteMediator` when caching is required
- Blobs in the database

## 10. Checklist

- [ ] DB is the single source of truth; UI observes a Flow
- [ ] DTO / Entity / domain models separated and mapped
- [ ] Money stored as integer minor units + currency
- [ ] Indices on every filtered/sorted/joined column
- [ ] Migrations written, schemas exported and committed, chain tested
- [ ] No destructive fallback in release
- [ ] DataStore (not SharedPreferences) for settings; secure storage for secrets
- [ ] Cache/staleness policy decided per data type and surfaced in the UI
- [ ] Pending writes queued with idempotency keys
- [ ] Offline path exercised on a real device
