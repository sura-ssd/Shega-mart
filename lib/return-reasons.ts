export const RETURN_REASONS = [
  { value: "damaged", label: "Product Damaged or Defective" },
  { value: "not_as_described", label: "Not as Described" },
  { value: "wrong_item", label: "Wrong Item Received" },
  { value: "size_fit", label: "Size/Fit Issue" },
  { value: "quality", label: "Poor Quality" },
  { value: "changed_mind", label: "Changed Mind" },
  { value: "other", label: "Other" },
]

export const RETURN_POLICIES = {
  damaged: {
    days: 14,
    description: "Free return for damaged or defective products",
  },
  not_as_described: {
    days: 7,
    description: "Free return if product doesn't match description",
  },
  wrong_item: {
    days: 14,
    description: "Free return for wrong items sent",
  },
  size_fit: {
    days: 7,
    description: "Return within 7 days with tags attached",
  },
  quality: {
    days: 3,
    description: "Return within 3 days of delivery",
  },
  changed_mind: {
    days: 1,
    description: "Return within 1 day for change of mind (item must be unused)",
  },
  other: {
    days: 7,
    description: "Contact support for assistance",
  },
}
