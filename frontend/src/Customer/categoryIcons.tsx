import { IconCart, IconClock, IconDocument, IconPackage, IconPin } from "./icons";

// Category -> icon lookup, shared across the Post a Task form and task cards.
export const categoryIcons: Record<string, typeof IconPackage> = {
  Delivery: IconPackage,
  Document: IconDocument,
  Queuing: IconClock,
  Shopping: IconCart,
  Errand: IconPin,
};
