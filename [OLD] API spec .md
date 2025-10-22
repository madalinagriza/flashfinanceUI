API Specification: Category Concept

**Purpose:** allow users to define and manage meaningful groupings of their transactions

---

## API Endpoints

### POST /api/Category/create

**Description:** Creates a new category for a given user with a specified name.

**Requirements:**
- user owner_id exists
- for the same owner_id, no existing category with same name

**Effects:**
- generated a new category_id
- creates and stores a category under owner_id associated with name
- returns it

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
  "category_id": "string"
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

**Description:** Renames an existing category for a given user.

**Requirements:**
- category exists and category.owner_id = owner_id
- for the same owner_id, no existing category with same new_name

**Effects:**
- updates category.name to new_name
- returns updated category

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
  "category_id": "string"
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

**Description:** Deletes a category and its associated metrics, provided it's safe to delete.

**Requirements:**
- category exists and category.owner_id = owner_id
- can_delete = true (only called by the sync which gets result from label's)

**Effects:**
- removes the category (and its CategoryMetrics) and returns true
- otherwise leaves state unchanged and returns false

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

### POST /api/Category/setMetricTotal

**Description:** Creates or updates a category metric's total for a specific period.

**Requirements:**
- owner and category exist
- total ≥ 0

**Effects:**
- creates or updates the metric for (owner, category, period) with current_total = total

**Request Body:**
```json
{
  "owner_id": "string",
  "category_id": "string",
  "period": "string (ISO Date__ISO Date)",
  "total": "number"
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

### POST /api/Category/getCategoryNamesAndOwners

**Description:** Retrieves a list of all category names and their owners.

**Requirements:**
- true (implicitly)

**Effects:**
- returns list of all category names and their owners

**Request Body:**
```json
{}
```

**Success Response Body (Query):**
```json
[
  {
    "name": "string",
    "owner_id": "string"
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

### POST /api/Category/getMetric

**Description:** Retrieves a specific category metric document for a given owner, category, and period.

**Requirements:**
- true (implicitly)

**Effects:**
- Retrieves a specific CategoryMetric document.

**Request Body:**
```json
{
  "owner_id": "string",
  "category_id": "string",
  "period": "string (ISO Date__ISO Date)"
}
```

**Success Response Body (Query):**
```json
[
  {
    "owner_id": "string",
    "category_id": "string",
    "period_start": "string (ISO Date)",
    "period_end": "string (ISO Date)",
    "current_total": "number"
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

### POST /api/Category/listMetrics

**Description:** Lists all category metrics for a given owner and category, sorted by period start date.

**Requirements:**
- true (implicitly)

**Effects:**
- Lists all CategoryMetrics for a given owner and category, sorted by period_start ascending.

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
    "owner_id": "string",
    "category_id": "string",
    "period_start": "string (ISO Date)",
    "period_end": "string (ISO Date)",
    "current_total": "number"
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

**Description:** Creates a StagedLabel for a user and transaction, preparing it for finalization.

**Requirements:**
- no committed label exists for `tx_id`
- no stagedLabel with ID tx_id.

**Effects:**
- creates a StagedLabel for this user and transaction with the provided info and category.
- Adds it to the stagedLabels (that are not yet commited).
- Returns the created stagedLabel.

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
  "label_tx_id": "string"
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

**Description:** Commits all staged labels for a user, turning them into permanent labels and history records.

**Requirements:**
- for each StagedLabel belonging to the user: no committed label exists for `tx_id`

**Effects:**
- for each StagedLabel belonging to the user:
  - creates a TransactionInfo
  - creates a new Label linking `tx_id` to `category_id` and `user_id`
  - adds TransactionInfo to CategoryHistory under the chosen category
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

### POST /api/Label/cancel

**Description:** Deletes all staged labels for a user without committing them.

**Requirements:**
- true (a user may cancel a pending session at any time)

**Effects:**
- deletes all StagedLabels for that user
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

**Description:** Changes the category of an existing label for a specific transaction.

**Requirements:**
- a label for `tx_id` exists
- `transaction.owner_id = user_id`
- `new_category_id` exists and `owner_id = user_id`
- TransactionInfo exists with `transactionInfo.id = tx_id`

**Effects:**
- updates CategoryHistory, associating TransactionInfo with the new category
- replaces the label’s `category_id` with `new_category_id`
- updates `created_at` to now
- returns updated label

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
  "label_tx_id": "string"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/Label/remove

**Description:** Reassigns a transaction's label to the user's built-in Trash category.

**Requirements:**
- a label for `tx_id` exists
- `transaction.owner_id = user_id`

**Effects:**
- reassigns the transaction’s label to the user’s built-in **Trash** category
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
  "label_tx_id": "string"
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

**Description:** Returns the label document for the given user and transaction.

**Requirements:**
- true (implicitly)

**Effects:**
- Returns the label document for the given user and transaction.

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
    "user_id": "string",
    "tx_id": "string",
    "category_id": "string",
    "created_at": "string (ISO Date)"
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

### POST /api/Label/getTxInfo

**Description:** Returns the transaction info document for the given user and transaction.

**Requirements:**
- true (implicitly)

**Effects:**
- Returns the transaction info document for the given user and transaction.

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
    "tx_name": "string",
    "tx_merchant": "string"
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

**Description:** Returns a list of transaction IDs associated with a specific category for a user.

**Requirements:**
- true (implicitly)

**Effects:**
- Returns a list of transaction IDs associated with a specific category for a user.

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
  "string"
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

**Description:** Returns all label documents.

**Requirements:**
- true (implicitly)

**Effects:**
- Returns all label documents.

**Request Body:**
```json
{}
```

**Success Response Body (Query):**
```json
[
  {
    "_id": "string",
    "user_id": "string",
    "tx_id": "string",
    "category_id": "string",
    "created_at": "string (ISO Date)"
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

**Description:** Returns true if any labels exist for the given user and category, false otherwise.

**Requirements:**
- true (implicitly)

**Effects:**
- Returns true if any labels exist for the given user and category, false otherwise.

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
    "has_labels": "boolean"
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

# API Specification: Transaction Concept

**Purpose:** represent each imported bank record that a user will label

---

## API Endpoints

### POST /api/Transaction/import_transactions

**Description:** Parses a CSV file and converts its rows into new, unlabeled transactions owned by a user.

**Requirements:**
- owner exists
- file id is valid

**Effects:**
- parses the files and converts rows into Transactions owned by owner_id with status UNLABELED
- generates new tx_ids for each transaction
- adds them to state
- returns the created list

**Request Body:**
```json
{
  "owner_id": "string",
  "fileContent": "string"
}
```

**Success Response Body (Action):**
```json
[
  {
    "tx_id": "string",
    "owner_id": "string",
    "date": "string (ISO Date)",
    "merchant_text": "string",
    "amount": "number",
    "status": "string (UNLABELED|LABELED)"
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

### POST /api/Transaction/mark_labeled

**Description:** Sets a transaction's status to LABELED after verifying ownership.

**Requirements:**
- transaction tx_id exists
- requester_id = transaction.owner_id

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
  "tx_id": "string"
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
- true (implicitly)

**Effects:**
- Retrieves a single transaction document by its ID.

**Request Body:**
```json
{
  "tx_id": "string"
}
```

**Success Response Body (Query):**
```json
[
  {
    "tx_id": "string",
    "owner_id": "string",
    "date": "string (ISO Date)",
    "merchant_text": "string",
    "amount": "number",
    "status": "string (UNLABELED|LABELED)"
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

**Description:** Returns all transaction documents in the system.

**Requirements:**
- true (implicitly)

**Effects:**
- Returns all transaction documents.

**Request Body:**
```json
{}
```

**Success Response Body (Query):**
```json
[
  {
    "tx_id": "string",
    "owner_id": "string",
    "date": "string (ISO Date)",
    "merchant_text": "string",
    "amount": "number",
    "status": "string (UNLABELED|LABELED)"
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

# API Specification: User Concept

**Purpose:** establish a unique identity for each person and control access to app functionality so that data is isolated per account

---

## API Endpoints

### POST /api/User/register

**Description:** Registers a new user with a unique email, name, and password.

**Requirements:**
- email is not used by any existing user

**Effects:**
- creates a new user with a fresh user_id, password_hash derived from password, status ACTIVE
- adds the user to Users
- returns the created user

**Request Body:**
```json
{
  "email": "string",
  "name": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user_id": "string",
  "email": "string",
  "name": "string",
  "status": "string (ACTIVE|INACTIVE)"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/User/authenticate

**Description:** Authenticates a user with their email and password.

**Requirements:**
- there exists a user with the given email whose password_hash matches password and whose status is ACTIVE

**Effects:**
- returns that user

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Success Response Body (Action):**
```json
{
  "user_id": "string",
  "email": "string",
  "name": "string",
  "status": "string (ACTIVE|INACTIVE)"
}
```

**Error Response Body:**
```json
{
  "error": "string"
}
```
---

### POST /api/User/deactivate

**Description:** Sets a user's account status to INACTIVE.

**Requirements:**
- a user with user_id exists

**Effects:**
- sets the user's status to INACTIVE

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

### POST /api/User/changePassword

**Description:** Changes a user's password after verifying the old password.

**Requirements:**
- a user with user_id exists and old_password matches the stored password_hash

**Effects:**
- updates password_hash with new_password
- returns true

**Request Body:**
```json
{
  "user_id": "string",
  "old_password": "string",
  "new_password": "string"
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

### POST /api/User/reactivate

**Description:** Reactivates an inactive user account and updates their password.

**Requirements:**
- a user with the given email exists and `status = INACTIVE`

**Effects:**
- sets the user’s `status` to ACTIVE
- updates the user’s `password_hash` with the hash of `new_password`
- returns true

**Request Body:**
```json
{
  "email": "string",
  "new_password": "string"
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

### POST /api/User/all

**Description:** Returns all user documents in the system.

**Requirements:**
- true (implicitly)

**Effects:**
- Returns all user documents.

**Request Body:**
```json
{}
```

**Success Response Body (Query):**
```json
[
  {
    "user_id": "string",
    "email": "string",
    "name": "string",
    "status": "string (ACTIVE|INACTIVE)"
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