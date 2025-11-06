# API Specification: Category Concept

**Purpose:** allow users to define and manage meaningful groupings of their transactions

---

## API Endpoints

### POST /api/Category/create

**Description:** Creates a new transaction category for a user.

**Requirements:**
- user owner_id exists; for the same owner_id, no existing category with same name

**Effects:**
- generates a new category_id; creates and stores a category under owner_id associated with name; returns it

**Request Body:**
```json
{
  "owner_id": "string",
  "name": "string"
}
```

**Success Response Body (Action):**
```json
{
  "category_id": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Category/rename

**Description:** Renames an existing transaction category.

**Requirements:**
- category exists and category.owner_id = owner_id; for the same owner_id, no existing category with same new_name

**Effects:**
- updates category.name to new_name; returns updated category_id

**Request Body:**
```json
{
  "owner_id": "string",
  "category_id": "string",
  "new_name": "string"
}
```

**Success Response Body (Action):**
```json
{
  "category_id": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Category/delete

**Description:** Deletes a transaction category if it's not in use.

**Requirements:**
- category exists and category.owner_id = owner_id; can_delete = true (derived from whether any labels reference this category)

**Effects:**
- removes the category and its associated metrics; returns true

**Request Body:**
```json
{
  "owner_id": "string",
  "category_id": "string",
  "can_delete": "boolean"
}
```

**Success Response Body (Action):**
```json
{
  "ok": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Category/addTransaction

**Description:** Records a transaction's details against a category for metric tracking.

**Requirements:**
- owner and category exist; amount ≥ 0; transaction with tx_id is not already recorded for this category

**Effects:**
- adds the transaction record to the metric for (owner, category); returns true

**Request Body:**
```json
{
  "owner_id": "string",
  "category_id": "string",
  "tx_id": "string",
  "amount": "Number",
  "tx_date": "Date"
}
```

**Success Response Body (Action):**
```json
{
  "ok": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Category/removeTransaction

**Description:** Removes a transaction's details from a category's metric tracking.

**Requirements:**
- owner and category exist; transaction with tx_id is recorded for this category

**Effects:**
- removes the transaction record from the metric for (owner, category); returns true

**Request Body:**
```json
{
  "owner_id": "string",
  "category_id": "string",
  "tx_id": "string"
}
```

**Success Response Body (Action):**
```json
{
  "ok": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Category/updateTransaction

**Description:** Moves a transaction from one category to another for a given owner.

**Requirements:**
- The transaction must exist in the `old_category_id`.
- The `new_category_id` must exist.

**Effects:**
- The transaction is removed from the `old_category_id`'s metrics.
- The transaction is added to the `new_category_id`'s metrics.
- Returns `{ok: true}` on success.

**Request Body:**
```json
{
  "owner_id": "string",
  "tx_id": "string",
  "old_category_id": "string",
  "new_category_id": "string"
}
```

**Success Response Body (Action):**
```json
{
  "ok": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---
### POST /api/Category/getCategoryNameById

**Description:** Retrieves the name of a single category by its ID.

**Requirements:**
- A category with the given `category_id` must exist for the specified `owner_id`.

**Effects:**
- Returns an array containing an object with the name of the specified category.

**Request Body:**
```json
{
  "owner_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Query):**
```json

{
  "name": "string"
}

```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Category/getCategoriesFromOwner

**Description:** Retrieves all category IDs belonging to a specific owner.

**Requirements:**
- The `owner_id` must correspond to an existing user.

**Effects:**
- Returns an array of objects, each containing a `category_id` owned by the user.

**Request Body:**
```json
{
  "owner_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "category_id": "ID"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Category/listTransactions

**Description:** Retrieves all transaction entries recorded for a specific user and category.

**Requirements:**
- The user and category must exist.

**Effects:**
- Returns an array of transaction metric entries associated with the user and category.

**Request Body:**
```json
{
  "owner_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "tx_id": "string",
    "amount": "Number",
    "tx_date": "Date"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Category/moveTransactionToTrash

**Description:** Moves a recorded transaction from one category into the built-in Trash bucket.

**Requirements:**
- owner and source category exist; transaction with tx_id is recorded for the source category

**Effects:**
- removes the transaction record from the source category, ensures the owner's Trash category exists, and records the transaction (same amount/date) under Trash; returns true

**Request Body:**
```json
{
  "owner_id": "string",
  "from_category_id": "string",
  "tx_id": "string"
}
```

**Success Response Body (Action):**
```json
{
  "ok": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Category/getMetricStats

**Description:** Computes and returns spending statistics for a category over a given period.

**Requirements:**
- The `owner_id` and `category_id` must exist.
- The `period` must contain valid start and end dates.

**Effects:**
- Returns an object containing the total amount, transaction count, average spending per day, and total days in the period.

**Request Body:**
```json
{
  "owner_id": "string",
  "category_id": "string",
  "period": {
    "startDate": "string",
    "endDate": "string"
  }
}
```

**Success Response Body (Action):**
```json
[{
  "total_amount": "Number",
  "transaction_count": "Number",
  "average_per_day": "Number",
  "days": "Number"
}]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Category/getCategoryNamesAndOwners

**Description:** Retrieves the names, IDs, and owners of all categories for a given user.

**Requirements:**
- The `owner_id` must correspond to an existing user.

**Effects:**
- Returns an array of objects, each containing a category's ID, name, and owner ID.

**Request Body:**
```json
{
  "owner_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "category_id": "ID",
    "name": "string",
    "owner_id": "ID"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
# API Specification: Label Concept

**Purpose:** record the user's assignment of a specific transaction to a specific category so that spending meaning is explicit and auditable

---

## API Endpoints

### POST /api/Label/stage

**Description:** Creates a temporary, uncommitted label for a transaction.

**Requirements:**
- no committed label exists for `tx_id`; no stagedLabel with ID tx_id.

**Effects:**
- creates a StagedLabel for this user and transaction with the provided info and category. Adds it to the stagedLabels (that are not yet commited). Returns the created stagedLabel.

**Request Body:**
```json
{
  "user_id": "string",
  "tx_id": "string",
  "tx_name": "string",
  "tx_merchant": "string",
  "category_id": "string"
}
```

**Success Response Body (Action):**
```json
{
  "label_tx_id": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Label/discardUnstagedToTrash

**Description:** Stages a transaction to be moved to the built-in Trash category.

**Requirements:**
- no committed label exists for `tx_id`; no stagedLabel with ID tx_id.

**Effects:**
- creates a StagedLabel for this user and transaction, assigning it to the built-in **Trash** category.

**Request Body:**
```json
{
  "user_id": "string",
  "tx_id": "string",
  "tx_name": "string",
  "tx_merchant": "string"
}
```

**Success Response Body (Action):**
```json
{
  "label_tx_id": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Label/finalize

**Description:** Commits all of a user's currently staged labels, making them permanent.

**Requirements:**
- for each StagedLabel belonging to the user: no committed label exists for `tx_id`

**Effects:**
- for each StagedLabel belonging to the user
  - creates a TransactionInfo
  - creates a new Label linking `tx_id` to `category_id` and `user_id`;
  - adds TransactionInfo to CategoryHistory under the chosen category;
  - after processing all staged labels, wipes stagedLabels

**Request Body:**
```json
{
  "user_id": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Label/cancelSession

**Description:** Deletes all of a user's staged labels without committing them.

**Requirements:**
- true (a user may cancel a pending session at any time)

**Effects:**
- deletes all StagedLabels for that user;
- no modifications to Labels or CategoryHistory

**Request Body:**
```json
{
  "user_id": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Label/update

**Description:** Changes the category of an already-labeled transaction.

**Requirements:**
- a label for `tx_id` exists; `transaction.owner_id = user_id`;
- `new_category_id` exists and `owner_id = user_id`;
- TransactionInfo exists with `transactionInfo.id = tx_id`

**Effects:**
- updates CategoryHistory, associating TransactionInfo with the new category;
- replaces the label’s `category_id` with `new_category_id`;
- updates `created_at` to now; returns updated label

**Request Body:**
```json
{
  "user_id": "string",
  "tx_id": "string",
  "new_category_id": "string"
}
```

**Success Response Body (Action):**
```json
{
  "label_tx_id": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Label/removeCommittedLabel

**Description:** Moves a labeled transaction to the built-in Trash category.

**Requirements:**
- a label for `tx_id` exists; `transaction.owner_id = user_id`

**Effects:**
- reassigns the transaction’s label to the user’s built-in **Trash** category;
- updates CategoryHistory, associating the transaction with the trash category

**Request Body:**
```json
{
  "user_id": "string",
  "tx_id": "string"
}
```

**Success Response Body (Action):**
```json
{
  "label_tx_id": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Label/suggest

**Description:** Provides an AI-powered suggestion for categorizing a transaction.

**Requirements:**
- user has ≥ 1 category

**Effects:**
- returns a best-guess category_id from the user’s existing categories for this `tx_id`, highlighted in the UI;
- suggested by AI and does **not** alter Labels state

**Request Body:**
```json
{
  "user_id": "string",
  "allCategories": [
    ["categoryName", "categoryId"],
    ["categoryName", "categoryId"]
    ...
  ],
  "txInfo": {
    "tx_id": "string",
    "tx_name": "string",
    "tx_merchant": "string"
  }
}
```

**Success Response Body (Action):**
```json
{
  "id": "ID",
  "name": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Label/getLabel

**Description:** Retrieves a single committed label for a specific user and transaction.

**Requirements:**
- A committed label must exist for the given `user_id` and `tx_id`.

**Effects:**
- Returns an array containing the full label document if found.

**Request Body:**
```json
{
  "user_id": "string",
  "tx_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "user_id": "ID",
    "tx_id": "ID",
    "category_id": "ID",
    "created_at": "Date"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Label/getCategoryHistory

**Description:** Retrieves the spending history (all transaction IDs) for a category.

**Requirements:**
- The `user_id` and `category_id` must exist.

**Effects:**
- Returns an array of objects, each containing a `tx_id` associated with the specified category.

**Request Body:**
```json
{
  "user_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "tx_id": "ID"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Label/get_category_tx

**Description:** Retrieves all transaction IDs associated with a specific category for a user.

**Requirements:**
- The `user_id` and `category_id` must exist.

**Effects:**
- Returns an array of objects, each containing a `tx_id` associated with the specified category.

**Request Body:**
```json
{
  "user_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "tx_id": "ID"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Label/get_tx_in_trash

**Description:** Retrieves all transaction IDs that have been moved to the trash for a user.

**Requirements:**
- The `user_id` must exist.

**Effects:**
- Returns an array of objects, each containing a `tx_id` associated with the built-in Trash category.

**Request Body:**
```json
{
  "user_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "tx_id": "ID"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Label/getStagedLabels

**Description:** Retrieves all currently staged (uncommitted) labels for a user.

**Requirements:**
- The `user_id` must exist.

**Effects:**
- Returns an array containing all staged label documents for the user.

**Request Body:**
```json
{
  "user_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "user_id": "ID",
    "category_id": "ID",
    "tx_id": "ID",
    "tx_name": "string",
    "tx_merchant": "string",
    "staged_at": "Date"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Label/all

**Description:** Retrieves all labels for a user.

**Requirements:**
- The `user_id` must exist.

**Effects:**
- Returns an array of all label documents for the user.

**Request Body:**
```json
{
  "user_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "user_id": "ID",
    "tx_id": "ID",
    "category_id": "ID",
    "created_at": "Date"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Label/hasAnyLabelsForCategory

**Description:** Checks if a category is referenced by any of a user's labels.

**Requirements:**
- The `user_id` and `category_id` must exist.

**Effects:**
- Returns a boolean indicating if any transactions are labeled with the specified category.

**Request Body:**
```json
{
  "user_id": "string",
  "category_id": "string"
}
```

**Success Response Body (Action):**
```json
{
  "result": "boolean"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
# API Specification: Transaction Concept

**Purpose:** represent each imported bank record that a user will label

---

## API Endpoints

### POST /api/Transaction/import_transactions

**Description:** Imports new transactions for a user from a CSV file content.

**Requirements:**
- owner exists; file id is valid

**Effects:**
- parses the files and converts rows into Transactions owned by owner_id with status UNLABELED; generates new tx_ids for each transaction; adds them to state; returns the created list

**Request Body:**
```json
{
  "owner_id": "string",
  "fileContent": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Transaction/mark_labeled

**Description:** Marks an unlabeled transaction as labeled.

**Requirements:**
- transaction tx_id exists; requester_id = transaction.owner_id

**Effects:**
- sets transaction.status to LABELED

**Request Body:**
```json
{
  "tx_id": "string",
  "requester_id": "string"
}
```

**Success Response Body (Action):**
```json
{
  "tx_id": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Transaction/getTransaction

**Description:** Retrieves a single transaction document by its ID.

**Requirements:**
- A transaction with the given `tx_id` must exist and belong to the specified `owner_id`.

**Effects:**
- Returns an array containing the full transaction document if found.

**Request Body:**
```json
{
  "owner_id": "string",
  "tx_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "tx_id": "ID",
    "owner_id": "ID",
    "date": "Date",
    "merchant_text": "string",
    "amount": "Number",
    "status": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Transaction/get_labeled_transactions

**Description:** Retrieves all of a user's transactions that have the status `LABELED`.

**Requirements:**
- The `owner_id` must correspond to an existing user.

**Effects:**
- Returns an array of transaction documents with a status of `LABELED`.

**Request Body:**
```json
{
  "owner_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "tx_id": "ID",
    "owner_id": "ID",
    "date": "Date",
    "merchant_text": "string",
    "amount": "Number",
    "status": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Transaction/get_unlabeled_transactions

**Description:** Retrieves all of a user's transactions that have the status `UNLABELED`.

**Requirements:**
- The `owner_id` must correspond to an existing user.

**Effects:**
- Returns an array of transaction documents with a status of `UNLABELED`.

**Request Body:**
```json
{
  "owner_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "tx_id": "ID",
    "owner_id": "ID",
    "date": "Date",
    "merchant_text": "string",
    "amount": "Number",
    "status": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Transaction/getTxInfo

**Description:** Retrieves the parsed information (date, merchant, amount) for a single transaction.

**Requirements:**
- A transaction with the given `tx_id` must exist and belong to the specified `owner_id`.

**Effects:**
- Returns an array containing an object with the core details of the transaction.

**Request Body:**
```json
{
  "owner_id": "string",
  "tx_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "date": "Date",
    "merchant_text": "string",
    "amount": "Number"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/Transaction/list_all

**Description:** Retrieves all transactions for a user.

**Requirements:**
- The `owner_id` must correspond to an existing user.

**Effects:**
- Returns an array of all transaction documents for the user.

**Request Body:**
```json
{
  "owner_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "tx_id": "ID",
    "owner_id": "ID",
    "date": "Date",
    "merchant_text": "string",
    "amount": "Number",
    "status": "string"
  }
]
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

# API Specification: UserAuthentication Concept

**Purpose:** To verify the identity of a user, enabling secure access to the system by managing user registration and login credentials.

---

## API Endpoints

### POST /api/UserAuthentication/register

**Description:** Creates a new user account with a unique username and a password.

**Requirements:**
- The provided `username` must not already be in use by an existing user.
- The `password` must meet the system's complexity requirements (e.g., minimum length).

**Effects:**
- A new `User` entity is created and stored.
- The user's `username` is set to the provided `username`.
- The user's password is securely hashed and stored.
- Returns the unique ID of the newly created `user`.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAuthentication/login

**Description:** Authenticates a user using their username and password.

**Requirements:**
- A user with the given `username` must exist.
- The provided `password` must correctly match the stored password for that user.

**Effects:**
- If authentication is successful, returns the unique ID of the authenticated `user`.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---
### POST /api/UserAuthentication/changePassword

**Description:** Updates the password for a specified user.

**Requirements:**
- The `user` identified by the `user` ID must exist.
- The `oldPassword` must match the user's current password.
- The `newPassword` must meet system complexity requirements.

**Effects:**
- The user's stored password hash is updated to a new hash derived from the `newPassword`.
- Returns an empty object on success.

**Request Body:**
```json
{
  "user": "ID",
  "oldPassword": "string",
  "newPassword": "string"
}
```

**Success Response Body (Action):**
```json
{}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

# response:

# API Specification: FileUploading Concept

**Purpose:** manage user-uploaded files, including storage, retrieval, and deletion

---

## API Endpoints

### POST /api/FileUploading/uploadFile

**Description:** Creates a new file record with the provided content and metadata.

**Requirements:**
- `owner` exists
- `name` is a non-empty string

**Effects:**
- Creates a new File `f`.
- Sets its owner to `owner`, name to `name`, and content to `content`.
- Records the creation timestamp.
- Returns the new File ID as `file`.

**Request Body:**
```json
{
  "owner": "User",
  "name": "string",
  "content": "string"
}
```

**Success Response Body (Action):**
```json
{
  "file": "File"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
# API Endpoint: User Login

**Purpose:** authenticate a user and create a session

---

### POST /login

**Description:** Verifies user credentials and, on success, creates a session for the user.

**Requirements:**
- `username` and `password` must be provided
- the `username` must exist and the `password` must match the stored credentials

**Effects:**
- when credentials are valid, a new session is created and associated with the user
- returns the created `session` identifier to the requester

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "session": "ID"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```

---
# API Endpoint: Session Logout

**Purpose:** terminate a user's active session

---

### POST /logout

**Description:** Deletes (invalidates) an active session — logs the user out.

**Requirements:**
- a valid `session` identifier is provided and corresponds to an active session
- the session maps to an existing `user`

**Effects:**
- deletes the session from session storage (invalidates the session)
- returns a `logged_out` status to the requester

**Request Body:**
```json
{
  "session": "ID"
}
```

**Success Response Body (Action):**
```json
{
  "status": "logged_out"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```