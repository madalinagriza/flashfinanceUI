export const normalizeId = (value: unknown): string | null => {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const candidates: unknown[] = [
      obj.$oid,
      obj.id,
      obj._id,
      obj.value,
      obj.tx_id,
      obj.txId,
      obj.category_id,
      obj.categoryId,
      obj.user_id,
      obj.userId,
      obj.owner_id,
      obj.ownerId,
    ]

    for (const option of candidates) {
      if (option == null) continue
      if (typeof option === 'string' && option.trim()) return option
      if (typeof option === 'number' || typeof option === 'bigint') return String(option)
    }
  }

  try {
    return String(value)
  } catch {
    return null
  }
}

export const normalizeString = (value: unknown): string | null => {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'bigint') return String(value)
  if (Array.isArray(value)) {
    for (const option of value) {
      const normalized = normalizeString(option)
      if (normalized) return normalized
    }
    return null
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const candidates: unknown[] = [obj.name, obj.label, obj.value]
    for (const option of candidates) {
      if (typeof option === 'string' && option.trim()) return option
    }
  }
  try {
    return String(value)
  } catch {
    return null
  }
}
