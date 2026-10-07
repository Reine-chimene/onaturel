import { statusTone } from "@/lib/status";
import type { FulfillmentMode, OrderStatus, PaymentStatus, StockStatus } from "@/lib/status";
import {
  fulfillmentLabels,
  orderLabels,
  paymentLabels,
  stockLabels,
} from "@/lib/status";

type Props =
  | { kind: "stock"; value: StockStatus }
  | { kind: "order"; value: OrderStatus }
  | { kind: "payment"; value: PaymentStatus }
  | { kind: "fulfillment"; value: FulfillmentMode }
  | { kind: "tag"; value: "NEW" | "PROMO"; label?: string };

function labelOf(props: Props): string {
  if (props.kind === "stock") return stockLabels[props.value];
  if (props.kind === "order") return orderLabels[props.value];
  if (props.kind === "payment") return paymentLabels[props.value];
  if (props.kind === "fulfillment") return fulfillmentLabels[props.value];
  if (props.value === "NEW") return props.label ?? "Nouveau";
  return props.label ?? "Promotion";
}

export function StatusBadge(props: Props) {
  const tone = statusTone(props.kind, props.value);
  return <span className={`on-badge on-badge--${tone}`}>{labelOf(props)}</span>;
}

export function PromotionBadge({ percent }: { percent: number }) {
  return (
    <StatusBadge kind="tag" value="PROMO" label={`-${percent}\u00A0%`} />
  );
}
